from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
import os
import stripe
from datetime import datetime

from app.auth import AuthorizedUser
from app.db.supabase import get_supabase_client
from app.models.game import ShopItem, PurchaseRequest, InventoryItem, PurchaseType, StatUpdate, StatType

router = APIRouter(prefix="/shop", tags=["shop"])

# Initialize Stripe
stripe.api_key = os.environ.get("STRIPE_API_KEY", "")

# A proper webhook secret for handling Stripe webhooks
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

@router.get("")
async def get_shop_items(
    category: Optional[str] = None,
    user: AuthorizedUser = Depends()
):
    """
    Get all items available in the shop, optionally filtered by category.
    """
    supabase = get_supabase_client()
    
    query = supabase.table("shop_items").select("*")
    
    if category:
        query = query.eq("category", category)
    
    response = query.execute()
    
    return [ShopItem(**item) for item in response.data]

@router.get("/inventory")
async def get_inventory(user: AuthorizedUser = Depends()):
    """
    Get the user's inventory of purchased items.
    """
    supabase = get_supabase_client()
    
    # Get user's inventory
    inventory_response = supabase.table("user_inventory") \
        .select("*") \
        .eq("user_id", user.sub) \
        .execute()
    
    # Get all shop items for reference
    items_response = supabase.table("shop_items").select("*").execute()
    items_by_id = {item["id"]: item for item in items_response.data}
    
    inventory = []
    for inv_item in inventory_response.data:
        item_id = inv_item["item_id"]
        if item_id in items_by_id:
            shop_item = items_by_id[item_id]
            inventory.append({
                **InventoryItem(
                    item_id=item_id,
                    quantity=inv_item["quantity"],
                    purchased_at=inv_item["purchased_at"]
                ).dict(),
                "item_details": shop_item
            })
    
    return inventory

@router.post("/purchase")
async def purchase_item(purchase: PurchaseRequest, user: AuthorizedUser = Depends()):
    """
    Purchase an item from the shop.
    """
    supabase = get_supabase_client()
    
    # Get the item details
    item_response = supabase.table("shop_items") \
        .select("*") \
        .eq("id", purchase.item_id) \
        .execute()
    
    if not item_response.data:
        raise HTTPException(status_code=404, detail=f"Item with ID {purchase.item_id} not found")
    
    item = item_response.data[0]
    shop_item = ShopItem(**item)
    
    # Calculate total cost
    total_cost = shop_item.price * purchase.quantity
    
    # Handle purchase based on purchase type
    if shop_item.purchase_type == PurchaseType.IN_GAME:
        # Get user's current money
        stats_response = supabase.table("user_stats") \
            .select("money") \
            .eq("user_id", user.sub) \
            .execute()
        
        if not stats_response.data:
            raise HTTPException(status_code=404, detail="User stats not found")
        
        current_money = stats_response.data[0]["money"]
        
        # Check if user has enough money
        if current_money < total_cost:
            raise HTTPException(status_code=400, detail="Not enough money")
        
        # Update user's money
        supabase.table("user_stats") \
            .update({"money": current_money - total_cost}) \
            .eq("user_id", user.sub) \
            .execute()
        
        # Record the stat change
        supabase.table("stat_history").insert({
            "user_id": user.sub,
            "stat_type": "money",
            "previous_value": current_money,
            "new_value": current_money - total_cost,
            "change": -total_cost,
            "reason": f"Purchased {purchase.quantity}x {shop_item.name}"
        }).execute()
        
        # Add item to user's inventory and complete purchase
        add_to_inventory(supabase, user.sub, purchase.item_id, purchase.quantity, shop_item)
        
        return {"message": "Purchase successful"}
        
    elif shop_item.purchase_type == PurchaseType.REAL_MONEY:
        # For real money purchases using Stripe
        if not stripe.api_key:
            raise HTTPException(status_code=500, detail="Stripe API key not configured")
        
        # Check if we have a payment_method_id from the request
        if hasattr(purchase, 'payment_method_id') and purchase.payment_method_id:
            try:
                # Create a payment intent with the payment method
                payment_intent = stripe.PaymentIntent.create(
                    amount=total_cost,  # Amount in cents
                    currency="usd",
                    payment_method=purchase.payment_method_id,
                    confirm=True,  # Confirm the payment immediately
                    return_url="https://YOUR_DOMAIN/shop",  # URL to redirect after payment
                    metadata={
                        "user_id": user.sub,
                        "item_id": purchase.item_id,
                        "quantity": purchase.quantity,
                        "item_name": shop_item.name
                    }
                )
                
                # If payment is successful, add item to inventory
                if payment_intent.status == "succeeded":
                    # Add item to user's inventory
                    add_to_inventory(supabase, user.sub, purchase.item_id, purchase.quantity, shop_item)
                    
                    # Record the transaction
                    supabase.table("purchase_history").insert({
                        "user_id": user.sub,
                        "item_id": purchase.item_id,
                        "quantity": purchase.quantity,
                        "total_cost": total_cost,
                        "purchase_type": shop_item.purchase_type,
                        "payment_id": payment_intent.id,
                        "purchased_at": datetime.now().isoformat()
                    }).execute()
                    
                    return {
                        "message": "Payment successful",
                        "payment_intent_id": payment_intent.id,
                        "status": payment_intent.status
                    }
                
                # If payment needs additional actions (like 3D Secure)
                elif payment_intent.status == "requires_action":
                    return {
                        "message": "Additional authentication required",
                        "payment_intent_id": payment_intent.id,
                        "client_secret": payment_intent.client_secret,
                        "status": payment_intent.status
                    }
                
                # Other payment statuses
                else:
                    return {
                        "message": "Payment processing",
                        "payment_intent_id": payment_intent.id,
                        "status": payment_intent.status
                    }
                    
            except stripe.error.CardError as e:
                # Card declined
                raise HTTPException(status_code=400, detail=f"Card error: {e.user_message}")
            except stripe.error.StripeError as e:
                # Other Stripe errors
                raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")
            except Exception as e:
                # Generic error
                raise HTTPException(status_code=500, detail=f"Payment processing error: {str(e)}")
        else:
            # If no payment method is provided, create a Checkout Session instead
            try:
                # Get domain URL from request headers or use a default
                host = request.headers.get("host", "localhost:3000")
                protocol = "https" if request.headers.get("x-forwarded-proto") == "https" else "http"
                base_url = f"{protocol}://{host}"
                
                checkout_session = stripe.checkout.Session.create(
                    payment_method_types=["card"],
                    line_items=[{
                        "price_data": {
                            "currency": "usd",
                            "product_data": {
                                "name": shop_item.name,
                                "description": shop_item.description,
                                "images": [shop_item.image_url] if shop_item.image_url else [],
                            },
                            "unit_amount": shop_item.price,  # Price in cents
                        },
                        "quantity": purchase.quantity,
                    }],
                    mode="payment",
                    success_url=f"{base_url}/shop?success=true",
                    cancel_url=f"{base_url}/shop?cancelled=true",
                    metadata={
                        "user_id": user.sub,
                        "item_id": purchase.item_id,
                        "quantity": purchase.quantity
                    }
                )
                
                return {
                    "checkout_url": checkout_session.url,
                    "session_id": checkout_session.id
                }
                
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error creating checkout session: {str(e)}")
    
    # Shouldn't reach here
    raise HTTPException(status_code=400, detail="Invalid purchase type")

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhooks for payment confirmations.
    """
    # Get the webhook signature sent by Stripe
    signature = request.headers.get("stripe-signature")
    if not signature or not STRIPE_WEBHOOK_SECRET:
        print("Error: Missing Stripe signature or webhook secret")
        # Return 200 to avoid Stripe retries, but log the error
        return {"status": "success", "message": "Webhook secret not configured"}
    
    # Get the request body
    payload = await request.body()
    
    try:
        # Verify the event with Stripe
        event = stripe.Webhook.construct_event(
            payload, signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        # Invalid payload
        print("Error: Invalid webhook payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        print("Error: Invalid webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event based on its type
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        
        # Extract metadata
        user_id = session.get("metadata", {}).get("user_id")
        item_id = session.get("metadata", {}).get("item_id")
        quantity = int(session.get("metadata", {}).get("quantity", 1))
        
        if not user_id or not item_id:
            # Log error but return success to Stripe
            print(f"Error: Missing user_id or item_id in webhook metadata: {session}")
            return {"status": "success", "message": "Missing metadata"}
        
        # Process the purchase
        supabase = get_supabase_client()
        
        # Get item details
        item_response = supabase.table("shop_items") \
            .select("*") \
            .eq("id", item_id) \
            .execute()
        
        if not item_response.data:
            print(f"Error: Item with ID {item_id} not found")
            return {"status": "success", "message": "Item not found"}
        
        shop_item = ShopItem(**item_response.data[0])
        
        # Add to inventory
        add_to_inventory(supabase, user_id, item_id, quantity, shop_item)
        
        # Record the transaction
        supabase.table("purchase_history").insert({
            "user_id": user_id,
            "item_id": item_id,
            "quantity": quantity,
            "total_cost": session.get("amount_total"),
            "purchase_type": "real_money",
            "payment_id": session.get("id"),
            "purchased_at": datetime.now().isoformat()
        }).execute()
        
        print(f"Successfully processed checkout.session.completed for user {user_id}, item {item_id}")
        
    elif event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        
        # Extract metadata
        user_id = payment_intent.get("metadata", {}).get("user_id")
        item_id = payment_intent.get("metadata", {}).get("item_id")
        quantity = int(payment_intent.get("metadata", {}).get("quantity", 1))
        
        if not user_id or not item_id:
            # Log error but return success to Stripe
            print(f"Error: Missing user_id or item_id in webhook metadata: {payment_intent}")
            return {"status": "success", "message": "Missing metadata"}
        
        # Process the purchase
        supabase = get_supabase_client()
        
        # Get item details
        item_response = supabase.table("shop_items") \
            .select("*") \
            .eq("id", item_id) \
            .execute()
        
        if not item_response.data:
            print(f"Error: Item with ID {item_id} not found")
            return {"status": "success", "message": "Item not found"}
        
        shop_item = ShopItem(**item_response.data[0])
        
        # Check if this payment_intent has already been processed
        history_response = supabase.table("purchase_history") \
            .select("id") \
            .eq("payment_id", payment_intent.get("id")) \
            .execute()
        
        if history_response.data:
            # Already processed, avoid double-crediting
            print(f"Payment already processed: {payment_intent.get('id')}")
            return {"status": "success", "message": "Already processed"}
        
        # Add to inventory
        add_to_inventory(supabase, user_id, item_id, quantity, shop_item)
        
        # Record the transaction
        supabase.table("purchase_history").insert({
            "user_id": user_id,
            "item_id": item_id,
            "quantity": quantity,
            "total_cost": payment_intent.get("amount"),
            "purchase_type": "real_money",
            "payment_id": payment_intent.get("id"),
            "purchased_at": datetime.now().isoformat()
        }).execute()
        
        print(f"Successfully processed payment_intent.succeeded for user {user_id}, item {item_id}")
    
    # Return a success response to acknowledge receipt of the event
    return {"status": "success"}

@router.post("/ingame")
async def in_game_purchase(purchase: PurchaseRequest, user: AuthorizedUser = Depends()):
    """
    Simplified endpoint for in-game purchases only.
    """
    supabase = get_supabase_client()
    
    # Get the item details
    item_response = supabase.table("shop_items") \
        .select("*") \
        .eq("id", purchase.item_id) \
        .execute()
    
    if not item_response.data:
        raise HTTPException(status_code=404, detail=f"Item with ID {purchase.item_id} not found")
    
    item = item_response.data[0]
    shop_item = ShopItem(**item)
    
    # Ensure this is an in-game currency item
    if shop_item.purchase_type != PurchaseType.IN_GAME:
        raise HTTPException(status_code=400, detail="This endpoint is for in-game purchases only")
    
    # Calculate total cost
    total_cost = shop_item.price * purchase.quantity
    
    # Get user's current money
    stats_response = supabase.table("user_stats") \
        .select("money") \
        .eq("user_id", user.sub) \
        .execute()
    
    if not stats_response.data:
        raise HTTPException(status_code=404, detail="User stats not found")
    
    current_money = stats_response.data[0]["money"]
    
    # Check if user has enough money
    if current_money < total_cost:
        raise HTTPException(status_code=400, detail="Not enough money")
    
    # Update user's money
    supabase.table("user_stats") \
        .update({"money": current_money - total_cost}) \
        .eq("user_id", user.sub) \
        .execute()
    
    # Record the stat change
    supabase.table("stat_history").insert({
        "user_id": user.sub,
        "stat_type": "money",
        "previous_value": current_money,
        "new_value": current_money - total_cost,
        "change": -total_cost,
        "reason": f"Purchased {purchase.quantity}x {shop_item.name}"
    }).execute()
    
    # Add item to user's inventory and complete purchase
    add_to_inventory(supabase, user.sub, purchase.item_id, purchase.quantity, shop_item)
    
    return {"message": "Purchase successful"}

# Helper function to add items to inventory and apply effects
def add_to_inventory(supabase, user_id, item_id, quantity, shop_item):
    """Helper function to add items to user inventory and apply stat effects"""
    # Add item to user's inventory
    existing_inventory = supabase.table("user_inventory") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("item_id", item_id) \
        .execute()
    
    now = datetime.now().isoformat()
    
    if existing_inventory.data:
        # Update existing inventory entry
        current_quantity = existing_inventory.data[0]["quantity"]
        supabase.table("user_inventory") \
            .update({"quantity": current_quantity + quantity}) \
            .eq("id", existing_inventory.data[0]["id"]) \
            .execute()
    else:
        # Create new inventory entry
        supabase.table("user_inventory") \
            .insert({
                "user_id": user_id,
                "item_id": item_id,
                "quantity": quantity,
                "purchased_at": now
            }) \
            .execute()
    
    # Record purchase in transaction history
    supabase.table("purchase_history") \
        .insert({
            "user_id": user_id,
            "item_id": item_id,
            "quantity": quantity,
            "total_cost": shop_item.price * quantity,
            "purchase_type": shop_item.purchase_type,
            "purchased_at": now
        }) \
        .execute()
    
    # Apply item effects to user stats if applicable
    if shop_item.stats_effects:
        for stat_type, value in shop_item.stats_effects.items():
            # Skip if no effect
            if value == 0:
                continue
                
            # Get current stat value
            stat_response = supabase.table("user_stats") \
                .select(stat_type) \
                .eq("user_id", user_id) \
                .execute()
                
            if not stat_response.data:
                continue
                
            current_value = stat_response.data[0][stat_type]
            new_value = current_value + value
            
            # Enforce limits for certain stats (0-100)
            if stat_type in ["hunger", "stress", "tone", "health"]:
                new_value = max(0, min(100, new_value))
            
            # Update the stat
            supabase.table("user_stats") \
                .update({stat_type: new_value}) \
                .eq("user_id", user_id) \
                .execute()
            
            # Record stat change
            supabase.table("stat_history").insert({
                "user_id": user_id,
                "stat_type": stat_type,
                "previous_value": current_value,
                "new_value": new_value,
                "change": value,
                "reason": f"Effect from {shop_item.name}"
            }).execute()

@router.post("/use/{item_id}")
async def use_item(
    item_id: str,
    user: AuthorizedUser = Depends()
):
    """
    Use an item from the user's inventory.
    """
    supabase = get_supabase_client()
    
    # Check if user has the item in inventory
    inventory_response = supabase.table("user_inventory") \
        .select("*") \
        .eq("user_id", user.sub) \
        .eq("item_id", item_id) \
        .execute()
    
    if not inventory_response.data or inventory_response.data[0]["quantity"] < 1:
        raise HTTPException(status_code=404, detail="Item not found in inventory or quantity is zero")
    
    inventory_item = inventory_response.data[0]
    
    # Get item details
    item_response = supabase.table("shop_items") \
        .select("*") \
        .eq("id", item_id) \
        .execute()
    
    if not item_response.data:
        raise HTTPException(status_code=404, detail="Item not found in shop")
    
    shop_item = ShopItem(**item_response.data[0])
    
    # Reduce quantity in inventory
    new_quantity = inventory_item["quantity"] - 1
    
    supabase.table("user_inventory") \
        .update({"quantity": new_quantity}) \
        .eq("id", inventory_item["id"]) \
        .execute()
    
    # Apply item effects to user stats
    if shop_item.stats_effects:
        for stat_type, value in shop_item.stats_effects.items():
            # Skip if no effect
            if value == 0:
                continue
                
            # Get current stat value
            stat_response = supabase.table("user_stats") \
                .select(stat_type) \
                .eq("user_id", user.sub) \
                .execute()
                
            if not stat_response.data:
                continue
                
            current_value = stat_response.data[0][stat_type]
            new_value = current_value + value
            
            # Enforce limits for certain stats (0-100)
            if stat_type in ["hunger", "stress", "tone", "health"]:
                new_value = max(0, min(100, new_value))
            
            # Update the stat
            supabase.table("user_stats") \
                .update({stat_type: new_value}) \
                .eq("user_id", user.sub) \
                .execute()
            
            # Record stat change
            supabase.table("stat_history").insert({
                "user_id": user.sub,
                "stat_type": stat_type,
                "previous_value": current_value,
                "new_value": new_value,
                "change": value,
                "reason": f"Used item: {shop_item.name}"
            }).execute()
    
    # Record item usage
    supabase.table("item_usage_history").insert({
        "user_id": user.sub,
        "item_id": item_id,
        "used_at": datetime.now().isoformat()
    }).execute()
    
    return {
        "message": "Item used successfully",
        "effects": shop_item.stats_effects,
        "remaining_quantity": new_quantity
    } 
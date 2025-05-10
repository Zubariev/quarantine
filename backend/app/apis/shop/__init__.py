from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from typing import List, Optional, Dict, Any
import os
import stripe
import logging
from datetime import datetime

from app.auth import AuthorizedUser
from app.db.supabase import get_supabase_client
from app.models.game import ShopItem, PurchaseRequest, InventoryItem, PurchaseType, StatUpdate, StatType, UseItemRequest, SuccessResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/shop", tags=["shop"])

# Initialize Stripe
stripe.api_key = os.environ.get("STRIPE_API_KEY", "")

# A proper webhook secret for handling Stripe webhooks
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

@router.get("", response_model=List[ShopItem])
async def get_shop_items(
    category: Optional[str] = Query(None, description="Filter items by category"),
    user: AuthorizedUser = Depends()
):
    """
    Get all items available in the shop, optionally filtered by category.
    
    Returns a list of ShopItem objects.
    """
    supabase = get_supabase_client()
    
    try:
        query = supabase.table("shop_items").select("*")
        
        if category:
            query = query.eq("category", category)
        
        response = query.execute()
        
        return [ShopItem(**item) for item in response.data]
    except Exception as e:
        logger.error(f"Error retrieving shop items: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving shop items"
        )

@router.get("/inventory", response_model=List[Dict[str, Any]])
async def get_inventory(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    user: AuthorizedUser = Depends()
):
    """
    Get the user's inventory of purchased items.
    
    Returns a paginated list of inventory items with their details.
    """
    supabase = get_supabase_client()
    
    try:
        # Calculate offset for pagination
        offset = (page - 1) * page_size
        
        # Get user's inventory with pagination
        inventory_response = supabase.table("user_inventory") \
            .select("*") \
            .eq("user_id", user.sub) \
            .range(offset, offset + page_size - 1) \
            .execute()
        
        # Get all shop items for reference (this could be optimized further)
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
                        purchased_at=inv_item.get("purchased_at", datetime.now().isoformat()),
                        uses_remaining=inv_item.get("uses_remaining")
                    ).dict(),
                    "item_details": shop_item
                })
        
        return inventory
    except Exception as e:
        logger.error(f"Error retrieving inventory: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving inventory"
        )

@router.post("/purchase", response_model=Dict[str, Any])
async def purchase_item(purchase: PurchaseRequest, request: Request, user: AuthorizedUser = Depends()):
    """
    Purchase an item from the shop using real money (Stripe).
    
    For real money purchases, requires a payment_method_id or falls back to creating a checkout session.
    """
    if not purchase.item_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item ID is required"
        )
    
    if purchase.quantity < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be at least 1"
        )
    
    supabase = get_supabase_client()
    
    try:
        # Get the item details
        item_response = supabase.table("shop_items") \
            .select("*") \
            .eq("id", purchase.item_id) \
            .execute()
        
        if not item_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item with ID {purchase.item_id} not found"
            )
        
        item = item_response.data[0]
        shop_item = ShopItem(**item)
        
        # Verify this is a real-money purchase
        if shop_item.purchase_type != PurchaseType.REAL_MONEY:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This endpoint is for real-money purchases only. Use /shop/ingame for in-game currency purchases."
            )
        
        # Calculate total cost
        total_cost = shop_item.price * purchase.quantity
        
        # For real money purchases using Stripe
        if not stripe.api_key:
            logger.error("Stripe API key not configured")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Payment system not configured"
            )
        
        # Check if we have a payment_method_id from the request
        if purchase.payment_method_id:
            try:
                # Create a payment intent with the payment method
                payment_intent = stripe.PaymentIntent.create(
                    amount=total_cost,  # Amount in cents
                    currency="usd",
                    payment_method=purchase.payment_method_id,
                    confirm=True,  # Confirm the payment immediately
                    return_url=f"{request.base_url}shop",  # URL to redirect after payment
                    metadata={
                        "user_id": user.sub,
                        "item_id": purchase.item_id,
                        "quantity": purchase.quantity,
                        "item_name": shop_item.name
                    }
                )
                
                # If payment is successful, add item to inventory
                if payment_intent.status == "succeeded":
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
                logger.warning(f"Card error: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Card error: {e.user_message}"
                )
            except stripe.error.StripeError as e:
                # Other Stripe errors
                logger.error(f"Stripe error: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Payment processing error: {str(e)}"
                )
            except Exception as e:
                # Generic error
                logger.error(f"Error processing payment: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error processing payment"
                )
        else:
            # If no payment method is provided, create a Checkout Session instead
            try:
                # Get domain URL from request headers or use a default
                host = request.headers.get("host", "localhost:8000")
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
                    success_url=f"{base_url}/shop?success=true&session_id={{CHECKOUT_SESSION_ID}}",
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
                logger.error(f"Error creating checkout session: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error creating checkout session"
                )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in purchase endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing purchase request"
        )

@router.post("/ingame", response_model=SuccessResponse)
async def in_game_purchase(purchase: PurchaseRequest, user: AuthorizedUser = Depends()):
    """
    Purchase an item using in-game currency.
    
    Checks if the user has enough money and updates their inventory.
    """
    if not purchase.item_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item ID is required"
        )
    
    if purchase.quantity < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be at least 1"
        )
    
    supabase = get_supabase_client()
    
    try:
        # Get the item details
        item_response = supabase.table("shop_items") \
            .select("*") \
            .eq("id", purchase.item_id) \
            .execute()
        
        if not item_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item with ID {purchase.item_id} not found"
            )
        
        item = item_response.data[0]
        shop_item = ShopItem(**item)
        
        # Verify this is an in-game currency purchase
        if shop_item.purchase_type != PurchaseType.IN_GAME:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This endpoint is for in-game currency purchases only. Use /shop/purchase for real-money purchases."
            )
        
        # Calculate total cost
        total_cost = shop_item.price * purchase.quantity
        
        # Get user's current money
        stats_response = supabase.table("user_stats") \
            .select("money") \
            .eq("user_id", user.sub) \
            .execute()
        
        if not stats_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User stats not found"
            )
        
        current_money = stats_response.data[0]["money"]
        
        # Check if user has enough money
        if current_money < total_cost:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough money. Required: {total_cost}, Available: {current_money}"
            )
        
        # Start a virtual transaction (Supabase doesn't support real transactions)
        try:
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
                "reason": f"Purchased {purchase.quantity}x {shop_item.name}",
                "timestamp": datetime.now().isoformat()
            }).execute()
            
            # Add item to user's inventory
            add_to_inventory(supabase, user.sub, purchase.item_id, purchase.quantity, shop_item)
            
            # Record the purchase
            supabase.table("purchase_history").insert({
                "user_id": user.sub,
                "item_id": purchase.item_id,
                "quantity": purchase.quantity,
                "total_cost": total_cost,
                "purchase_type": PurchaseType.IN_GAME,
                "purchased_at": datetime.now().isoformat()
            }).execute()
            
            return {
                "message": "Purchase successful",
                "data": {
                    "item_id": purchase.item_id,
                    "quantity": purchase.quantity,
                    "total_cost": total_cost,
                    "remaining_money": current_money - total_cost
                }
            }
            
        except Exception as e:
            # If any part of the transaction fails, try to revert the money change
            # (Note: This is not a true transaction, but a best effort to maintain consistency)
            logger.error(f"Transaction failed, attempting rollback: {str(e)}")
            try:
                supabase.table("user_stats") \
                    .update({"money": current_money}) \
                    .eq("user_id", user.sub) \
                    .execute()
            except Exception as rollback_error:
                logger.error(f"Rollback failed: {str(rollback_error)}")
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error processing purchase"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in in-game purchase: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Error processing in-game purchase"
        )

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhooks for payment confirmations.
    
    Processes successful payments and updates user inventories.
    """
    # Get the raw request body
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if not sig_header or not STRIPE_WEBHOOK_SECRET:
        logger.warning("Missing signature header or webhook secret")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing signature or webhook secret"
        )
    
    try:
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError as e:
        logger.warning(f"Invalid signature: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )
    except Exception as e:
        logger.error(f"Error parsing webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error parsing webhook"
        )
    
    # Handle the event
    if event.type == "checkout.session.completed":
        session = event.data.object
        
        # Process the purchase
        try:
            # Get metadata
            metadata = session.metadata
            user_id = metadata.get("user_id")
            item_id = metadata.get("item_id")
            quantity = int(metadata.get("quantity", 1))
            
            if not user_id or not item_id:
                logger.error("Missing user_id or item_id in webhook metadata")
                return {"error": "Missing required metadata"}
            
            # Get the Supabase client
            supabase = get_supabase_client()
            
            # Get item details
            item_response = supabase.table("shop_items") \
                .select("*") \
                .eq("id", item_id) \
                .execute()
            
            if not item_response.data:
                logger.error(f"Item {item_id} not found in webhook processing")
                return {"error": f"Item {item_id} not found"}
            
            shop_item = ShopItem(**item_response.data[0])
            
            # Add item to inventory
            add_to_inventory(supabase, user_id, item_id, quantity, shop_item)
            
            # Record purchase
            supabase.table("purchase_history").insert({
                "user_id": user_id,
                "item_id": item_id,
                "quantity": quantity,
                "total_cost": session.amount_total,
                "purchase_type": PurchaseType.REAL_MONEY,
                "payment_id": session.id,
                "purchased_at": datetime.now().isoformat()
            }).execute()
            
            return {"success": True, "message": "Webhook processed successfully"}
            
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
            return {"error": "Error processing webhook", "details": str(e)}
    
    # For other events, just acknowledge receipt
    return {"received": True, "type": event.type}

@router.post("/use/{item_id}", response_model=Dict[str, Any])
async def use_item(
    item_id: str,
    request: UseItemRequest = None,
    user: AuthorizedUser = Depends()
):
    """
    Use an item from the user's inventory.
    
    Applies item effects to stats and updates inventory.
    """
    if not item_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item ID is required"
        )
    
    quantity = 1
    if request and request.quantity > 1:
        quantity = request.quantity
    
    supabase = get_supabase_client()
    
    try:
        # Get the item details
        item_response = supabase.table("shop_items") \
            .select("*") \
            .eq("id", item_id) \
            .execute()
        
        if not item_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item with ID {item_id} not found"
            )
        
        shop_item = ShopItem(**item_response.data[0])
        
        # Check if item is usable
        if not shop_item.usable:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This item cannot be used"
            )
        
        # Check if item is in inventory and has enough quantity
        inventory_response = supabase.table("user_inventory") \
            .select("*") \
            .eq("user_id", user.sub) \
            .eq("item_id", item_id) \
            .execute()
        
        if not inventory_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found in your inventory"
            )
        
        inventory_item = inventory_response.data[0]
        current_quantity = inventory_item.get("quantity", 0)
        
        if current_quantity < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough items. Required: {quantity}, Available: {current_quantity}"
            )
        
        # Check uses remaining for limited-use items
        uses_remaining = inventory_item.get("uses_remaining")
        if shop_item.limited_use is not None:
            if uses_remaining is None:
                # First use of the item, initialize uses_remaining
                uses_remaining = shop_item.limited_use
            
            if uses_remaining < quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Not enough uses remaining. Required: {quantity}, Available: {uses_remaining}"
                )
            
            # Update uses remaining
            uses_remaining -= quantity
        
        # Apply stat effects if any
        effects = shop_item.stats_effects
        updates = {}
        
        if effects:
            # Get current stats
            stats_response = supabase.table("user_stats") \
                .select("*") \
                .eq("user_id", user.sub) \
                .execute()
            
            if not stats_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User stats not found"
                )
            
            current_stats = stats_response.data[0]
            history_entries = []
            timestamp = datetime.now().isoformat()
            
            # Apply effects and prepare updates
            for stat_name, effect_value in effects.items():
                # Skip invalid stat names
                if stat_name not in ["hunger", "stress", "tone", "health", "money"]:
                    continue
                
                # Scale effect by quantity
                total_effect = effect_value * quantity
                
                current_value = current_stats.get(stat_name, 0)
                new_value = current_value + total_effect
                
                # Enforce limits
                if stat_name in ["hunger", "stress", "tone", "health"]:
                    new_value = max(0, min(100, new_value))
                
                if stat_name == "money":
                    new_value = max(0, new_value)
                
                updates[stat_name] = new_value
                
                # Prepare history entry
                history_entries.append({
                    "user_id": user.sub,
                    "stat_type": stat_name,
                    "previous_value": current_value,
                    "new_value": new_value,
                    "change": total_effect,
                    "reason": f"Used {quantity}x {shop_item.name}",
                    "timestamp": timestamp
                })
            
            # Update stats in database
            if updates:
                supabase.table("user_stats") \
                    .update(updates) \
                    .eq("user_id", user.sub) \
                    .execute()
            
            # Record history
            if history_entries:
                supabase.table("stat_history").insert(history_entries).execute()
        
        # Update inventory
        remaining_quantity = current_quantity - quantity
        
        if remaining_quantity > 0:
            # Update quantity and uses_remaining if needed
            update_data = {"quantity": remaining_quantity}
            if shop_item.limited_use is not None:
                update_data["uses_remaining"] = uses_remaining
            
            supabase.table("user_inventory") \
                .update(update_data) \
                .eq("user_id", user.sub) \
                .eq("item_id", item_id) \
                .execute()
        else:
            # Remove from inventory if quantity is 0
            supabase.table("user_inventory") \
                .delete() \
                .eq("user_id", user.sub) \
                .eq("item_id", item_id) \
                .execute()
        
        # Record item usage
        supabase.table("item_usage_history").insert({
            "user_id": user.sub,
            "item_id": item_id,
            "quantity": quantity,
            "used_at": timestamp,
            "effects": effects
        }).execute()
        
        return {
            "message": "Item used successfully",
            "effects": effects,
            "remaining_quantity": remaining_quantity,
            "updates": updates
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error using item: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error using item"
        )

def add_to_inventory(supabase, user_id, item_id, quantity, shop_item):
    """Helper function to add an item to user's inventory."""
    try:
        # Check if user already has this item
        existing_item = supabase.table("user_inventory") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("item_id", item_id) \
            .execute()
        
        # Prepare the uses_remaining value for limited-use items
        uses_remaining = None
        if shop_item.limited_use is not None:
            uses_remaining = shop_item.limited_use * quantity
        
        if existing_item.data:
            # Update quantity for existing item
            current_quantity = existing_item.data[0].get("quantity", 0)
            current_uses = existing_item.data[0].get("uses_remaining")
            
            # Update uses_remaining for limited-use items
            if shop_item.limited_use is not None:
                if current_uses is not None:
                    uses_remaining = current_uses + (shop_item.limited_use * quantity)
                
                supabase.table("user_inventory") \
                    .update({
                        "quantity": current_quantity + quantity,
                        "uses_remaining": uses_remaining
                    }) \
                    .eq("user_id", user_id) \
                    .eq("item_id", item_id) \
                    .execute()
            else:
                # Regular item, just update quantity
                supabase.table("user_inventory") \
                    .update({"quantity": current_quantity + quantity}) \
                    .eq("user_id", user_id) \
                    .eq("item_id", item_id) \
                    .execute()
        else:
            # Add new item to inventory
            supabase.table("user_inventory").insert({
                "user_id": user_id,
                "item_id": item_id,
                "quantity": quantity,
                "purchased_at": datetime.now().isoformat(),
                "uses_remaining": uses_remaining
            }).execute()
        
        return True
    except Exception as e:
        logger.error(f"Error adding item to inventory: {str(e)}")
        raise 
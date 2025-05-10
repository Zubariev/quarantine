import pytest
from unittest.mock import patch
import json
from datetime import datetime

def test_get_shop_items(client, mock_supabase):
    """Test getting all shop items."""
    response = client.get("/routes/shop")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 2
    assert data[0]["id"] == "item1"
    assert data[0]["name"] == "Online Course: Programming"
    assert data[1]["id"] == "item2"
    assert data[1]["name"] == "Plant: Cactus"

def test_get_shop_items_by_category(client, mock_supabase):
    """Test filtering shop items by category."""
    response = client.get("/routes/shop?category=course")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 1
    assert data[0]["id"] == "item1"
    assert data[0]["category"] == "course"

def test_get_empty_inventory(client, mock_supabase):
    """Test getting user inventory when it's empty."""
    response = client.get("/routes/shop/inventory")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 0

def test_get_inventory_with_items(client, mock_supabase):
    """Test getting user inventory with items."""
    # Mock inventory data
    mock_inventory = [
        {
            "id": "inv1",
            "user_id": "user123",
            "item_id": "item1",
            "quantity": 2,
            "purchased_at": datetime.now().isoformat()
        },
        {
            "id": "inv2",
            "user_id": "user123",
            "item_id": "item2",
            "quantity": 1,
            "purchased_at": datetime.now().isoformat()
        }
    ]
    mock_supabase.set_table_data("user_inventory", mock_inventory)
    
    response = client.get("/routes/shop/inventory")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 2
    assert data[0]["item_id"] == "item1"
    assert data[0]["quantity"] == 2
    assert "item_details" in data[0]
    
    assert data[1]["item_id"] == "item2"
    assert data[1]["quantity"] == 1
    assert "item_details" in data[1]

def test_purchase_in_game_item_success(client, mock_supabase):
    """Test successfully purchasing an in-game item."""
    purchase_data = {
        "item_id": "item2",  # Cactus for 50 coins
        "quantity": 1
    }
    
    response = client.post("/routes/shop/purchase", json=purchase_data)
    assert response.status_code == 200
    assert response.json()["message"] == "Purchase successful"

def test_purchase_in_game_item_not_enough_money(client, mock_supabase):
    """Test purchasing an item without enough money."""
    # Update user money to 10 (not enough for any item)
    mock_supabase.set_table_data("user_stats", [
        {
            "id": "1", 
            "user_id": "user123", 
            "hunger": 70, 
            "stress": 30, 
            "tone": 60, 
            "health": 80, 
            "money": 10
        }
    ])
    
    purchase_data = {
        "item_id": "item2",  # Cactus for 50 coins
        "quantity": 1
    }
    
    response = client.post("/routes/shop/purchase", json=purchase_data)
    assert response.status_code == 400
    assert "Not enough money" in response.json()["detail"]

def test_purchase_item_not_found(client, mock_supabase):
    """Test purchasing a non-existent item."""
    purchase_data = {
        "item_id": "nonexistent",
        "quantity": 1
    }
    
    response = client.post("/routes/shop/purchase", json=purchase_data)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]

@pytest.mark.skip(reason="Real money purchases not fully implemented")
def test_purchase_real_money_item(client, mock_supabase, mock_stripe):
    """Test purchasing a real money item."""
    # Change item2 to be a real-money purchase
    mock_supabase.set_table_data("shop_items", [
        {
            "id": "item1",
            "name": "Online Course: Programming",
            "description": "Learn to code",
            "category": "course",
            "price": 200,
            "purchase_type": "in_game",
            "stats_effects": {
                "stress": 5,
                "tone": 10
            }
        },
        {
            "id": "item2",
            "name": "Plant: Cactus",
            "description": "A small cactus plant",
            "category": "plant",
            "price": 5,
            "purchase_type": "real_money",
            "stats_effects": {
                "stress": -5
            }
        }
    ])
    
    purchase_data = {
        "item_id": "item2", 
        "quantity": 1
    }
    
    response = client.post("/routes/shop/purchase", json=purchase_data)
    # This test would need more setup with Stripe mocking to pass

def test_use_item_success(client, mock_supabase):
    """Test successfully using an item from inventory."""
    # Mock inventory data
    mock_inventory = [
        {
            "id": "inv1",
            "user_id": "user123",
            "item_id": "item2",  # Cactus that reduces stress by 5
            "quantity": 2,
            "purchased_at": datetime.now().isoformat()
        }
    ]
    mock_supabase.set_table_data("user_inventory", mock_inventory)
    
    response = client.post("/routes/shop/use/item2")
    assert response.status_code == 200
    data = response.json()
    
    assert data["message"] == "Item used successfully"
    assert data["remaining_quantity"] == 1
    assert "effects" in data
    assert data["effects"]["stress"] == -5

def test_use_item_not_in_inventory(client, mock_supabase):
    """Test using an item not in inventory."""
    response = client.post("/routes/shop/use/nonexistent")
    assert response.status_code == 404
    assert "not found in inventory" in response.json()["detail"]

def test_use_item_zero_quantity(client, mock_supabase):
    """Test using an item with zero quantity."""
    # Mock inventory data with zero quantity
    mock_inventory = [
        {
            "id": "inv1",
            "user_id": "user123",
            "item_id": "item2",
            "quantity": 0,
            "purchased_at": datetime.now().isoformat()
        }
    ]
    mock_supabase.set_table_data("user_inventory", mock_inventory)
    
    response = client.post("/routes/shop/use/item2")
    assert response.status_code == 404
    assert "quantity is zero" in response.json()["detail"] 
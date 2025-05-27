import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import json
from datetime import datetime

from main import app
from app.models.game import PurchaseType, ItemCategory

client = TestClient(app)

# Mock user for testing
TEST_USER = {"sub": "test-user-123"}

# Mock the auth dependency
@pytest.fixture
def mock_auth():
    with patch("app.auth.get_authorized_user") as mock:
        mock.return_value = MagicMock(**TEST_USER)
        yield mock

# Mock the Supabase client
@pytest.fixture
def mock_supabase():
    with patch("app.db.supabase.get_supabase_client") as mock:
        mock_client = MagicMock()
        mock.return_value = mock_client
        yield mock_client

# Mock Stripe
@pytest.fixture
def mock_stripe():
    with patch("stripe.PaymentIntent.create") as mock_payment_intent, \
         patch("stripe.checkout.Session.create") as mock_session:
        
        # Configure mock payment intent
        mock_intent = MagicMock()
        mock_intent.id = "pi_test123"
        mock_intent.client_secret = "pi_test_secret"
        mock_intent.status = "succeeded"
        mock_payment_intent.return_value = mock_intent
        
        # Configure mock session
        mock_sess = MagicMock()
        mock_sess.id = "cs_test123"
        mock_sess.url = "https://checkout.stripe.com/test"
        mock_session.return_value = mock_sess
        
        yield (mock_payment_intent, mock_session)


class TestShopAPI:
    """Tests for the shop API endpoints"""
    
    def test_get_shop_items(self, mock_auth, mock_supabase):
        """Test retrieving all shop items"""
        # Mock the database response
        mock_execute = MagicMock()
        mock_execute.data = [
            {
                "id": "item1",
                "name": "Test Item 1",
                "description": "A test item",
                "category": "furniture",
                "price": 100,
                "purchase_type": "in_game",
                "stats_effects": {"stress": -5},
                "image_url": "https://example.com/item1.png",
                "usable": True
            },
            {
                "id": "item2",
                "name": "Premium Item",
                "description": "A premium item",
                "category": "theme",
                "price": 500,
                "purchase_type": "real_money",
                "stats_effects": {"tone": 10},
                "image_url": "https://example.com/item2.png",
                "usable": True
            }
        ]
        
        mock_supabase.table.return_value.select.return_value.execute.return_value = mock_execute
        
        # Make the request
        response = client.get("/shop")
        
        # Check the response
        assert response.status_code == 200
        assert len(response.json()) == 2
        assert response.json()[0]["id"] == "item1"
        assert response.json()[1]["id"] == "item2"
        
        # Verify the correct database calls were made
        mock_supabase.table.assert_called_with("shop_items")
        mock_supabase.table.return_value.select.assert_called_with("*")
    
    def test_get_shop_items_with_category(self, mock_auth, mock_supabase):
        """Test retrieving shop items filtered by category"""
        # Mock the filtered database response
        mock_execute = MagicMock()
        mock_execute.data = [
            {
                "id": "item1",
                "name": "Test Item 1",
                "description": "A test item",
                "category": "furniture",
                "price": 100,
                "purchase_type": "in_game",
                "stats_effects": {"stress": -5},
                "image_url": "https://example.com/item1.png",
                "usable": True
            }
        ]
        
        mock_select = MagicMock()
        mock_select.eq.return_value.execute.return_value = mock_execute
        
        mock_supabase.table.return_value.select.return_value = mock_select
        
        # Make the request with category filter
        response = client.get("/shop?category=furniture")
        
        # Check the response
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["category"] == "furniture"
        
        # Verify the correct filter was applied
        mock_select.eq.assert_called_with("category", "furniture")
    
    def test_get_inventory(self, mock_auth, mock_supabase):
        """Test retrieving user's inventory"""
        # Mock inventory items response
        inventory_data = [
            {
                "user_id": TEST_USER["sub"],
                "item_id": "item1",
                "quantity": 2,
                "purchased_at": "2023-07-15T10:30:00",
                "uses_remaining": None
            }
        ]
        
        # Mock shop items response for item details
        shop_data = [
            {
                "id": "item1",
                "name": "Test Item 1",
                "description": "A test item",
                "category": "furniture",
                "price": 100,
                "purchase_type": "in_game",
                "stats_effects": {"stress": -5},
                "usable": True
            }
        ]
        
        # Configure mocks to return different responses based on table name
        def mock_table_selector(table_name):
            mock_table = MagicMock()
            
            if table_name == "user_inventory":
                mock_response = MagicMock()
                mock_response.data = inventory_data
                mock_table.select.return_value.eq.return_value.range.return_value.execute.return_value = mock_response
            elif table_name == "shop_items":
                mock_response = MagicMock()
                mock_response.data = shop_data
                mock_table.select.return_value.execute.return_value = mock_response
            
            return mock_table
        
        mock_supabase.table.side_effect = mock_table_selector
        
        # Make the request
        response = client.get("/shop/inventory")
        
        # Check the response
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["item_id"] == "item1"
        assert response.json()[0]["quantity"] == 2
        assert "item_details" in response.json()[0]
        assert response.json()[0]["item_details"]["name"] == "Test Item 1"
    
    def test_in_game_purchase_success(self, mock_auth, mock_supabase):
        """Test successful in-game purchase"""
        # Mock item in shop
        item_response = MagicMock()
        item_response.data = [{
            "id": "item1",
            "name": "Test Item",
            "description": "A test item",
            "category": "furniture",
            "price": 100,
            "purchase_type": "in_game",
            "stats_effects": {"stress": -5},
            "usable": True
        }]
        
        # Mock user stats (money)
        stats_response = MagicMock()
        stats_response.data = [{
            "money": 500  # User has enough money
        }]
        
        # Configure mock to return different responses based on the table and method
        def mock_table_selector(table_name):
            mock_table = MagicMock()
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            
            if table_name == "shop_items":
                mock_select.eq.return_value.execute.return_value = item_response
            elif table_name == "user_stats":
                mock_select.eq.return_value.execute.return_value = stats_response
            elif table_name == "user_inventory":
                # Mock for checking existing inventory
                empty_response = MagicMock()
                empty_response.data = []
                mock_select.eq.return_value.eq.return_value.execute.return_value = empty_response
            
            return mock_table
        
        mock_supabase.table.side_effect = mock_table_selector
        
        # Make the purchase request
        response = client.post(
            "/shop/ingame",
            json={
                "item_id": "item1",
                "quantity": 1
            }
        )
        
        # Check the response
        assert response.status_code == 200
        assert response.json()["message"] == "Purchase successful"
        assert response.json()["data"]["remaining_money"] == 400  # 500 - 100
        
        # Verify the money was updated
        mock_supabase.table.return_value.update.assert_any_call({"money": 400})
    
    def test_in_game_purchase_insufficient_funds(self, mock_auth, mock_supabase):
        """Test in-game purchase with insufficient funds"""
        # Mock item in shop
        item_response = MagicMock()
        item_response.data = [{
            "id": "item1",
            "name": "Test Item",
            "description": "A test item",
            "category": "furniture",
            "price": 100,
            "purchase_type": "in_game",
            "stats_effects": {"stress": -5},
            "usable": True
        }]
        
        # Mock user stats (money)
        stats_response = MagicMock()
        stats_response.data = [{
            "money": 50  # Not enough money
        }]
        
        # Configure mock to return different responses
        def mock_table_selector(table_name):
            mock_table = MagicMock()
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            
            if table_name == "shop_items":
                mock_select.eq.return_value.execute.return_value = item_response
            elif table_name == "user_stats":
                mock_select.eq.return_value.execute.return_value = stats_response
            
            return mock_table
        
        mock_supabase.table.side_effect = mock_table_selector
        
        # Make the purchase request
        response = client.post(
            "/shop/ingame",
            json={
                "item_id": "item1",
                "quantity": 1
            }
        )
        
        # Check the response
        assert response.status_code == 400
        assert "Not enough money" in response.json()["detail"]
    
    def test_real_money_purchase(self, mock_auth, mock_supabase, mock_stripe):
        """Test real money purchase using Stripe"""
        # Mock item in shop
        item_response = MagicMock()
        item_response.data = [{
            "id": "premium1",
            "name": "Premium Item",
            "description": "A premium item",
            "category": "theme",
            "price": 500,  # 5.00 USD
            "purchase_type": "real_money",
            "stats_effects": {"tone": 10},
            "usable": True
        }]
        
        # Configure mock for shop items
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = item_response
        
        # Make the purchase request with payment method
        response = client.post(
            "/shop/purchase",
            json={
                "item_id": "premium1",
                "quantity": 1,
                "payment_method_id": "pm_test123"
            }
        )
        
        # Check the response
        assert response.status_code == 200
        assert response.json()["message"] == "Payment successful"
        assert response.json()["payment_intent_id"] == "pi_test123"
        
        # Verify Stripe was called with correct parameters
        mock_stripe[0].assert_called_once()
        args, kwargs = mock_stripe[0].call_args
        assert kwargs["amount"] == 500
        assert kwargs["payment_method"] == "pm_test123"
    
    def test_real_money_purchase_checkout(self, mock_auth, mock_supabase, mock_stripe):
        """Test real money purchase using Stripe Checkout"""
        # Mock item in shop
        item_response = MagicMock()
        item_response.data = [{
            "id": "premium1",
            "name": "Premium Item",
            "description": "A premium item",
            "category": "theme",
            "price": 500,  # 5.00 USD
            "purchase_type": "real_money",
            "stats_effects": {"tone": 10},
            "usable": True,
            "image_url": "https://example.com/item.png"
        }]
        
        # Configure mock for shop items
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = item_response
        
        # Make the purchase request without payment method (should create checkout)
        response = client.post(
            "/shop/purchase",
            json={
                "item_id": "premium1",
                "quantity": 1
            }
        )
        
        # Check the response
        assert response.status_code == 200
        assert "checkout_url" in response.json()
        assert response.json()["session_id"] == "cs_test123"
        
        # Verify Stripe checkout was called with correct parameters
        mock_stripe[1].assert_called_once()
        args, kwargs = mock_stripe[1].call_args
        assert kwargs["line_items"][0]["price_data"]["unit_amount"] == 500
        assert kwargs["line_items"][0]["price_data"]["product_data"]["name"] == "Premium Item"
    
    def test_use_item(self, mock_auth, mock_supabase):
        """Test using an item from inventory"""
        # Mock item in shop
        item_response = MagicMock()
        item_response.data = [{
            "id": "healthdrink",
            "name": "Health Drink",
            "description": "Restores health",
            "category": "food",
            "price": 50,
            "purchase_type": "in_game",
            "stats_effects": {"health": 10, "hunger": -5},
            "usable": True
        }]
        
        # Mock inventory
        inventory_response = MagicMock()
        inventory_response.data = [{
            "user_id": TEST_USER["sub"],
            "item_id": "healthdrink",
            "quantity": 3,
            "purchased_at": "2023-07-15T10:30:00"
        }]
        
        # Mock user stats
        stats_response = MagicMock()
        stats_response.data = [{
            "health": 60,
            "hunger": 50,
            "stress": 70,
            "tone": 40,
            "money": 1000
        }]
        
        # Configure mock to return different responses
        def mock_table_selector(table_name):
            mock_table = MagicMock()
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            
            if table_name == "shop_items":
                mock_select.eq.return_value.execute.return_value = item_response
            elif table_name == "user_inventory":
                mock_select.eq.return_value.eq.return_value.execute.return_value = inventory_response
            elif table_name == "user_stats":
                mock_select.eq.return_value.execute.return_value = stats_response
            
            return mock_table
        
        mock_supabase.table.side_effect = mock_table_selector
        
        # Make the use item request
        response = client.post("/shop/use/healthdrink")
        
        # Check the response
        assert response.status_code == 200
        assert response.json()["message"] == "Item used successfully"
        assert response.json()["remaining_quantity"] == 2
        assert response.json()["effects"]["health"] == 10
        assert response.json()["effects"]["hunger"] == -5
        assert response.json()["updates"]["health"] == 70  # 60 + 10
        assert response.json()["updates"]["hunger"] == 45  # 50 - 5
        
        # Verify inventory was updated
        mock_supabase.table.return_value.update.assert_any_call({"quantity": 2})
        
        # Verify stats were updated
        mock_supabase.table.return_value.update.assert_any_call({
            "health": 70,
            "hunger": 45
        })
    
    def test_use_item_not_in_inventory(self, mock_auth, mock_supabase):
        """Test using item not in inventory"""
        # Mock item in shop
        item_response = MagicMock()
        item_response.data = [{
            "id": "healthdrink",
            "name": "Health Drink",
            "description": "Restores health",
            "category": "food",
            "price": 50,
            "purchase_type": "in_game",
            "stats_effects": {"health": 10},
            "usable": True
        }]
        
        # Mock empty inventory
        empty_response = MagicMock()
        empty_response.data = []
        
        # Configure mocks
        def mock_table_selector(table_name):
            mock_table = MagicMock()
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            
            if table_name == "shop_items":
                mock_select.eq.return_value.execute.return_value = item_response
            elif table_name == "user_inventory":
                mock_select.eq.return_value.eq.return_value.execute.return_value = empty_response
            
            return mock_table
        
        mock_supabase.table.side_effect = mock_table_selector
        
        # Make the use item request
        response = client.post("/shop/use/healthdrink")
        
        # Check the response
        assert response.status_code == 404
        assert "not found in your inventory" in response.json()["detail"] 
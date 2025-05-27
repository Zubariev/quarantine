import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import json
from datetime import datetime, date
import os

# Mock the Supabase client
@pytest.fixture
def mock_supabase():
    """Create a mock Supabase client for testing."""
    class MockSupabaseResponse:
        def __init__(self, data=None, error=None):
            self.data = data or []
            self.error = error

    class MockSupabaseQuery:
        def __init__(self, response_data=None):
            self.response_data = response_data or []
            self.filters = []
            
        def select(self, *args):
            return self
            
        def insert(self, data):
            return self
            
        def update(self, data):
            return self
            
        def delete(self):
            return self
            
        def eq(self, field, value):
            self.filters.append(("eq", field, value))
            return self
            
        def neq(self, field, value):
            self.filters.append(("neq", field, value))
            return self
            
        def gt(self, field, value):
            self.filters.append(("gt", field, value))
            return self
            
        def lt(self, field, value):
            self.filters.append(("lt", field, value))
            return self
            
        def is_(self, field, value):
            self.filters.append(("is", field, value))
            return self
            
        def execute(self):
            return MockSupabaseResponse(data=self.response_data)

    class MockSupabase:
        def __init__(self):
            self.tables = {
                "user_stats": [],
                "user_schedules": [],
                "activities": [],
                "shop_items": [],
                "user_inventory": [],
                "stat_history": [],
                "purchase_history": [],
                "item_usage_history": []
            }
            
        def table(self, name):
            return MockSupabaseQuery(self.tables.get(name, []))
        
        def set_table_data(self, table_name, data):
            self.tables[table_name] = data
    
    mock_supabase = MockSupabase()
    
    # Set up some basic mock data
    mock_supabase.set_table_data("user_stats", [
        {
            "id": "1", 
            "user_id": "user123", 
            "hunger": 70, 
            "stress": 30, 
            "tone": 60, 
            "health": 80, 
            "money": 2000
        }
    ])
    
    mock_supabase.set_table_data("activities", [
        {
            "id": "act1",
            "name": "Work",
            "type": "work",
            "description": "Regular work day",
            "duration_hours": 4,
            "stats_effects": {
                "hunger": -10,
                "stress": 20,
                "money": 100
            }
        },
        {
            "id": "act2",
            "name": "Exercise",
            "type": "exercise",
            "description": "Gym workout",
            "duration_hours": 1,
            "stats_effects": {
                "health": 10,
                "stress": -10,
                "hunger": -5
            }
        }
    ])
    
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
            "price": 50,
            "purchase_type": "in_game",
            "stats_effects": {
                "stress": -5
            }
        }
    ])
    
    return mock_supabase

# Mock the authorized user
@pytest.fixture
def mock_authorized_user():
    """Create a mock authorized user for testing."""
    class MockUser:
        def __init__(self):
            self.sub = "user123"
            self.email = "test@example.com"
            self.name = "Test User"
    
    return MockUser()

# Mock the Stripe API
@pytest.fixture
def mock_stripe():
    """Create a mock Stripe API for testing."""
    with patch("stripe.api_key", "fake_key"):
        with patch("stripe.checkout.Session.create") as mock_create:
            mock_create.return_value = {"id": "test_session", "url": "http://test-checkout-url.com"}
            yield mock_create

# Create a test client using the mocks
@pytest.fixture
def client(mock_supabase, mock_authorized_user):
    """Create a FastAPI test client with mocked dependencies."""
    from main import app
    
    # Mock the supabase client and auth dependency
    with patch("app.db.supabase.get_supabase_client", return_value=mock_supabase):
        with patch("databutton_app.mw.auth_mw.get_authorized_user", return_value=mock_authorized_user):
            with TestClient(app) as client:
                yield client 
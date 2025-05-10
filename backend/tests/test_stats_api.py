import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import json

from main import app
from app.models.game import StatType

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

class TestStatsAPI:
    """Tests for the stats API endpoints"""
    
    def test_get_stats_existing_user(self, mock_auth, mock_supabase):
        """Test retrieving stats for an existing user"""
        # Mock the database response
        mock_execute = MagicMock()
        mock_execute.data = [{
            "hunger": 70,
            "stress": 30,
            "tone": 60,
            "health": 80,
            "money": 2000
        }]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_execute
        
        # Make the request
        response = client.get("/stats")
        
        # Check the response
        assert response.status_code == 200
        assert response.json() == {
            "hunger": 70,
            "stress": 30,
            "tone": 60,
            "health": 80,
            "money": 2000
        }
        
        # Verify the correct database calls were made
        mock_supabase.table.assert_called_with("user_stats")
        mock_supabase.table.return_value.select.assert_called_with("*")
        mock_supabase.table.return_value.select.return_value.eq.assert_called_with("user_id", TEST_USER["sub"])
    
    def test_get_stats_new_user(self, mock_auth, mock_supabase):
        """Test retrieving stats for a new user - should create default stats"""
        # Mock the database response for a user with no stats
        empty_response = MagicMock()
        empty_response.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = empty_response
        
        # Mock the insert operation
        mock_insert = MagicMock()
        mock_supabase.table.return_value.insert.return_value = mock_insert
        
        # Make the request
        response = client.get("/stats")
        
        # Check the response - should contain default values
        assert response.status_code == 200
        assert response.json() == {
            "hunger": 50,
            "stress": 50,
            "tone": 50,
            "health": 50,
            "money": 1000
        }
        
        # Verify that insert was called to create default stats
        mock_supabase.table.return_value.insert.assert_called_once()
    
    def test_get_stats_db_error(self, mock_auth, mock_supabase):
        """Test error handling when the database throws an exception"""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        response = client.get("/stats")
        
        assert response.status_code == 500
        assert "Error retrieving stats" in response.json()["detail"]
    
    def test_update_stats(self, mock_auth, mock_supabase):
        """Test updating a stat"""
        # Mock the current stats
        mock_execute = MagicMock()
        mock_execute.data = [{
            "hunger": 70,
            "stress": 30,
            "tone": 60,
            "health": 80,
            "money": 2000
        }]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_execute
        
        # Make the request to update hunger
        response = client.post(
            "/stats",
            json={
                "stat_type": "hunger",
                "value": -10,
                "reason": "Ate lunch"
            }
        )
        
        # Check the response
        assert response.status_code == 200
        assert response.json() == {"hunger": 60}
        
        # Verify the correct database calls were made
        # Verify update call
        mock_supabase.table.return_value.update.assert_called_with({"hunger": 60})
        mock_supabase.table.return_value.update.return_value.eq.assert_called_with("user_id", TEST_USER["sub"])
        
        # Verify stat history recording
        mock_supabase.table.return_value.insert.assert_called_once()
    
    def test_update_stats_invalid_type(self, mock_auth, mock_supabase):
        """Test updating with an invalid stat type"""
        response = client.post(
            "/stats",
            json={
                "stat_type": "invalid_stat",
                "value": 10,
                "reason": "Testing"
            }
        )
        
        assert response.status_code == 400
        assert "Invalid stat type" in response.json()["detail"]
    
    def test_update_stats_enforces_limits(self, mock_auth, mock_supabase):
        """Test that stat updates enforce the 0-100 limits for appropriate stats"""
        # Setup current stats
        mock_execute = MagicMock()
        mock_execute.data = [{
            "hunger": 90,
            "stress": 10,
            "tone": 50,
            "health": 50,
            "money": 1000
        }]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_execute
        
        # Try to increase hunger above 100
        response = client.post(
            "/stats",
            json={
                "stat_type": "hunger",
                "value": 20,  # Would make hunger 110, but should cap at 100
                "reason": "Testing limits"
            }
        )
        
        assert response.status_code == 200
        assert response.json() == {"hunger": 100}  # Should be capped at 100
        
        # Try to decrease stress below 0
        response = client.post(
            "/stats",
            json={
                "stat_type": "stress",
                "value": -20,  # Would make stress -10, but should floor at 0
                "reason": "Testing limits"
            }
        )
        
        assert response.status_code == 200
        assert response.json() == {"stress": 0}  # Should be floored at 0
    
    def test_apply_activity_effects(self, mock_auth, mock_supabase):
        """Test applying activity effects to stats"""
        # Mock the activity in database
        mock_activity_response = MagicMock()
        mock_activity_response.data = [{
            "id": "work",
            "name": "Work",
            "type": "work",
            "description": "Regular work day",
            "stats_effects": {
                "hunger": -10,
                "stress": 20,
                "money": 100
            }
        }]
        
        # Mock the current stats
        mock_stats_response = MagicMock()
        mock_stats_response.data = [{
            "hunger": 70,
            "stress": 30,
            "tone": 60,
            "health": 80,
            "money": 1000
        }]
        
        # Configure mock to return different responses based on the table name
        def mock_table_selector(table_name):
            mock_table = MagicMock()
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            
            if table_name == "activities":
                mock_select.eq.return_value.execute.return_value = mock_activity_response
            elif table_name == "user_stats":
                mock_select.eq.return_value.execute.return_value = mock_stats_response
            
            return mock_table
        
        mock_supabase.table.side_effect = mock_table_selector
        
        # Make the request
        response = client.post("/stats/activity?activity_id=work")
        
        # Check the response
        assert response.status_code == 200
        assert "updates" in response.json()
        updates = response.json()["updates"]
        assert updates["hunger"] == 60  # 70 - 10
        assert updates["stress"] == 50  # 30 + 20
        assert updates["money"] == 1100  # 1000 + 100
    
    def test_apply_activity_effects_not_found(self, mock_auth, mock_supabase):
        """Test applying effects for a non-existent activity"""
        # Mock empty response for non-existent activity
        mock_empty_response = MagicMock()
        mock_empty_response.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_empty_response
        
        response = client.post("/stats/activity?activity_id=nonexistent")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_get_stat_history(self, mock_auth, mock_supabase):
        """Test retrieving stat history"""
        # Mock the database response
        mock_execute = MagicMock()
        mock_execute.data = [
            {
                "user_id": TEST_USER["sub"],
                "stat_type": "hunger",
                "previous_value": 70,
                "new_value": 60,
                "change": -10,
                "reason": "Ate lunch",
                "timestamp": "2023-07-15T10:30:00"
            },
            {
                "user_id": TEST_USER["sub"],
                "stat_type": "money",
                "previous_value": 1000,
                "new_value": 1100,
                "change": 100,
                "reason": "Activity: Work",
                "timestamp": "2023-07-15T09:30:00"
            }
        ]
        
        # Configure mock to return the history response
        mock_order = MagicMock()
        mock_order.limit.return_value.execute.return_value = mock_execute
        
        mock_eq = MagicMock()
        mock_eq.order.return_value = mock_order
        
        mock_select = MagicMock()
        mock_select.eq.return_value = mock_eq
        
        mock_table = MagicMock()
        mock_table.select.return_value = mock_select
        
        mock_supabase.table.return_value = mock_table
        
        # Make the request
        response = client.get("/stats/history")
        
        # Check the response
        assert response.status_code == 200
        assert len(response.json()) == 2
        assert response.json()[0]["stat_type"] == "hunger"
        assert response.json()[1]["stat_type"] == "money"
        
        # Verify the correct database calls were made
        mock_supabase.table.assert_called_with("stat_history")
        mock_table.select.assert_called_with("*")
        mock_select.eq.assert_called_with("user_id", TEST_USER["sub"])
        mock_eq.order.assert_called_with("timestamp", desc=True)
        mock_order.limit.assert_called_with(20)
    
    def test_get_stat_history_filtered(self, mock_auth, mock_supabase):
        """Test retrieving stat history filtered by type"""
        # Mock the database response for filtered query
        mock_execute = MagicMock()
        mock_execute.data = [
            {
                "user_id": TEST_USER["sub"],
                "stat_type": "hunger",
                "previous_value": 70,
                "new_value": 60,
                "change": -10,
                "reason": "Ate lunch",
                "timestamp": "2023-07-15T10:30:00"
            }
        ]
        
        # Configure mock similar to previous test
        mock_order = MagicMock()
        mock_order.limit.return_value.execute.return_value = mock_execute
        
        mock_eq2 = MagicMock()
        mock_eq2.order.return_value = mock_order
        
        mock_eq1 = MagicMock()
        mock_eq1.eq.return_value = mock_eq2
        
        mock_select = MagicMock()
        mock_select.eq.return_value = mock_eq1
        
        mock_table = MagicMock()
        mock_table.select.return_value = mock_select
        
        mock_supabase.table.return_value = mock_table
        
        # Make the request with filter
        response = client.get("/stats/history?stat_type=hunger")
        
        # Check the response
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["stat_type"] == "hunger"
        
        # Verify the correct filter was applied
        mock_eq1.eq.assert_called_with("stat_type", "hunger") 
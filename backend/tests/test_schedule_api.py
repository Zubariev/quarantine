import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import json
from datetime import datetime, date, time, timedelta

from main import app
from app.models.game import ActivityType

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


class TestScheduleAPI:
    """Tests for the schedule API endpoints"""
    
    def test_get_schedule_existing(self, mock_auth, mock_supabase):
        """Test retrieving an existing schedule for a day"""
        # Mock the database response
        today = date.today()
        mock_execute = MagicMock()
        mock_execute.data = [{
            "user_id": TEST_USER["sub"],
            "date": today.isoformat(),
            "blocks": [
                {
                    "activity_id": "work",
                    "start_hour": 9,
                    "duration_hours": 4
                },
                {
                    "activity_id": "exercise",
                    "start_hour": 18,
                    "duration_hours": 1
                }
            ]
        }]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_execute
        
        # Make the request
        response = client.get(f"/schedule?day={today.isoformat()}")
        
        # Check the response
        assert response.status_code == 200
        assert response.json()["date"].startswith(today.isoformat())
        assert len(response.json()["blocks"]) == 2
        assert response.json()["blocks"][0]["activity_id"] == "work"
        assert response.json()["blocks"][1]["activity_id"] == "exercise"
    
    def test_get_schedule_empty(self, mock_auth, mock_supabase):
        """Test retrieving a schedule for a day with no data"""
        # Mock the empty database response
        today = date.today()
        mock_execute = MagicMock()
        mock_execute.data = []
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_execute
        
        # Make the request
        response = client.get(f"/schedule?day={today.isoformat()}")
        
        # Check the response - should return empty schedule
        assert response.status_code == 200
        assert response.json()["date"].startswith(today.isoformat())
        assert len(response.json()["blocks"]) == 0
    
    def test_get_schedule_filters_invalid_blocks(self, mock_auth, mock_supabase):
        """Test that invalid blocks are filtered out of the response"""
        # Mock the database response with some invalid blocks
        today = date.today()
        mock_execute = MagicMock()
        mock_execute.data = [{
            "user_id": TEST_USER["sub"],
            "date": today.isoformat(),
            "blocks": [
                {
                    "activity_id": "work",
                    "start_hour": 9,
                    "duration_hours": 4
                },
                {
                    # Missing start_hour
                    "activity_id": "invalid1",
                    "duration_hours": 2
                },
                {
                    # Invalid hours
                    "activity_id": "invalid2",
                    "start_hour": 25,
                    "duration_hours": 4
                },
                {
                    # Valid
                    "activity_id": "exercise",
                    "start_hour": 18,
                    "duration_hours": 1
                }
            ]
        }]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_execute
        
        # Make the request
        response = client.get(f"/schedule?day={today.isoformat()}")
        
        # Check the response - should only have valid blocks
        assert response.status_code == 200
        assert len(response.json()["blocks"]) == 2
        assert response.json()["blocks"][0]["activity_id"] == "work"
        assert response.json()["blocks"][1]["activity_id"] == "exercise"
    
    def test_save_schedule_new(self, mock_auth, mock_supabase):
        """Test saving a new schedule"""
        # Mock empty response for checking existing schedule
        empty_response = MagicMock()
        empty_response.data = []
        
        # Mock activity check response
        activity_response = MagicMock()
        activity_response.data = [{"id": "work"}, {"id": "exercise"}]
        
        # Configure mock responses
        def mock_table_selector(table_name):
            mock_table = MagicMock()
            
            if table_name == "user_schedules":
                mock_select = MagicMock()
                mock_select.eq.return_value.eq.return_value.execute.return_value = empty_response
                mock_table.select.return_value = mock_select
            elif table_name == "activities":
                mock_select = MagicMock()
                mock_select.in_.return_value.execute.return_value = activity_response
                mock_table.select.return_value = mock_select
            
            return mock_table
        
        mock_supabase.table.side_effect = mock_table_selector
        
        # Create schedule data
        today = date.today()
        schedule_data = {
            "date": datetime.combine(today, time()).isoformat(),
            "blocks": [
                {
                    "activity_id": "work",
                    "start_hour": 9,
                    "duration_hours": 4
                },
                {
                    "activity_id": "exercise",
                    "start_hour": 18,
                    "duration_hours": 1
                }
            ]
        }
        
        # Make the request
        response = client.post("/schedule", json=schedule_data)
        
        # Check the response
        assert response.status_code == 200
        assert response.json()["message"] == "Schedule saved successfully"
        
        # Verify the correct call was made to insert the schedule
        mock_supabase.table.return_value.insert.assert_called_once()
    
    def test_save_schedule_update(self, mock_auth, mock_supabase):
        """Test updating an existing schedule"""
        # Mock response for existing schedule
        existing_response = MagicMock()
        existing_response.data = [{"id": "schedule123"}]
        
        # Mock activity check response
        activity_response = MagicMock()
        activity_response.data = [{"id": "work"}, {"id": "exercise"}]
        
        # Configure mock responses
        def mock_table_selector(table_name):
            mock_table = MagicMock()
            
            if table_name == "user_schedules":
                mock_select = MagicMock()
                mock_select.eq.return_value.eq.return_value.execute.return_value = existing_response
                mock_table.select.return_value = mock_select
            elif table_name == "activities":
                mock_select = MagicMock()
                mock_select.in_.return_value.execute.return_value = activity_response
                mock_table.select.return_value = mock_select
            
            return mock_table
        
        mock_supabase.table.side_effect = mock_table_selector
        
        # Create schedule data
        today = date.today()
        schedule_data = {
            "date": datetime.combine(today, time()).isoformat(),
            "blocks": [
                {
                    "activity_id": "work",
                    "start_hour": 9,
                    "duration_hours": 4
                },
                {
                    "activity_id": "exercise",
                    "start_hour": 18,
                    "duration_hours": 1
                }
            ]
        }
        
        # Make the request
        response = client.post("/schedule", json=schedule_data)
        
        # Check the response
        assert response.status_code == 200
        assert response.json()["message"] == "Schedule saved successfully"
        
        # Verify the correct call was made to update the schedule
        mock_supabase.table.return_value.update.assert_called_once()
        mock_supabase.table.return_value.update.return_value.eq.assert_called_with("id", "schedule123")
    
    def test_save_schedule_time_conflict(self, mock_auth, mock_supabase):
        """Test saving a schedule with time conflicts"""
        # Mock activity check response
        activity_response = MagicMock()
        activity_response.data = [{"id": "work"}, {"id": "meeting"}]
        
        # Configure mock response
        mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value = activity_response
        
        # Create schedule data with conflicting blocks
        today = date.today()
        schedule_data = {
            "date": datetime.combine(today, time()).isoformat(),
            "blocks": [
                {
                    "activity_id": "work",
                    "start_hour": 9,
                    "duration_hours": 4
                },
                {
                    "activity_id": "meeting",
                    "start_hour": 11,  # Overlaps with work (9-13)
                    "duration_hours": 1
                }
            ]
        }
        
        # Make the request
        response = client.post("/schedule", json=schedule_data)
        
        # Check the response
        assert response.status_code == 400
        assert "Time conflict at hour 11" in response.json()["detail"]
    
    def test_save_schedule_invalid_activity(self, mock_auth, mock_supabase):
        """Test saving a schedule with an invalid activity ID"""
        # Mock activity check response - only one activity exists
        activity_response = MagicMock()
        activity_response.data = [{"id": "work"}]  # exercise is missing
        
        # Configure mock response
        mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value = activity_response
        
        # Create schedule data with an invalid activity
        today = date.today()
        schedule_data = {
            "date": datetime.combine(today, time()).isoformat(),
            "blocks": [
                {
                    "activity_id": "work",
                    "start_hour": 9,
                    "duration_hours": 4
                },
                {
                    "activity_id": "exercise",  # Doesn't exist
                    "start_hour": 18,
                    "duration_hours": 1
                }
            ]
        }
        
        # Make the request
        response = client.post("/schedule", json=schedule_data)
        
        # Check the response
        assert response.status_code == 400
        assert "Activities not found: exercise" in response.json()["detail"]
    
    def test_get_activities(self, mock_auth, mock_supabase):
        """Test retrieving all activities"""
        # Mock global activities response
        global_response = MagicMock()
        global_response.data = [
            {
                "id": "work",
                "name": "Work",
                "type": "work",
                "description": "Regular work",
                "duration_hours": 8,
                "stats_effects": {"money": 100, "stress": 20}
            },
            {
                "id": "exercise",
                "name": "Exercise",
                "type": "exercise",
                "description": "Physical activity",
                "duration_hours": 1,
                "stats_effects": {"health": 10, "stress": -5}
            }
        ]
        
        # Mock user activities response
        user_response = MagicMock()
        user_response.data = [
            {
                "id": "custom",
                "name": "Custom Activity",
                "type": "custom",
                "description": "User created activity",
                "duration_hours": 2,
                "stats_effects": {"tone": 5}
            }
        ]
        
        # Configure mock responses
        def mock_table_selector(table_name):
            mock_table = MagicMock()
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            
            is_null = MagicMock()
            is_null.execute.return_value = global_response
            mock_select.is_.return_value = is_null
            
            eq = MagicMock()
            eq.execute.return_value = user_response
            mock_select.eq.return_value = eq
            
            return mock_table
        
        mock_supabase.table.side_effect = mock_table_selector
        
        # Make the request
        response = client.get("/schedule/activities")
        
        # Check the response
        assert response.status_code == 200
        assert len(response.json()) == 3
        activity_ids = [a["id"] for a in response.json()]
        assert "work" in activity_ids
        assert "exercise" in activity_ids
        assert "custom" in activity_ids
    
    def test_get_activities_filtered(self, mock_auth, mock_supabase):
        """Test retrieving activities filtered by type"""
        # Mock global activities response
        global_response = MagicMock()
        global_response.data = [
            {
                "id": "work",
                "name": "Work",
                "type": "work",
                "description": "Regular work",
                "duration_hours": 8,
                "stats_effects": {"money": 100, "stress": 20}
            }
        ]
        
        # Mock empty user activities for this type
        user_response = MagicMock()
        user_response.data = []
        
        # Configure mock responses
        def mock_table_selector(table_name):
            mock_table = MagicMock()
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            
            is_null = MagicMock()
            is_null.execute.return_value = global_response
            
            eq_type = MagicMock()
            eq_type.execute.return_value = global_response
            is_null.eq.return_value = eq_type
            
            mock_select.is_.return_value = is_null
            
            eq_user = MagicMock()
            eq_user.execute.return_value = user_response
            
            eq_both = MagicMock()
            eq_both.execute.return_value = user_response
            eq_user.eq.return_value = eq_both
            
            mock_select.eq.return_value = eq_user
            
            return mock_table
        
        mock_supabase.table.side_effect = mock_table_selector
        
        # Make the request with type filter
        response = client.get("/schedule/activities?type=work")
        
        # Check the response
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["id"] == "work"
        assert response.json()[0]["type"] == "work"
    
    def test_create_custom_activity(self, mock_auth, mock_supabase):
        """Test creating a custom activity"""
        # Mock empty response for ID check
        empty_response = MagicMock()
        empty_response.data = []
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = empty_response
        
        # Create activity data
        activity_data = {
            "id": "custom1",
            "name": "My Custom Activity",
            "type": "custom",
            "description": "A custom activity",
            "duration_hours": 2,
            "stats_effects": {"health": 5, "stress": -10}
        }
        
        # Make the request
        response = client.post("/schedule/activities", json=activity_data)
        
        # Check the response
        assert response.status_code == 200
        assert response.json()["id"] == "custom1"
        assert response.json()["name"] == "My Custom Activity"
        
        # Verify the correct call was made to insert the activity
        insert_call = mock_supabase.table.return_value.insert
        insert_call.assert_called_once()
        
        # Verify user_id was added to the activity data
        args, kwargs = insert_call.call_args
        assert "user_id" in args[0]
        assert args[0]["user_id"] == TEST_USER["sub"]
    
    def test_create_custom_activity_duplicate_id(self, mock_auth, mock_supabase):
        """Test creating a custom activity with duplicate ID"""
        # Mock response for ID check - ID already exists
        existing_response = MagicMock()
        existing_response.data = [{"id": "custom1"}]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = existing_response
        
        # Create activity data
        activity_data = {
            "id": "custom1",
            "name": "My Custom Activity",
            "type": "custom",
            "description": "A custom activity",
            "duration_hours": 2,
            "stats_effects": {"health": 5, "stress": -10}
        }
        
        # Make the request
        response = client.post("/schedule/activities", json=activity_data)
        
        # Check the response
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]
    
    def test_sync_schedules(self, mock_auth, mock_supabase):
        """Test syncing schedules for multiple days"""
        # Setup date range
        start_date = date.today()
        end_date = start_date + timedelta(days=3)
        
        # Mock schedules response
        mock_execute = MagicMock()
        mock_execute.data = [
            {
                "user_id": TEST_USER["sub"],
                "date": start_date.isoformat(),
                "blocks": [
                    {
                        "activity_id": "work",
                        "start_hour": 9,
                        "duration_hours": 4
                    }
                ]
            },
            {
                "user_id": TEST_USER["sub"],
                "date": (start_date + timedelta(days=2)).isoformat(),
                "blocks": [
                    {
                        "activity_id": "exercise",
                        "start_hour": 18,
                        "duration_hours": 1
                    }
                ]
            }
        ]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = mock_execute
        
        # Make the request
        response = client.get(f"/schedule/sync?start_date={start_date.isoformat()}&end_date={end_date.isoformat()}")
        
        # Check the response
        assert response.status_code == 200
        assert "schedules" in response.json()
        assert "sync_time" in response.json()
        
        # Check that all dates in the range are included
        schedules = response.json()["schedules"]
        assert len(schedules) == 4  # 4 days in the range
        
        # Verify dates with data have blocks
        assert len(schedules[start_date.isoformat()]["blocks"]) == 1
        assert schedules[start_date.isoformat()]["blocks"][0]["activity_id"] == "work"
        
        # Verify dates without data have empty blocks
        middle_date = (start_date + timedelta(days=1)).isoformat()
        assert len(schedules[middle_date]["blocks"]) == 0 
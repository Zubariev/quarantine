import pytest
from unittest.mock import patch
import json
from datetime import datetime, date

def test_get_schedule_empty(client, mock_supabase, mock_authorized_user):
    """Test getting a schedule when none exists."""
    # Set today's date as a string for the test
    today = date.today().isoformat()
    
    response = client.get(f"/routes/schedule?day={today}")
    assert response.status_code == 200
    data = response.json()
    
    assert "date" in data
    assert "blocks" in data
    assert len(data["blocks"]) == 0

def test_get_schedule_with_blocks(client, mock_supabase, mock_authorized_user):
    """Test getting a schedule with existing blocks."""
    # Set up mock data for schedule
    today = date.today().isoformat()
    mock_schedule = {
        "id": "sched1",
        "user_id": "user123",
        "date": today,
        "blocks": [
            {
                "activity_id": "act1",
                "start_hour": 9,
                "duration_hours": 4
            },
            {
                "activity_id": "act2",
                "start_hour": 14,
                "duration_hours": 1
            }
        ]
    }
    mock_supabase.set_table_data("user_schedules", [mock_schedule])
    
    response = client.get(f"/routes/schedule?day={today}")
    assert response.status_code == 200
    data = response.json()
    
    assert "date" in data
    assert "blocks" in data
    assert len(data["blocks"]) == 2
    
    # Verify blocks data
    assert data["blocks"][0]["activity_id"] == "act1"
    assert data["blocks"][0]["start_hour"] == 9
    assert data["blocks"][0]["duration_hours"] == 4
    
    assert data["blocks"][1]["activity_id"] == "act2"
    assert data["blocks"][1]["start_hour"] == 14
    assert data["blocks"][1]["duration_hours"] == 1

def test_save_schedule_new(client, mock_supabase, mock_authorized_user):
    """Test saving a new schedule."""
    # Format date for the request body
    today = date.today().isoformat()
    today_datetime = datetime.combine(date.today(), datetime.min.time()).isoformat()
    
    schedule_data = {
        "date": today_datetime,
        "blocks": [
            {
                "activity_id": "act1",
                "start_hour": 8,
                "duration_hours": 4
            },
            {
                "activity_id": "act2",
                "start_hour": 13,
                "duration_hours": 1
            }
        ]
    }
    
    response = client.post("/routes/schedule", json=schedule_data)
    assert response.status_code == 200
    assert response.json()["message"] == "Schedule saved successfully"

def test_save_schedule_update(client, mock_supabase, mock_authorized_user):
    """Test updating an existing schedule."""
    # Set up mock data for existing schedule
    today = date.today().isoformat()
    today_datetime = datetime.combine(date.today(), datetime.min.time()).isoformat()
    
    existing_schedule = {
        "id": "sched1",
        "user_id": "user123",
        "date": today,
        "blocks": [
            {
                "activity_id": "act1",
                "start_hour": 9,
                "duration_hours": 4
            }
        ]
    }
    mock_supabase.set_table_data("user_schedules", [existing_schedule])
    
    # New schedule data to update
    update_data = {
        "date": today_datetime,
        "blocks": [
            {
                "activity_id": "act1",
                "start_hour": 8,
                "duration_hours": 3
            },
            {
                "activity_id": "act2",
                "start_hour": 14,
                "duration_hours": 2
            }
        ]
    }
    
    response = client.post("/routes/schedule", json=update_data)
    assert response.status_code == 200
    assert response.json()["message"] == "Schedule saved successfully"

def test_save_schedule_invalid_time_conflict(client, mock_supabase):
    """Test saving a schedule with time conflicts."""
    today_datetime = datetime.combine(date.today(), datetime.min.time()).isoformat()
    
    # Schedule with overlapping time slots
    schedule_data = {
        "date": today_datetime,
        "blocks": [
            {
                "activity_id": "act1",
                "start_hour": 9,
                "duration_hours": 3
            },
            {
                "activity_id": "act2",
                "start_hour": 10,  # Overlaps with previous block
                "duration_hours": 2
            }
        ]
    }
    
    response = client.post("/routes/schedule", json=schedule_data)
    assert response.status_code == 400
    assert "Time conflict" in response.json()["detail"]

def test_save_schedule_invalid_past_midnight(client, mock_supabase):
    """Test saving a schedule with a block extending past midnight."""
    today_datetime = datetime.combine(date.today(), datetime.min.time()).isoformat()
    
    # Schedule with a block extending past midnight
    schedule_data = {
        "date": today_datetime,
        "blocks": [
            {
                "activity_id": "act1",
                "start_hour": 22,
                "duration_hours": 3  # Extends to hour 25 which is invalid
            }
        ]
    }
    
    response = client.post("/routes/schedule", json=schedule_data)
    assert response.status_code == 400
    assert "extends past midnight" in response.json()["detail"]

def test_get_activities(client, mock_supabase):
    """Test getting all available activities."""
    response = client.get("/routes/schedule/activities")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 2
    assert data[0]["id"] == "act1"
    assert data[0]["name"] == "Work"
    assert data[1]["id"] == "act2"
    assert data[1]["name"] == "Exercise" 
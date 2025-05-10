import pytest
from unittest.mock import patch
import json

def test_get_stats_existing_user(client, mock_supabase):
    """Test getting stats for an existing user."""
    response = client.get("/routes/stats")
    assert response.status_code == 200
    data = response.json()
    
    assert data["hunger"] == 70
    assert data["stress"] == 30
    assert data["tone"] == 60
    assert data["health"] == 80
    assert data["money"] == 2000

def test_get_stats_new_user(client, mock_supabase, mock_authorized_user):
    """Test getting stats for a new user (should create default stats)."""
    # Change user ID to simulate a new user
    mock_authorized_user.sub = "newuser456"
    
    response = client.get("/routes/stats")
    assert response.status_code == 200
    data = response.json()
    
    # Should return default values
    assert data["hunger"] == 50
    assert data["stress"] == 50
    assert data["tone"] == 50
    assert data["health"] == 50
    assert data["money"] == 1000

def test_update_stats_valid(client, mock_supabase):
    """Test updating a stat with a valid request."""
    update_data = {
        "stat_type": "hunger",
        "value": -10,
        "reason": "Ate lunch"
    }
    
    response = client.post("/routes/stats", json=update_data)
    assert response.status_code == 200
    data = response.json()
    
    # Original hunger was 70, -10 should be 60
    assert data["hunger"] == 60

def test_update_stats_invalid_type(client):
    """Test updating a stat with an invalid stat type."""
    update_data = {
        "stat_type": "invalid_stat",
        "value": 10
    }
    
    response = client.post("/routes/stats", json=update_data)
    assert response.status_code == 400
    assert "Invalid stat type" in response.json()["detail"]

def test_update_stats_upper_limit(client, mock_supabase):
    """Test that stats stay within the upper limit (100)."""
    update_data = {
        "stat_type": "health",
        "value": 50,  # Current health is 80, +50 would be 130 which exceeds the limit
        "reason": "Health boost"
    }
    
    response = client.post("/routes/stats", json=update_data)
    assert response.status_code == 200
    data = response.json()
    
    # Health should be capped at 100
    assert data["health"] == 100

def test_update_stats_lower_limit(client, mock_supabase):
    """Test that stats stay within the lower limit (0)."""
    update_data = {
        "stat_type": "stress",
        "value": -50,  # Current stress is 30, -50 would be -20 which is below the limit
        "reason": "Deep meditation"
    }
    
    response = client.post("/routes/stats", json=update_data)
    assert response.status_code == 200
    data = response.json()
    
    # Stress should be floored at 0
    assert data["stress"] == 0

def test_update_money_negative(client, mock_supabase):
    """Test that money can't go below 0."""
    update_data = {
        "stat_type": "money",
        "value": -3000,  # Current money is 2000, -3000 would be -1000
        "reason": "Big purchase"
    }
    
    response = client.post("/routes/stats", json=update_data)
    assert response.status_code == 200
    data = response.json()
    
    # Money should be floored at 0
    assert data["money"] == 0 
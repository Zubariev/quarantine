import requests
import unittest
import os
import json

class QuarantineGameAPITest(unittest.TestCase):
    """Test suite for the Quarantine Tamagotchi Game API"""
    
    def setUp(self):
        """Set up test environment before each test method"""
        # Get the backend URL from environment or use default
        self.base_url = "https://8a170850-0704-4f73-a900-38d3611a115f.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        print(f"Testing API at: {self.api_url}")
    
    def test_api_health(self):
        """Test the API health endpoint"""
        try:
            response = requests.get(f"{self.api_url}/health")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["status"], "ok")
            print("✅ API health check passed")
        except Exception as e:
            print(f"❌ API health check failed: {str(e)}")
            raise
    
    def test_get_game_state(self):
        """Test retrieving the game state"""
        try:
            response = requests.get(f"{self.api_url}/game")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            # Check if the response contains expected fields
            self.assertIn("stats", data)
            self.assertIn("currentActivity", data)
            self.assertIn("gameTime", data)
            print("✅ Get game state test passed")
        except Exception as e:
            print(f"❌ Get game state test failed: {str(e)}")
            raise
    
    def test_update_game_state(self):
        """Test updating the game state"""
        try:
            # First get the current state
            get_response = requests.get(f"{self.api_url}/game")
            self.assertEqual(get_response.status_code, 200)
            current_state = get_response.json()
            
            # Prepare update data
            update_data = {
                "stats": {
                    "hunger": 60,
                    "stress": 30,
                    "tone": 70,
                    "health": 80,
                    "money": 100
                },
                "currentActivity": "work",
                "gameTime": {
                    "day": 2,
                    "hour": 10
                }
            }
            
            # Update the game state
            update_response = requests.post(
                f"{self.api_url}/game", 
                json=update_data
            )
            
            # Check response
            self.assertEqual(update_response.status_code, 200)
            updated_state = update_response.json()
            
            # Verify the state was updated
            self.assertEqual(updated_state["stats"]["hunger"], 60)
            self.assertEqual(updated_state["currentActivity"], "work")
            self.assertEqual(updated_state["gameTime"]["day"], 2)
            
            print("✅ Update game state test passed")
        except Exception as e:
            print(f"❌ Update game state test failed: {str(e)}")
            raise
    
    def test_reset_game(self):
        """Test resetting the game state"""
        try:
            # Reset the game
            reset_response = requests.post(f"{self.api_url}/reset")
            self.assertEqual(reset_response.status_code, 200)
            reset_state = reset_response.json()
            
            # Verify the state was reset to initial values
            self.assertEqual(reset_state["stats"]["hunger"], 70)  # Initial value
            self.assertEqual(reset_state["stats"]["stress"], 20)  # Initial value
            self.assertEqual(reset_state["currentActivity"], "idle")
            self.assertEqual(reset_state["gameTime"]["day"], 1)
            self.assertEqual(reset_state["gameTime"]["hour"], 0)
            
            print("✅ Reset game test passed")
        except Exception as e:
            print(f"❌ Reset game test failed: {str(e)}")
            raise

if __name__ == "__main__":
    print("Starting Quarantine Tamagotchi Game API Tests...")
    unittest.main(verbosity=2)
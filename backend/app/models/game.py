from pydantic import BaseModel, Field, conint, conlist, validator
from typing import List, Optional, Dict, Any, Union
from enum import Enum
from datetime import datetime

# Stats models
class StatType(str, Enum):
    HUNGER = "hunger"
    STRESS = "stress"
    TONE = "tone"
    HEALTH = "health"
    MONEY = "money"

class Stats(BaseModel):
    """Model representing a user's game stats"""
    hunger: int = Field(50, ge=0, le=100, description="Character's hunger level (0-100)")
    stress: int = Field(50, ge=0, le=100, description="Character's stress level (0-100)")
    tone: int = Field(50, ge=0, le=100, description="Character's muscle tone (0-100)")
    health: int = Field(50, ge=0, le=100, description="Character's overall health (0-100)")
    money: int = Field(1000, ge=0, description="Character's money in game currency")

class StatUpdate(BaseModel):
    """Model for updating a specific stat"""
    stat_type: StatType = Field(..., description="The type of stat to update")
    value: int = Field(..., description="The amount to change the stat (positive or negative)")
    reason: str = Field(..., description="The reason for the stat change")
    
    @validator('value')
    def validate_value(cls, v):
        # Prevent extreme value changes
        if abs(v) > 100:
            raise ValueError("Stat change cannot exceed 100 points")
        return v

# Schedule models
class TimeSlot(str, Enum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"
    NIGHT = "night"

class ActivityType(str, Enum):
    WORK = "work"
    EXERCISE = "exercise"
    LEISURE = "leisure"
    REST = "rest"
    SOCIAL = "social"
    COOKING = "cooking"
    CLEANING = "cleaning"
    EDUCATION = "education"
    CUSTOM = "custom"

class Activity(BaseModel):
    """Model representing an activity that can be scheduled"""
    id: str = Field(..., description="Unique identifier for the activity")
    type: ActivityType = Field(..., description="The type of activity")
    name: str = Field(..., description="Display name for the activity")
    description: str = Field(..., description="Description of the activity")
    duration_hours: int = Field(..., ge=1, le=24, description="Default duration in hours")
    stats_effects: Dict[str, int] = Field(..., description="Effects on stats when activity is completed")
    icon: Optional[str] = Field(None, description="Icon to display for this activity")
    color: Optional[str] = Field(None, description="Color associated with this activity")

class ScheduleBlock(BaseModel):
    """Model representing a scheduled activity block"""
    activity_id: str = Field(..., description="ID of the activity to schedule")
    start_hour: int = Field(..., ge=0, le=23, description="Start hour (0-23)")
    duration_hours: int = Field(..., ge=1, le=24, description="Duration in hours")

class DaySchedule(BaseModel):
    """Model representing a day's schedule"""
    date: datetime = Field(..., description="The date for this schedule")
    blocks: List[ScheduleBlock] = Field([], description="Scheduled activity blocks")

# Shop models
class ItemCategory(str, Enum):
    FOOD = "food"
    FURNITURE = "furniture"
    PLANT = "plant"
    COURSE = "course"
    ENTERTAINMENT = "entertainment"
    THEME = "theme"
    BOOST = "boost"

class PurchaseType(str, Enum):
    IN_GAME = "in_game"
    REAL_MONEY = "real_money"

class ShopItem(BaseModel):
    """Model representing an item available for purchase"""
    id: str = Field(..., description="Unique identifier for the item")
    name: str = Field(..., description="Display name of the item")
    description: str = Field(..., description="Description of the item")
    category: ItemCategory = Field(..., description="Category of the item")
    price: int = Field(..., gt=0, description="Price in game currency or cents for real money")
    purchase_type: PurchaseType = Field(..., description="Type of purchase (in-game or real money)")
    stats_effects: Optional[Dict[str, int]] = Field(None, description="Effects on stats when item is used")
    image_url: Optional[str] = Field(None, description="URL to item image")
    usable: bool = Field(True, description="Whether the item can be used or is decorative only")
    limited_use: Optional[int] = Field(None, description="Number of times the item can be used (null for unlimited)")

class PurchaseRequest(BaseModel):
    """Model for purchasing an item"""
    item_id: str = Field(..., description="ID of the item to purchase")
    quantity: int = Field(1, gt=0, description="Quantity to purchase")
    payment_method_id: Optional[str] = Field(None, description="Stripe payment method ID for real money purchases")

class InventoryItem(BaseModel):
    """Model representing an item in user's inventory"""
    item_id: str = Field(..., description="ID of the item")
    quantity: int = Field(..., gt=0, description="Quantity of the item")
    purchased_at: datetime = Field(..., description="When the item was purchased")
    uses_remaining: Optional[int] = Field(None, description="Remaining uses for limited-use items")

class UseItemRequest(BaseModel):
    """Model for using an item from inventory"""
    item_id: str = Field(..., description="ID of the item to use")
    quantity: int = Field(1, gt=0, description="Quantity to use")

class ErrorResponse(BaseModel):
    """Model for API error responses"""
    detail: str = Field(..., description="Error message detail")

class SuccessResponse(BaseModel):
    """Model for API success responses"""
    message: str = Field(..., description="Success message")
    data: Optional[Dict] = Field(None, description="Additional response data")

class GameEvent(BaseModel):
    """Model for random game events"""
    id: str = Field(..., description="Unique event identifier")
    title: str = Field(..., description="Event title")
    description: str = Field(..., description="Event description")
    options: List[Dict[str, Union[str, Dict[str, int]]]] = Field(..., description="Event response options")
    probability: float = Field(0.1, ge=0, le=1, description="Probability of this event occurring")
    triggers: Optional[Dict[str, int]] = Field(None, description="Stat thresholds that trigger this event")

class UserProfile(BaseModel):
    """Model for user profile data"""
    user_id: str = Field(..., description="User's unique identifier")
    character_name: str = Field(..., description="Character name")
    avatar_url: Optional[str] = Field(None, description="URL to user avatar image")
    created_at: datetime = Field(..., description="When the profile was created")
    last_login: datetime = Field(..., description="When the user last logged in")
    streak_days: int = Field(0, ge=0, description="Consecutive days logged in")
    total_play_time: int = Field(0, ge=0, description="Total play time in minutes")
    achievements: List[str] = Field([], description="List of achievement IDs") 
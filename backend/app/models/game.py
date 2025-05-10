from pydantic import BaseModel, Field, conint, conlist
from typing import List, Optional, Dict, Any
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
    hunger: int = Field(..., ge=0, le=100)
    stress: int = Field(..., ge=0, le=100)
    tone: int = Field(..., ge=0, le=100)
    health: int = Field(..., ge=0, le=100)
    money: int = Field(..., ge=0)

class StatUpdate(BaseModel):
    stat_type: StatType
    value: int
    reason: Optional[str] = None

# Schedule models
class TimeSlot(str, Enum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"
    NIGHT = "night"

class ActivityType(str, Enum):
    WORK = "work"
    EXERCISE = "exercise"
    SOCIAL = "social"
    REST = "rest"
    STUDY = "study"
    EAT = "eat"
    SHOPPING = "shopping"

class Activity(BaseModel):
    id: str
    type: ActivityType
    name: str
    description: Optional[str] = None
    duration_hours: conint(ge=1, le=4) = 1
    stats_effects: Dict[StatType, int] = {}

class ScheduleBlock(BaseModel):
    activity_id: str
    start_hour: conint(ge=0, le=23)
    duration_hours: conint(ge=1, le=4) = 1

class DaySchedule(BaseModel):
    date: datetime
    blocks: List[ScheduleBlock] = []

# Shop models
class ItemCategory(str, Enum):
    COURSE = "course"
    PLANT = "plant"
    FOOD = "food"
    ENTERTAINMENT = "entertainment"
    FURNITURE = "furniture"
    CLOTHING = "clothing"

class PurchaseType(str, Enum):
    IN_GAME = "in_game"
    REAL_MONEY = "real_money"

class ShopItem(BaseModel):
    id: str
    name: str
    description: str
    category: ItemCategory
    price: int
    purchase_type: PurchaseType
    image_url: Optional[str] = None
    stats_effects: Dict[StatType, int] = {}

class PurchaseRequest(BaseModel):
    item_id: str
    quantity: conint(ge=1) = 1
    payment_method_id: Optional[str] = None

class InventoryItem(BaseModel):
    item_id: str
    quantity: int
    purchased_at: datetime 
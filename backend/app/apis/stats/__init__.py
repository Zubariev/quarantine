from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.auth import AuthorizedUser
from app.db.supabase import get_supabase_client
from app.models.game import Stats, StatUpdate, StatType

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("")
async def get_stats(user: AuthorizedUser):
    """
    Get the current stats for the authenticated user.
    """
    supabase = get_supabase_client()
    
    # Query user stats from the database
    response = supabase.table("user_stats").select("*").eq("user_id", user.sub).execute()
    
    if response.data:
        # Return existing stats
        stats_data = response.data[0]
        return Stats(
            hunger=stats_data.get("hunger", 50),
            stress=stats_data.get("stress", 50),
            tone=stats_data.get("tone", 50),
            health=stats_data.get("health", 50),
            money=stats_data.get("money", 1000)
        )
    else:
        # Create default stats for new user
        default_stats = Stats(hunger=50, stress=50, tone=50, health=50, money=1000)
        
        supabase.table("user_stats").insert({
            "user_id": user.sub,
            "hunger": default_stats.hunger,
            "stress": default_stats.stress,
            "tone": default_stats.tone,
            "health": default_stats.health,
            "money": default_stats.money
        }).execute()
        
        return default_stats

@router.post("")
async def update_stats(update: StatUpdate, user: AuthorizedUser):
    """
    Update a specific stat for the authenticated user.
    """
    if update.stat_type not in StatType.__members__.values():
        raise HTTPException(status_code=400, detail=f"Invalid stat type: {update.stat_type}")
    
    supabase = get_supabase_client()
    
    # Get current stats
    response = supabase.table("user_stats").select("*").eq("user_id", user.sub).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="User stats not found")
    
    current_stats = response.data[0]
    
    # Update the specific stat
    stat_name = update.stat_type.value
    current_value = current_stats.get(stat_name, 0)
    new_value = current_value + update.value
    
    # Enforce limits for certain stats (0-100)
    if stat_name in ["hunger", "stress", "tone", "health"]:
        new_value = max(0, min(100, new_value))
    
    # Money can't go below 0
    if stat_name == "money":
        new_value = max(0, new_value)
    
    # Update the database
    supabase.table("user_stats").update({
        stat_name: new_value
    }).eq("user_id", user.sub).execute()
    
    # Record stat change in history
    supabase.table("stat_history").insert({
        "user_id": user.sub,
        "stat_type": stat_name,
        "previous_value": current_value,
        "new_value": new_value,
        "change": update.value,
        "reason": update.reason
    }).execute()
    
    # Return the updated stat
    return {stat_name: new_value} 
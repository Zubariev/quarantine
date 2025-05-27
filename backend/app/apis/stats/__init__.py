from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from app.auth import AuthorizedUser
from app.db.supabase import get_supabase_client
from app.models.game import Stats, StatUpdate, StatType, SuccessResponse, ErrorResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("", response_model=Stats)
async def get_stats(user: AuthorizedUser):
    """
    Get the current stats for the authenticated user.
    
    Returns a Stats object with hunger, stress, tone, health, and money values.
    Creates default stats for new users.
    """
    supabase = get_supabase_client()
    
    try:
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
            default_stats = Stats()
            
            try:
                supabase.table("user_stats").insert({
                    "user_id": user.sub,
                    "hunger": default_stats.hunger,
                    "stress": default_stats.stress,
                    "tone": default_stats.tone,
                    "health": default_stats.health,
                    "money": default_stats.money
                }).execute()
            except Exception as e:
                logger.error(f"Failed to create default stats: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create default stats"
                )
            
            return default_stats
    except Exception as e:
        logger.error(f"Database error in get_stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving stats"
        )

@router.post("", response_model=Dict[str, Any])
async def update_stats(update: StatUpdate, user: AuthorizedUser):
    """
    Update a specific stat for the authenticated user.
    
    Enforces limits (0-100) for hunger, stress, tone, and health.
    Ensures money doesn't go below 0.
    Records stat changes in history.
    """
    if update.stat_type not in StatType.__members__.values():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Invalid stat type: {update.stat_type}"
        )
    
    supabase = get_supabase_client()
    
    try:
        # Get current stats
        response = supabase.table("user_stats").select("*").eq("user_id", user.sub).execute()
        
        if not response.data:
            # Auto-create stats if they don't exist
            default_stats = Stats()
            
            supabase.table("user_stats").insert({
                "user_id": user.sub,
                "hunger": default_stats.hunger,
                "stress": default_stats.stress,
                "tone": default_stats.tone,
                "health": default_stats.health,
                "money": default_stats.money
            }).execute()
            
            current_stats = {
                "hunger": default_stats.hunger,
                "stress": default_stats.stress,
                "tone": default_stats.tone, 
                "health": default_stats.health,
                "money": default_stats.money
            }
        else:
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
        try:
            supabase.table("stat_history").insert({
                "user_id": user.sub,
                "stat_type": stat_name,
                "previous_value": current_value,
                "new_value": new_value,
                "change": update.value,
                "reason": update.reason,
                "timestamp": datetime.now().isoformat()
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to record stat history: {str(e)}")
            # Continue execution, this is non-critical
        
        # Return the updated stat
        return {stat_name: new_value}
    
    except Exception as e:
        logger.error(f"Database error in update_stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating stats"
        )

@router.post("/activity", response_model=Dict[str, Any])
async def apply_activity_effects(
    activity_id: str = Query(..., description="ID of the activity to apply"),
    user: AuthorizedUser = Depends()
):
    """
    Apply the effects of an activity to the user's stats.
    
    Retrieves the activity from the database, applies all stat effects,
    and records the changes in history.
    """
    supabase = get_supabase_client()
    
    try:
        # Get the activity
        activity_response = supabase.table("activities").select("*").eq("id", activity_id).execute()
        
        if not activity_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Activity with ID {activity_id} not found"
            )
        
        activity = activity_response.data[0]
        stats_effects = activity.get("stats_effects", {})
        
        if not stats_effects:
            return {"message": "Activity has no effects on stats"}
        
        # Get current stats
        stats_response = supabase.table("user_stats").select("*").eq("user_id", user.sub).execute()
        
        if not stats_response.data:
            # Auto-create stats if they don't exist
            default_stats = Stats()
            
            supabase.table("user_stats").insert({
                "user_id": user.sub,
                "hunger": default_stats.hunger,
                "stress": default_stats.stress,
                "tone": default_stats.tone,
                "health": default_stats.health,
                "money": default_stats.money
            }).execute()
            
            current_stats = {
                "hunger": default_stats.hunger,
                "stress": default_stats.stress,
                "tone": default_stats.tone,
                "health": default_stats.health,
                "money": default_stats.money
            }
        else:
            current_stats = stats_response.data[0]
        
        # Apply all stats effects
        updates = {}
        history_entries = []
        timestamp = datetime.now().isoformat()
        
        for stat_name, change in stats_effects.items():
            if stat_name not in ["hunger", "stress", "tone", "health", "money"]:
                continue
                
            current_value = current_stats.get(stat_name, 0)
            new_value = current_value + change
            
            # Enforce limits
            if stat_name in ["hunger", "stress", "tone", "health"]:
                new_value = max(0, min(100, new_value))
            
            if stat_name == "money":
                new_value = max(0, new_value)
            
            updates[stat_name] = new_value
            
            # Prepare history entry
            history_entries.append({
                "user_id": user.sub,
                "stat_type": stat_name,
                "previous_value": current_value,
                "new_value": new_value,
                "change": change,
                "reason": f"Activity: {activity.get('name', activity_id)}",
                "timestamp": timestamp
            })
        
        # Update stats in database
        if updates:
            supabase.table("user_stats").update(updates).eq("user_id", user.sub).execute()
        
        # Record history
        if history_entries:
            supabase.table("stat_history").insert(history_entries).execute()
        
        return {
            "message": "Activity effects applied",
            "updates": updates
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying activity effects: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error applying activity effects"
        )

@router.get("/history", response_model=List[Dict[str, Any]])
async def get_stat_history(
    stat_type: Optional[StatType] = Query(None, description="Filter by stat type"),
    limit: int = Query(20, ge=1, le=100, description="Number of history entries to return"),
    user: AuthorizedUser = Depends()
):
    """
    Get history of stat changes for the authenticated user.
    
    Can be filtered by stat type and limited to a certain number of entries.
    Returns entries sorted by timestamp (newest first).
    """
    supabase = get_supabase_client()
    
    try:
        query = supabase.table("stat_history").select("*").eq("user_id", user.sub)
        
        if stat_type:
            query = query.eq("stat_type", stat_type.value)
        
        query = query.order("timestamp", desc=True).limit(limit)
        
        response = query.execute()
        
        return response.data
        
    except Exception as e:
        logger.error(f"Error retrieving stat history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving stat history"
        ) 
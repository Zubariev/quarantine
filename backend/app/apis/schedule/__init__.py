from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, date

from app.auth import AuthorizedUser
from app.db.supabase import get_supabase_client
from app.models.game import DaySchedule, ScheduleBlock, Activity

router = APIRouter(prefix="/schedule", tags=["schedule"])

@router.get("")
async def get_schedule(
    day: Optional[date] = Query(None, description="Date to get schedule for (defaults to today)"),
    user: AuthorizedUser = Depends()
):
    """
    Get the schedule for a specific day (defaults to current day).
    """
    # Default to today if no date provided
    if day is None:
        day = date.today()
    
    supabase = get_supabase_client()
    
    # Format date to string for database query (YYYY-MM-DD)
    day_str = day.isoformat()
    
    # Get schedule for the specified day
    response = supabase.table("user_schedules") \
        .select("*") \
        .eq("user_id", user.sub) \
        .eq("date", day_str) \
        .execute()
    
    if not response.data:
        # No schedule found, return empty schedule
        return DaySchedule(
            date=datetime.combine(day, datetime.min.time()),
            blocks=[]
        )
    
    # Convert from DB format to API response format
    schedule_data = response.data[0]
    blocks = schedule_data.get("blocks", [])
    
    return DaySchedule(
        date=datetime.combine(day, datetime.min.time()),
        blocks=[ScheduleBlock(**block) for block in blocks]
    )

@router.post("")
async def save_schedule(schedule: DaySchedule, user: AuthorizedUser = Depends()):
    """
    Save or update the schedule for a specific day.
    """
    supabase = get_supabase_client()
    
    # Validate schedule blocks
    if schedule.blocks:
        # Ensure there are no time conflicts in the schedule
        hour_occupancy = [False] * 24
        
        for block in schedule.blocks:
            for hour in range(block.start_hour, block.start_hour + block.duration_hours):
                if hour >= 24:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Invalid block: extends past midnight (starts at {block.start_hour}, duration {block.duration_hours})"
                    )
                
                if hour_occupancy[hour]:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Time conflict at hour {hour}"
                    )
                
                hour_occupancy[hour] = True
        
        # Verify activities exist
        activity_ids = [block.activity_id for block in schedule.blocks]
        
        for activity_id in activity_ids:
            activity_response = supabase.table("activities") \
                .select("id") \
                .eq("id", activity_id) \
                .execute()
            
            if not activity_response.data:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Activity with ID {activity_id} not found"
                )
    
    # Format date to string for database (YYYY-MM-DD)
    day_str = schedule.date.date().isoformat()
    
    # Check if a schedule for this day already exists
    existing = supabase.table("user_schedules") \
        .select("id") \
        .eq("user_id", user.sub) \
        .eq("date", day_str) \
        .execute()
    
    schedule_data = {
        "user_id": user.sub,
        "date": day_str,
        "blocks": [block.dict() for block in schedule.blocks]
    }
    
    if existing.data:
        # Update existing schedule
        supabase.table("user_schedules") \
            .update(schedule_data) \
            .eq("id", existing.data[0]["id"]) \
            .execute()
    else:
        # Create new schedule
        supabase.table("user_schedules") \
            .insert(schedule_data) \
            .execute()
    
    return {"message": "Schedule saved successfully"}

@router.get("/activities")
async def get_activities(user: AuthorizedUser = Depends()):
    """
    Get all available activities that can be scheduled.
    """
    supabase = get_supabase_client()
    
    # Get global activities and user's custom activities
    global_activities = supabase.table("activities") \
        .select("*") \
        .is_("user_id", "null") \
        .execute()
    
    user_activities = supabase.table("activities") \
        .select("*") \
        .eq("user_id", user.sub) \
        .execute()
    
    all_activities = global_activities.data + user_activities.data
    
    return [Activity(**activity) for activity in all_activities] 
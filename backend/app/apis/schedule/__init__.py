from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime, date, timedelta

from app.auth import AuthorizedUser
from app.db.supabase import get_supabase_client
from app.models.game import DaySchedule, ScheduleBlock, Activity, ActivityType, SuccessResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/schedule", tags=["schedule"])

@router.get("", response_model=DaySchedule)
async def get_schedule(
    day: Optional[date] = Query(None, description="Date to get schedule for (defaults to today)"),
    user: AuthorizedUser = Depends()
):
    """
    Get the schedule for a specific day (defaults to current day).
    
    Returns a DaySchedule object with the date and activity blocks.
    If no schedule exists, returns an empty schedule.
    """
    # Default to today if no date provided
    if day is None:
        day = date.today()
    
    supabase = get_supabase_client()
    
    try:
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
        
        # Validate blocks from database to ensure they're properly formatted
        valid_blocks = []
        for block in blocks:
            try:
                # Filter out invalid blocks silently to avoid breaking the UI
                if not all(k in block for k in ["activity_id", "start_hour", "duration_hours"]):
                    logger.warning(f"Invalid block format in database: {block}")
                    continue
                    
                # Ensure numeric values are integers
                block["start_hour"] = int(block.get("start_hour", 0))
                block["duration_hours"] = int(block.get("duration_hours", 0))
                
                # Add to valid blocks if it passes basic validation
                if 0 <= block["start_hour"] < 24 and 1 <= block["duration_hours"] <= 24:
                    valid_blocks.append(ScheduleBlock(**block))
                else:
                    logger.warning(f"Block has invalid hour values: {block}")
            except Exception as e:
                logger.warning(f"Error parsing schedule block: {str(e)}")
        
        return DaySchedule(
            date=datetime.combine(day, datetime.min.time()),
            blocks=valid_blocks
        )
    
    except Exception as e:
        logger.error(f"Error retrieving schedule: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving schedule"
        )

@router.post("", response_model=SuccessResponse)
async def save_schedule(schedule: DaySchedule, user: AuthorizedUser = Depends()):
    """
    Save or update the schedule for a specific day.
    
    Validates blocks for time conflicts and valid activity IDs.
    Updates or creates the schedule in the database.
    """
    supabase = get_supabase_client()
    
    try:
        # Validate schedule blocks
        if schedule.blocks:
            # Ensure there are no time conflicts in the schedule
            hour_occupancy = [False] * 24
            
            for block in schedule.blocks:
                if block.start_hour < 0 or block.start_hour >= 24:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid start hour: {block.start_hour}. Must be between 0 and 23."
                    )
                
                if block.duration_hours < 1 or block.duration_hours > 24:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid duration: {block.duration_hours}. Must be between 1 and 24."
                    )
                
                for hour in range(block.start_hour, block.start_hour + block.duration_hours):
                    if hour >= 24:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST, 
                            detail=f"Invalid block: extends past midnight (starts at {block.start_hour}, duration {block.duration_hours})"
                        )
                    
                    if hour_occupancy[hour]:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST, 
                            detail=f"Time conflict at hour {hour}"
                        )
                    
                    hour_occupancy[hour] = True
            
            # Get all valid activity IDs in one query
            activity_ids = {block.activity_id for block in schedule.blocks}
            activity_response = supabase.table("activities") \
                .select("id") \
                .in_("id", list(activity_ids)) \
                .execute()
            
            found_ids = {activity["id"] for activity in activity_response.data}
            missing_ids = activity_ids - found_ids
            
            if missing_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail=f"Activities not found: {', '.join(missing_ids)}"
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
            "blocks": [block.dict() for block in schedule.blocks],
            "last_updated": datetime.now().isoformat()
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
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving schedule: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error saving schedule"
        )

@router.get("/activities", response_model=List[Activity])
async def get_activities(
    type: Optional[ActivityType] = Query(None, description="Filter activities by type"),
    user: AuthorizedUser = Depends()
):
    """
    Get all available activities that can be scheduled.
    
    Returns both global activities and user's custom activities.
    Can be filtered by activity type.
    """
    supabase = get_supabase_client()
    
    try:
        # Build query for global activities (no user_id)
        global_query = supabase.table("activities").select("*").is_("user_id", "null")
        
        # Add type filter if provided
        if type:
            global_query = global_query.eq("type", type.value)
        
        # Get global activities    
        global_activities = global_query.execute()
        
        # Build query for user's custom activities
        user_query = supabase.table("activities").select("*").eq("user_id", user.sub)
        
        # Add type filter if provided
        if type:
            user_query = user_query.eq("type", type.value)
            
        # Get user's custom activities
        user_activities = user_query.execute()
        
        # Combine results
        all_activities = (global_activities.data or []) + (user_activities.data or [])
        
        # Parse into Activity models
        result = []
        for activity_data in all_activities:
            try:
                # Basic validation to avoid UI issues
                if "id" not in activity_data or "name" not in activity_data:
                    logger.warning(f"Activity missing required fields: {activity_data}")
                    continue
                
                # Set reasonable defaults for missing fields
                if "type" not in activity_data:
                    activity_data["type"] = ActivityType.CUSTOM.value
                
                if "description" not in activity_data:
                    activity_data["description"] = f"Activity: {activity_data['name']}"
                    
                if "duration_hours" not in activity_data:
                    activity_data["duration_hours"] = 1
                
                if "stats_effects" not in activity_data:
                    activity_data["stats_effects"] = {}
                
                # Create activity model
                activity = Activity(**activity_data)
                result.append(activity)
            except Exception as e:
                logger.warning(f"Error parsing activity: {str(e)}")
        
        return result
    
    except Exception as e:
        logger.error(f"Error retrieving activities: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving activities"
        )

@router.post("/activities", response_model=Activity)
async def create_custom_activity(activity: Activity, user: AuthorizedUser = Depends()):
    """
    Create a custom activity that can be used in schedules.
    
    Only the authenticated user will see their custom activities.
    """
    supabase = get_supabase_client()
    
    try:
        # Check if an activity with this ID already exists
        existing = supabase.table("activities") \
            .select("id") \
            .eq("id", activity.id) \
            .execute()
        
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Activity with ID {activity.id} already exists"
            )
        
        # Create the activity with the user's ID
        activity_data = activity.dict()
        activity_data["user_id"] = user.sub
        
        supabase.table("activities").insert(activity_data).execute()
        
        return activity
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating activity: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating activity"
        )

@router.get("/sync", response_model=Dict[str, Any])
async def sync_schedules(
    start_date: date = Query(..., description="Start date for sync period"),
    end_date: date = Query(..., description="End date for sync period"),
    user: AuthorizedUser = Depends()
):
    """
    Sync multiple days of schedules at once.
    
    Used to efficiently load schedules for a range of dates.
    """
    supabase = get_supabase_client()
    
    try:
        if (end_date - start_date).days > 30:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date range cannot exceed 30 days"
            )
        
        # Format dates for database queries
        start_str = start_date.isoformat()
        end_str = end_date.isoformat()
        
        # Get all schedules in the date range
        response = supabase.table("user_schedules") \
            .select("*") \
            .eq("user_id", user.sub) \
            .gte("date", start_str) \
            .lte("date", end_str) \
            .execute()
        
        # Organize results by date
        schedules_by_date = {}
        
        # Create date range
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.isoformat()
            schedules_by_date[date_str] = {
                "date": datetime.combine(current_date, datetime.min.time()).isoformat(),
                "blocks": []
            }
            current_date += timedelta(days=1)
        
        # Fill in actual schedule data where it exists
        for schedule in response.data:
            date_str = schedule.get("date")
            if date_str in schedules_by_date:
                blocks = schedule.get("blocks", [])
                # Validate blocks similar to get_schedule
                valid_blocks = []
                for block in blocks:
                    try:
                        if all(k in block for k in ["activity_id", "start_hour", "duration_hours"]):
                            block["start_hour"] = int(block.get("start_hour", 0))
                            block["duration_hours"] = int(block.get("duration_hours", 0))
                            
                            if 0 <= block["start_hour"] < 24 and 1 <= block["duration_hours"] <= 24:
                                valid_blocks.append(block)
                    except Exception:
                        pass
                
                schedules_by_date[date_str]["blocks"] = valid_blocks
        
        return {
            "schedules": schedules_by_date,
            "sync_time": datetime.now().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing schedules: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error syncing schedules"
        ) 
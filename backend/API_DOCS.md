# Game API Documentation

This document provides details on the core game API endpoints.

## API Documentation with OpenAPI

The API is fully documented using the OpenAPI specification (formerly known as Swagger). When the server is running, you can access the interactive documentation at:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
  - Interactive documentation that allows you to try out API endpoints directly
  - Shows request/response schemas, example values, and descriptions
  - Supports authentication testing

- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
  - More readable documentation with a three-panel layout
  - Better for exploring the API structure

- **Raw OpenAPI JSON**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)
  - Machine-readable API specification
  - Can be imported into API tools like Postman or Insomnia

### Using Swagger UI

1. Navigate to [http://localhost:8000/docs](http://localhost:8000/docs) when the server is running
2. Click on the "Authorize" button to add your JWT token
3. Expand any endpoint to see details and try it out
4. Fill in parameters and request body as needed
5. Click "Execute" to make a real API call and see the response

### Generating Client Code

The OpenAPI specification can be used to generate client code for various programming languages:

```bash
# Install the OpenAPI Generator
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript client
openapi-generator-cli generate -i http://localhost:8000/openapi.json -g typescript-fetch -o ./client

# Generate Python client
openapi-generator-cli generate -i http://localhost:8000/openapi.json -g python -o ./python-client
```

## Stats API

### GET /stats

Get the current stats for the authenticated user.

**Response:**
```json
{
  "hunger": 70,
  "stress": 30,
  "tone": 60,
  "health": 80,
  "money": 2000
}
```

### POST /stats

Update a specific stat for the authenticated user.

**Request Body:**
```json
{
  "stat_type": "hunger",
  "value": -10,
  "reason": "Ate lunch"
}
```

**Response:**
```json
{
  "hunger": 60
}
```

## Schedule API

### GET /schedule

Get the schedule for a specific day (defaults to current day).

**Query Parameters:**
- `day` (optional): Date to get schedule for in ISO format (YYYY-MM-DD)

**Response:**
```json
{
  "date": "2023-07-15T00:00:00",
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
```

### POST /schedule

Save or update the schedule for a specific day.

**Request Body:**
```json
{
  "date": "2023-07-15T00:00:00",
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
```

**Response:**
```json
{
  "message": "Schedule saved successfully"
}
```

### GET /schedule/activities

Get all available activities that can be scheduled.

**Response:**
```json
[
  {
    "id": "act1",
    "type": "work",
    "name": "Work",
    "description": "Regular work day",
    "duration_hours": 4,
    "stats_effects": {
      "hunger": -10,
      "stress": 20,
      "money": 100
    }
  },
  {
    "id": "act2",
    "type": "exercise",
    "name": "Exercise",
    "description": "Gym workout",
    "duration_hours": 1,
    "stats_effects": {
      "health": 10,
      "stress": -10,
      "hunger": -5
    }
  }
]
```

## Shop API

### GET /shop

Get all items available in the shop, optionally filtered by category.

**Query Parameters:**
- `category` (optional): Filter items by category

**Response:**
```json
[
  {
    "id": "item1",
    "name": "Online Course: Programming",
    "description": "Learn to code",
    "category": "course",
    "price": 200,
    "purchase_type": "in_game",
    "stats_effects": {
      "stress": 5,
      "tone": 10
    }
  },
  {
    "id": "item2",
    "name": "Plant: Cactus",
    "description": "A small cactus plant",
    "category": "plant",
    "price": 50,
    "purchase_type": "in_game",
    "stats_effects": {
      "stress": -5
    }
  }
]
```

### GET /shop/inventory

Get the user's inventory of purchased items.

**Response:**
```json
[
  {
    "item_id": "item1",
    "quantity": 2,
    "purchased_at": "2023-07-15T10:30:00",
    "item_details": {
      "id": "item1",
      "name": "Online Course: Programming",
      "description": "Learn to code",
      "category": "course",
      "price": 200,
      "purchase_type": "in_game",
      "stats_effects": {
        "stress": 5,
        "tone": 10
      }
    }
  }
]
```

### POST /shop/purchase

Purchase an item from the shop.

**Request Body:**
```json
{
  "item_id": "item2",
  "quantity": 1
}
```

**Response:**
```json
{
  "message": "Purchase successful"
}
```

### POST /shop/use/{item_id}

Use an item from the user's inventory.

**URL Parameters:**
- `item_id`: ID of the item to use

**Response:**
```json
{
  "message": "Item used successfully",
  "effects": {
    "stress": -5
  },
  "remaining_quantity": 1
}
```

## API Security and Best Practices

### Authentication and Authorization

All API endpoints (except for public health checks and documentation) require authentication via JWT Bearer tokens. The `AuthorizedUser` dependency enforces this requirement and extracts the user ID for database queries.

### Supabase Integration

The API uses Supabase for data storage and retrieval. The following measures ensure proper handling of edge cases:

#### Error Handling

All database operations include proper error handling to prevent application crashes:

```python
try:
    response = supabase.table("user_stats").select("*").eq("user_id", user.sub).execute()
    # Process response
except Exception as e:
    # Log error
    logger.error(f"Database error: {str(e)}")
    raise HTTPException(status_code=500, detail="Database connection error")
```

#### Missing Data Handling

Endpoints check for missing data and return appropriate defaults or error messages:

1. **Stats Endpoint**:
   - For a new user with no stats, creates default stats (50 for each stat, 1000 for money)
   - When updating stats, verifies the user exists before proceeding

2. **Schedule Endpoint**:
   - Returns an empty schedule when no data is found
   - Validates activity IDs exist before saving a schedule

3. **Shop Endpoint**:
   - Verifies items exist before purchase
   - Ensures sufficient funds for in-game purchases
   - Handles inventory state properly for item usage

#### Pagination

For endpoints that may return large datasets, pagination is implemented:

```python
@router.get("/inventory")
async def get_inventory(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: AuthorizedUser = Depends()
):
    supabase = get_supabase_client()
    
    # Calculate offset
    offset = (page - 1) * page_size
    
    inventory_response = supabase.table("user_inventory") \
        .select("*") \
        .eq("user_id", user.sub) \
        .range(offset, offset + page_size - 1) \
        .execute()
    
    # Process results
    # ...
```

#### Data Validation

All incoming data is validated using Pydantic models:

```python
class StatUpdate(BaseModel):
    stat_type: StatType
    value: int
    reason: str
    
    @validator('value')
    def validate_value(cls, v):
        if abs(v) > 100:
            raise ValueError("Stat change cannot exceed 100 points")
        return v
```

### Rate Limiting

To prevent abuse, the API implements rate limiting:

```python
@router.get("/stats", dependencies=[Depends(RateLimiter(times=10, seconds=60))])
async def get_stats(user: AuthorizedUser):
    # Endpoint implementation
```

### Transaction Safety

For operations affecting multiple database tables, transactions ensure data consistency:

```python
# When purchasing items
try:
    # Start transaction
    # 1. Update user's money
    # 2. Add item to inventory
    # 3. Record purchase history
    # Commit transaction
except Exception as e:
    # Rollback transaction
    raise HTTPException(status_code=500, detail="Transaction failed")
```

### Testing Edge Cases

Key edge cases that should be tested:

1. User with no existing stats record
2. Attempting to update non-existent stats
3. Purchasing with insufficient funds
4. Using an item not in inventory
5. Scheduling conflicting activities
6. Handling of timezone differences in schedules
7. API requests with malformed/invalid tokens
8. Database connection failures

### API Versioning

The API is designed for versioning to support future changes:

```
/api/v1/stats
/api/v1/schedule
/api/v1/shop
```

## Database Tables

The API uses the following Supabase database tables:

1. `user_stats` - Stores user game stats
2. `user_schedules` - Stores user daily schedules
3. `activities` - Stores available activities for scheduling
4. `shop_items` - Stores items available in the shop
5. `user_inventory` - Stores user's purchased items
6. `stat_history` - Tracks history of stat changes
7. `purchase_history` - Tracks history of purchases
8. `item_usage_history` - Tracks history of item usage

## Authentication

All API endpoints require authentication using Firebase Auth. The user's ID is extracted from the JWT token and used to identify the user in database operations. 
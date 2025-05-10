# Game API Documentation

This document provides details on the core game API endpoints.

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
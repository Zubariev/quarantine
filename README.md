# Quarantine Game

A Tamagotchi-style browser game where you guide a quarantined freelancer through daily routines to balance well-being and productivity.

## Features

- **Dynamic Time System**: In-game time progression with day/night cycle
- **Schedule Management**: Plan your character's daily activities
- **Stat Tracking**: Balance hunger, stress, tone, health, and money
- **Random Events**: Respond to unexpected events that affect your stats
- **Shop System**: Purchase items to boost stats and customize your experience
- **Monetization**: Support development through in-game and real-money purchases

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Framer Motion, Howler.js
- **Backend**: FastAPI (Python), Supabase for auth and data storage
- **Deployment**: Vercel (frontend), Render (backend)

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python (v3.9+)
- Supabase account
- Stripe account (for monetization features)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/quarantine.git
   cd quarantine
   ```

2. Setup environment variables:
   ```bash
   # Copy example env files
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

4. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

5. Setup UX and monetization features:
   ```bash
   ./setup-ux-polish.sh
   ./setup-monetization.sh
   ```

6. Start the development servers:
   ```bash
   # Terminal 1 - Frontend
   cd frontend
   npm run dev
   
   # Terminal 2 - Backend
   cd backend
   uvicorn app.main:app --reload
   ```

7. Visit `http://localhost:5173` to play the game

## API Documentation

The game's backend provides several RESTful API endpoints to manage game state and user interactions.

### Core API Endpoints

#### Stats API

- **GET /stats**
  - Description: Retrieves current character stats
  - Authentication: Required
  - Response: JSON object with hunger, stress, tone, health, and money values
  - Example: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/stats`

- **POST /stats**
  - Description: Updates a specific stat value
  - Authentication: Required
  - Request Body: JSON with stat_type, value, and reason
  - Example: 
    ```json
    {
      "stat_type": "hunger",
      "value": -10,
      "reason": "Ate lunch"
    }
    ```

#### Schedule API

- **GET /schedule**
  - Description: Retrieves schedule for a specific day (defaults to current day)
  - Authentication: Required
  - Query Parameters: day (optional, ISO format YYYY-MM-DD)
  - Example: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/schedule?day=2023-07-15`

- **POST /schedule**
  - Description: Saves or updates a daily schedule
  - Authentication: Required
  - Request Body: JSON with date and blocks array
  - Example:
    ```json
    {
      "date": "2023-07-15T00:00:00",
      "blocks": [
        {
          "activity_id": "act1",
          "start_hour": 8,
          "duration_hours": 4
        }
      ]
    }
    ```

- **GET /schedule/activities**
  - Description: Lists all available activities for scheduling
  - Authentication: Required
  - Example: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/schedule/activities`

#### Shop API

- **GET /shop**
  - Description: Lists all shop items, optionally filtered by category
  - Authentication: Required
  - Query Parameters: category (optional)
  - Example: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/shop?category=plants`

- **GET /shop/inventory**
  - Description: Gets user's inventory of purchased items
  - Authentication: Required
  - Example: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/shop/inventory`

- **POST /shop/purchase**
  - Description: Purchases an item using real money (Stripe)
  - Authentication: Required
  - Request Body: JSON with item_id, quantity, and payment_method_id
  - Example:
    ```json
    {
      "item_id": "premium_theme",
      "quantity": 1,
      "payment_method_id": "pm_card_visa"
    }
    ```

- **POST /shop/ingame**
  - Description: Purchases an item using in-game currency
  - Authentication: Required
  - Request Body: JSON with item_id and quantity
  - Example:
    ```json
    {
      "item_id": "plant_cactus",
      "quantity": 1
    }
    ```

- **POST /shop/use/{item_id}**
  - Description: Uses an item from inventory
  - Authentication: Required
  - URL Parameters: item_id
  - Example: `curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:8000/shop/use/plant_cactus`

### OpenAPI Documentation

The API includes automatic OpenAPI (Swagger) documentation:

- **Swagger UI**: Visit `http://localhost:8000/docs` in your browser
- **OpenAPI JSON**: Available at `http://localhost:8000/openapi.json`

### Testing Endpoints

1. Start the backend server:
   ```
   cd backend
   python -m uvicorn main:app --reload
   ```

2. Obtain an authentication token by logging in via frontend or using direct API call:
   ```
   curl -X POST "http://localhost:8000/auth/login" -H "Content-Type: application/json" -d '{"email": "user@example.com", "password": "password"}'
   ```

3. Use the token for authenticated requests:
   ```
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/stats
   ```

4. For testing Stripe payments, use Stripe's test card numbers:
   - Success: 4242 4242 4242 4242
   - Requires authentication: 4000 0025 0000 3155
   - Declined: 4000 0000 0000 0002

5. Test webhooks locally with Stripe CLI:
   ```
   stripe listen --forward-to localhost:8000/shop/webhook
   ```

### Error Handling

All endpoints return standard HTTP status codes:

- 200: Success
- 400: Bad request (invalid parameters)
- 401: Unauthorized (missing or invalid token)
- 404: Resource not found
- 500: Server error

Error responses include a detail message explaining the issue.

## Deployment Guide

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set the following environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Deploy using the Vercel dashboard

### Backend (Render)

1. Create a new Web Service on Render
2. Connect to your GitHub repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `STRIPE_API_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `CORS_ORIGINS`

## Alpha Testing Guide

For alpha testers, here's how to play the game:

1. Create an account via the login page
2. Manage your schedule by dragging activities to time slots
3. Monitor your stats at the top of the screen
4. Visit the shop to purchase items
5. Respond to random events when they appear
6. Try to survive as long as possible!

### Reporting Issues

Please report any bugs or feedback using the in-game feedback form or open an issue on GitHub with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Browser and device information

## Development Scripts

- `npm run dev`: Start development server
- `npm run build`: Build production-ready frontend
- `npm run lint`: Run ESLint
- `npm test`: Run test suite

## Testing

End-to-end tests are available in the `tests` directory:

```bash
# Run core game loop tests
npm run test:e2e

# Run monetization flow tests (requires Stripe test keys)
npm run test:monetization
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# Quarantine Game Backend

This is the backend server for the Quarantine game, built with FastAPI and Python.

## Features

- REST API with FastAPI
- Supabase for data storage
- Authentication with JWT
- Stripe integration for monetization
- Comprehensive test suite

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/quarantine.git
   cd quarantine/backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with the following variables:
   ```
   # Either run our setup script from the root directory:
   cd ..
   ./create-env-files.sh
   
   # Or manually create a .env file with these variables:
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   STRIPE_API_KEY=your_stripe_api_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   CORS_ORIGINS=http://localhost:5173,http://localhost:5174
   ```

## Running the Server

Start the development server:

```bash
uvicorn main:app --reload
```

The server will be available at [http://localhost:8000](http://localhost:8000).

## API Documentation

When the server is running, you can access the API documentation at:

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

The API is organized into the following endpoints:

- `/stats` - Manage character stats (hunger, stress, tone, health, money)
- `/schedule` - Plan and manage character's daily schedule
- `/shop` - Buy items with in-game or real money, and use items from inventory

## Running Tests

The project includes comprehensive unit tests for all API endpoints.

1. Install test dependencies:
   ```bash
   pip install pytest pytest-cov
   ```

2. Run all tests:
   ```bash
   pytest
   ```

3. Run tests with coverage report:
   ```bash
   pytest --cov=app tests/
   ```

4. Run specific test files:
   ```bash
   pytest tests/test_stats_api.py
   pytest tests/test_shop_api.py
   pytest tests/test_schedule_api.py
   ```

5. Run tests with detailed output:
   ```bash
   pytest -v
   ```

## Project Structure

```
backend/
├── app/                  # Application code
│   ├── apis/             # API endpoints
│   │   ├── stats/        # Stats endpoints
│   │   ├── schedule/     # Schedule endpoints
│   │   └── shop/         # Shop endpoints
│   ├── auth/             # Authentication code
│   ├── db/               # Database connection
│   └── models/           # Pydantic models
├── tests/                # Unit tests
│   ├── test_stats_api.py
│   ├── test_schedule_api.py
│   └── test_shop_api.py
├── main.py               # FastAPI application entry point
├── requirements.txt      # Project dependencies
└── README.md             # This file
```

## API Endpoints

### Stats API

- `GET /stats` - Get current stats
- `POST /stats` - Update a specific stat
- `POST /stats/activity` - Apply activity effects to stats
- `GET /stats/history` - Get history of stat changes

### Schedule API

- `GET /schedule` - Get schedule for a specific day
- `POST /schedule` - Save/update a schedule
- `GET /schedule/activities` - Get list of activities
- `POST /schedule/activities` - Create a custom activity
- `GET /schedule/sync` - Sync multiple days of schedules

### Shop API

- `GET /shop` - Get list of shop items
- `GET /shop/inventory` - Get user's inventory
- `POST /shop/purchase` - Purchase with real money (Stripe)
- `POST /shop/ingame` - Purchase with in-game currency
- `POST /shop/use/{item_id}` - Use an item from inventory
- `POST /shop/webhook` - Handle Stripe webhooks

## Deployment

The backend is designed to be deployed to any platform that supports Python. We recommend:

- Render.com
- Heroku
- AWS Lambda with API Gateway
- Google Cloud Run

For production, make sure to:

1. Set appropriate environment variables
2. Configure a production-ready database
3. Set up proper logging
4. Configure CORS for your frontend domain
5. Use a proper web server like Gunicorn or Uvicorn (without reload)

Example production command:
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

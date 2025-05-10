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

### Authentication

The game uses Supabase Auth for authentication. API calls require a valid JWT token.

- **POST /auth/login**: Log in with email/password
- **POST /auth/register**: Create a new account
- **POST /auth/refresh**: Refresh authentication token

### Game Endpoints

- **GET /game/stats**: Get character stats
- **POST /game/activity**: Apply activity effects
- **GET /game/schedule**: Get current schedule
- **POST /game/schedule**: Update schedule

### Shop Endpoints

- **GET /shop**: Get available shop items
- **GET /shop/inventory**: Get user's inventory
- **POST /shop/purchase**: Purchase item (with payment_method_id for Stripe)
- **POST /shop/ingame**: Purchase with in-game currency
- **POST /shop/use/{item_id}**: Use an item from inventory

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

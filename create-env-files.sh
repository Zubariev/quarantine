#!/bin/bash

# Script to create environment files for Quarantine Game

# Create backend .env file
cat > backend/.env << 'EOL'
# Quarantine Game Backend Environment Variables

# Supabase configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Stripe configuration for payments
STRIPE_API_KEY=your_stripe_api_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# CORS configuration
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# Server configuration
PORT=8000
DEBUG=True
EOL

echo "Backend .env file created"

# Create frontend .env file
cat > frontend/.env << 'EOL'
# Quarantine Game Frontend Environment Variables

# API URL - development
VITE_API_URL=http://localhost:8000

# Supabase configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe configuration
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Feature flags
VITE_ENABLE_MONETIZATION=true
VITE_ENABLE_ANALYTICS=false
EOL

echo "Frontend .env file created"

echo "Environment files created successfully. Please update them with your actual values." 
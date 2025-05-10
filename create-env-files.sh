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

# Firebase configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Stripe configuration
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Feature flags
VITE_ENABLE_MONETIZATION=true
VITE_ENABLE_ANALYTICS=false
EOL

echo "Frontend .env file created"

echo "Environment files created successfully. Please update them with your actual values." 
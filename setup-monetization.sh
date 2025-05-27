#!/bin/bash

# Create environment files with Stripe test keys
echo "Creating environment files..."

# Frontend .env file
cat > frontend/.env << EOL
# Stripe keys (use sandbox/test keys for development)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
EOL

# Backend .env file
cat > backend/.env << EOL
# Stripe configuration
STRIPE_API_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
EOL

echo "Environment files created with test keys."
echo "IMPORTANT: Replace these placeholder keys with your actual Stripe keys for development and production."

# Install additional packages if needed (though they seem to already be installed)
echo "Checking for required dependencies..."
cd frontend
npm list @stripe/react-stripe-js || npm install @stripe/react-stripe-js
npm list @stripe/stripe-js || npm install @stripe/stripe-js
cd ../backend
pip list | grep stripe || pip install stripe

echo "Setup complete. Monetization features are now ready for development."
echo "Remember to replace placeholder keys with your actual Stripe keys when moving to production." 
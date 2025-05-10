#!/bin/bash

echo "Installing packages for UX improvements..."

# Navigate to frontend directory
cd frontend

# Install Framer Motion for animations
echo "Installing Framer Motion..."
npm install framer-motion

# Install Howler.js for audio
echo "Installing Howler.js..."
npm install howler
npm install @types/howler --save-dev

# Create directories if they don't exist
mkdir -p public/audio/bgm
mkdir -p public/audio/sfx
mkdir -p public/images/events

echo "Creating placeholder audio and image files..."

# Create placeholder audio files if they don't exist
if [ ! -f public/audio/bgm/morning.mp3 ]; then
  touch public/audio/bgm/morning.mp3
  touch public/audio/bgm/afternoon.mp3
  touch public/audio/bgm/evening.mp3
  touch public/audio/bgm/night.mp3
  
  touch public/audio/sfx/click.mp3
  touch public/audio/sfx/success.mp3
  touch public/audio/sfx/notification.mp3
  touch public/audio/sfx/error.mp3
  touch public/audio/sfx/meal.mp3
fi

# Create placeholder event images if they don't exist
if [ ! -f public/images/events/friend-call.jpg ]; then
  touch public/images/events/friend-call.jpg
  touch public/images/events/package.jpg
  touch public/images/events/power-outage.jpg
  touch public/images/events/food-discount.jpg
  touch public/images/events/noise.jpg
fi

echo "Setup complete! UX improvements ready for development."
echo "Important: Replace placeholder audio and image files with actual content."
echo "You can download royalty-free lofi music for BGM and UI sound effects for SFX." 
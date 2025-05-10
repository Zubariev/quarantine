# Monetization System Setup Guide

This document provides a detailed guide for setting up and configuring the monetization system for the Quarantine game.

## Environment Variables

Replace the following placeholder variables with actual values:

### Frontend Environment Variables
Create or update `frontend/.env`:
```
# Stripe keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXX  # For development
# Use pk_live_XXXXXXXXXXXXX for production
```

### Backend Environment Variables
Create or update `backend/.env`:
```
# Stripe configuration
STRIPE_API_KEY=sk_test_XXXXXXXXXXXXX  # For development
# Use sk_live_XXXXXXXXXXXXX for production
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXX
```

## Stripe Account Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Set up a project for the Quarantine game
3. Obtain API keys (both test and live)
4. Configure webhook endpoints:
   - Development: `http://localhost:8000/routes/shop/webhook`
   - Production: `https://yourdomain.com/routes/shop/webhook`
5. Enable relevant payment methods in Stripe dashboard

## Required Shop Assets

The following assets are needed for the shop items to be properly displayed:

### Item Images (Recommended size: 512x512px, PNG/JPEG)

#### Furniture Category:
- Desk (improves productivity)
- Comfy Chair (reduces stress)
- Bookshelf (improves tone)
- Plants (improves health)
- Lamp (improves mood)

#### Food Category:
- Energy Drink (temporary tone boost)
- Healthy Meal (improves health, reduces hunger)
- Snacks (reduces hunger)
- Premium Coffee (improves tone)

#### Course Category:
- Coding Course (increases money earning)
- Yoga Course (reduces stress)
- Cooking Course (food items more effective)
- Financial Course (reduces prices)

#### Entertainment Category:
- Video Game (reduces stress, lowers tone)
- Music Subscription (improves mood)
- Streaming Service (reduces stress)
- Board Game (improves tone when used with friends)

### Store Assets:
- Shop background image
- Category icons
- Currency icon
- Purchase button states (normal, hover, disabled)
- Success purchase animation

## Database Requirements

Ensure the following tables exist in Supabase:

1. `shop_items` - Stores item details
   - Required fields: id, name, description, category, price, purchase_type, image_url, stats_effects

2. `user_inventory` - Stores user's purchased items
   - Required fields: id, user_id, item_id, quantity, purchased_at

3. `purchase_history` - Records all purchases
   - Required fields: id, user_id, item_id, quantity, total_cost, purchase_type, payment_id, purchased_at

4. `item_usage_history` - Tracks item usage
   - Required fields: id, user_id, item_id, used_at

## Price Point Considerations

Consider the following price points for a balanced economy:

1. In-game currency items:
   - Basic items: 50-200 coins
   - Advanced items: 200-500 coins
   - Premium items: 500-1000 coins

2. Real-money purchases:
   - Currency packs:
     - Small: $1.99 for 500 coins
     - Medium: $4.99 for 1500 coins
     - Large: $9.99 for 3500 coins
   - Premium items: $2.99 - $9.99
   - Subscription: $4.99/month

## Testing Monetization

### Stripe Test Cards
Use these test cards to verify payments:

- Success: 4242 4242 4242 4242
- Requires Authentication: 4000 0025 0000 3155
- Declined: 4000 0000 0000 0002

### Testing Checklist
- Verify in-game purchases decrease user's currency
- Verify real-money purchases process correctly
- Test webhook receipt of completed payments
- Verify inventory updates after purchases
- Test item usage and stat effects
- Verify purchase history records

## Analytics Integration

Add analytics to track:

1. Conversion rate for shop visits
2. Average revenue per user (ARPU)
3. Popular purchase items
4. Abandoned cart events
5. Purchase frequency

## Legal Requirements

Ensure the following are in place:

1. Terms of Service
2. Privacy Policy
3. Refund Policy
4. In-app purchase disclosure
5. Data processing agreement (if applicable)

## Post-Launch Monitoring

Monitor these key metrics:

1. Revenue per day
2. Purchase success rate
3. Payment method distribution
4. Item popularity
5. Customer support issues related to payments

---

Completing this setup will ensure the monetization system is ready for both development testing and production use. 
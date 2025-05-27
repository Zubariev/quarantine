-- Quarantine Game Database Schema Migration
-- Version: 1.0
-- Date: Created automatically

-- Enable Row Level Security (RLS)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE stat_type AS ENUM ('hunger', 'stress', 'tone', 'health', 'money');
CREATE TYPE purchase_type AS ENUM ('in_game', 'real_money');
CREATE TYPE activity_category AS ENUM ('work', 'leisure', 'necessity', 'social', 'education', 'rest');
CREATE TYPE item_category AS ENUM ('food', 'furniture', 'entertainment', 'utility', 'course', 'premium');

-- Users table (created automatically by Supabase Auth)
-- This table is managed by Supabase, but we reference it here for clarity
-- auth.users contains all user authentication data

-- User Stats Table
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hunger INTEGER NOT NULL DEFAULT 50 CHECK (hunger BETWEEN 0 AND 100),
    stress INTEGER NOT NULL DEFAULT 50 CHECK (stress BETWEEN 0 AND 100),
    tone INTEGER NOT NULL DEFAULT 50 CHECK (tone BETWEEN 0 AND 100),
    health INTEGER NOT NULL DEFAULT 50 CHECK (health BETWEEN 0 AND 100),
    money INTEGER NOT NULL DEFAULT 1000 CHECK (money >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Stat History Table
CREATE TABLE IF NOT EXISTS stat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stat_type stat_type NOT NULL,
    value_change INTEGER NOT NULL,
    old_value INTEGER NOT NULL,
    new_value INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities Table
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category activity_category NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0), -- in minutes
    custom BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system activities
    stats_effects JSONB DEFAULT '{}'::JSONB, -- JSON object with stat effects
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, user_id)
);

-- User Schedules Table
CREATE TABLE IF NOT EXISTS user_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT no_overlap CHECK (start_time < end_time),
    UNIQUE(user_id, date, start_time)
);

-- Shop Items Table
CREATE TABLE IF NOT EXISTS shop_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category item_category NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    purchase_type purchase_type NOT NULL,
    stats_effects JSONB DEFAULT '{}'::JSONB, -- JSON object with stat effects
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name)
);

-- User Inventory Table
CREATE TABLE IF NOT EXISTS user_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- Purchase History Table
CREATE TABLE IF NOT EXISTS purchase_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_unit INTEGER NOT NULL CHECK (price_per_unit >= 0),
    total_price INTEGER NOT NULL CHECK (total_price >= 0),
    purchase_type purchase_type NOT NULL,
    transaction_id TEXT, -- For real money transactions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Item Usage History Table
CREATE TABLE IF NOT EXISTS item_usage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    stats_effects JSONB NOT NULL, -- Actual stat effects applied
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS) policies
-- User Stats Policy
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_stats_policy ON user_stats 
    USING (user_id = auth.uid());

-- Stat History Policy
ALTER TABLE stat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY stat_history_policy ON stat_history 
    USING (user_id = auth.uid());

-- Activities Policy (allow reading all, but only modify own)
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY activities_select_policy ON activities 
    FOR SELECT USING (custom = FALSE OR user_id = auth.uid());
CREATE POLICY activities_insert_policy ON activities 
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY activities_update_policy ON activities 
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY activities_delete_policy ON activities 
    FOR DELETE USING (user_id = auth.uid());

-- User Schedules Policy
ALTER TABLE user_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_schedules_policy ON user_schedules 
    USING (user_id = auth.uid());

-- Shop Items Policy (read-only for users)
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY shop_items_select_policy ON shop_items 
    FOR SELECT USING (active = TRUE);

-- User Inventory Policy
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_inventory_policy ON user_inventory 
    USING (user_id = auth.uid());

-- Purchase History Policy
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY purchase_history_policy ON purchase_history 
    USING (user_id = auth.uid());

-- Item Usage History Policy
ALTER TABLE item_usage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY item_usage_history_policy ON item_usage_history 
    USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX idx_stat_history_user_id ON stat_history(user_id);
CREATE INDEX idx_stat_history_created_at ON stat_history(created_at);
CREATE INDEX idx_activities_category ON activities(category);
CREATE INDEX idx_user_schedules_user_id_date ON user_schedules(user_id, date);
CREATE INDEX idx_shop_items_category ON shop_items(category);
CREATE INDEX idx_shop_items_purchase_type ON shop_items(purchase_type);
CREATE INDEX idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX idx_purchase_history_user_id ON purchase_history(user_id);
CREATE INDEX idx_purchase_history_created_at ON purchase_history(created_at);
CREATE INDEX idx_item_usage_history_user_id ON item_usage_history(user_id);
CREATE INDEX idx_item_usage_history_created_at ON item_usage_history(created_at);

-- Insert some initial activities
INSERT INTO activities (name, description, category, duration, stats_effects)
VALUES 
    ('Work from Home', 'Complete your remote work tasks', 'work', 240, '{"money": 100, "stress": 15, "hunger": 10}'),
    ('Quick Nap', 'Take a short nap to recharge', 'rest', 30, '{"stress": -20, "hunger": 5}'),
    ('Prepare Meal', 'Cook and eat a meal', 'necessity', 60, '{"hunger": -30, "health": 10}'),
    ('Exercise', 'Do a home workout', 'leisure', 60, '{"health": 15, "hunger": 15, "stress": -10}'),
    ('Video Call Friends', 'Catch up with friends remotely', 'social', 90, '{"stress": -15, "tone": 10}'),
    ('Online Course', 'Learn something new', 'education', 120, '{"tone": 15, "stress": 5}'),
    ('Watch TV', 'Relax with your favorite show', 'leisure', 120, '{"stress": -15, "tone": -5}'),
    ('Clean Apartment', 'Tidy up your living space', 'necessity', 90, '{"health": 5, "stress": 5}'),
    ('Meditation', 'Practice mindfulness', 'rest', 30, '{"stress": -20, "health": 5}'),
    ('Read a Book', 'Enjoy some quiet reading time', 'leisure', 60, '{"tone": 10, "stress": -10}');

-- Insert some initial shop items
INSERT INTO shop_items (name, description, category, price, purchase_type, stats_effects, image_url)
VALUES 
    ('Pizza Delivery', 'Order a tasty pizza', 'food', 20, 'in_game', '{"hunger": -30}', '/images/items/pizza.png'),
    ('Comfortable Chair', 'Upgrade your work setup', 'furniture', 100, 'in_game', '{"stress": -2}', '/images/items/chair.png'),
    ('Premium Subscription', 'Get access to premium content', 'premium', 5, 'real_money', '{"tone": 10, "stress": -5}', '/images/items/premium.png'),
    ('Healthy Meal Kit', 'Nutritious ingredients delivered', 'food', 30, 'in_game', '{"hunger": -40, "health": 15}', '/images/items/meal-kit.png'),
    ('Coding Course', 'Learn programming skills', 'course', 200, 'in_game', '{"tone": 20}', '/images/items/coding.png'),
    ('Meditation App', 'Premium meditation guides', 'utility', 50, 'in_game', '{"stress": -15}', '/images/items/meditation.png'),
    ('Gaming Console', 'Entertainment system', 'entertainment', 300, 'in_game', '{"stress": -20, "tone": -5}', '/images/items/console.png'),
    ('Home Gym Kit', 'Basic exercise equipment', 'utility', 150, 'in_game', '{"health": 20}', '/images/items/gym.png'),
    ('Gift Card Pack', 'Support the developers', 10, 'real_money', '{"money": 500}', '/images/items/gift-card.png'),
    ('Houseplant', 'A bit of nature for your space', 'furniture', 40, 'in_game', '{"stress": -5, "health": 5}', '/images/items/plant.png'); 
#!/bin/bash

# Apply Supabase migration script
# This script uploads and applies SQL migrations to your Supabase project
# Make sure you have supabase CLI installed: https://supabase.com/docs/guides/cli/getting-started

# Check if .env file exists and source it
if [ -f ../../../.env ]; then
    source ../../../.env
elif [ -f ../../.env ]; then
    source ../../.env
elif [ -f ../.env ]; then
    source ../.env
else
    echo "No .env file found"
    exit 1
fi

# Check for required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in your .env file"
    exit 1
fi

# Display info
echo "Applying migration to Supabase instance at: $SUPABASE_URL"
echo "This will create all required tables for the Quarantine game."
echo ""
read -p "Do you want to continue? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration aborted."
    exit 0
fi

# Apply the migration using curl
echo "Applying migration..."
curl -X POST \
  -H "Content-Type: application/sql" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  --data-binary @01_create_tables.sql \
  "$SUPABASE_URL/rest/v1/sql"

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo "Migration applied successfully!"
    echo "Your Supabase database now has all the tables required for the Quarantine game."
else
    echo "Error: Migration failed to apply. Check your Supabase credentials and try again."
    exit 1
fi

echo ""
echo "Note: You may need to manually adjust Row Level Security (RLS) policies in the Supabase dashboard"
echo "to ensure proper access control for your application." 
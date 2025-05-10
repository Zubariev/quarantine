import os
from supabase import create_client
from functools import lru_cache

@lru_cache()
def get_supabase_client():
    """
    Create and return a Supabase client for database operations.
    Uses environment variables for configuration.
    """
    url = os.environ.get("SUPABASE_URL", "https://qtuzwjjkbfwrrlszicoe.supabase.co")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    
    if not key:
        raise ValueError("SUPABASE_SERVICE_KEY environment variable is not set")
    
    return create_client(url, key) 
import os
import pathlib
import json
import dotenv
from fastapi import FastAPI, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware

dotenv.load_dotenv()

from databutton_app.mw.auth_mw import AuthConfig, get_authorized_user

from app.apis.stats import router as stats_router
from app.apis.schedule import router as schedule_router
from app.apis.shop import router as shop_router

# Define API metadata
VERSION = "0.1.0"
DESCRIPTION = """
# Quarantine Game API

This API provides endpoints for the Quarantine game, a Tamagotchi-style browser game where you guide a quarantined freelancer through daily routines to balance well-being and productivity.

## Features

* **Stats Management**: Track hunger, stress, tone, health, and money
* **Schedule Planning**: Plan your character's activities on a 24-hour timeline
* **Shop System**: Purchase and use items to affect your stats
* **Activity System**: Create and manage custom activities

## Authentication

All endpoints require authentication. Use a valid Bearer token in the Authorization header.
"""

TAGS_METADATA = [
    {
        "name": "stats",
        "description": "Manage character stats (hunger, stress, tone, health, money)"
    },
    {
        "name": "schedule",
        "description": "Plan and manage your character's daily schedule"
    },
    {
        "name": "shop",
        "description": "Buy items with in-game or real money, and use items from inventory"
    }
]

def get_router_config() -> dict:
    try:
        # Note: This file is not available to the agent
        cfg = json.loads(open("routers.json").read())
    except:
        return False
    return cfg


def is_auth_disabled(router_config: dict, name: str) -> bool:
    return router_config["routers"][name]["disableAuth"]


def import_api_routers() -> APIRouter:
    """Create top level router including all user defined endpoints."""
    routes = APIRouter(prefix="/routes")

    router_config = get_router_config()

    src_path = pathlib.Path(__file__).parent

    # Import API routers from "src/app/apis/*/__init__.py"
    apis_path = src_path / "app" / "apis"

    api_names = [
        p.relative_to(apis_path).parent.as_posix()
        for p in apis_path.glob("*/__init__.py")
    ]

    api_module_prefix = "app.apis."

    for name in api_names:
        print(f"Importing API: {name}")
        try:
            api_module = __import__(api_module_prefix + name, fromlist=[name])
            api_router = getattr(api_module, "router", None)
            if isinstance(api_router, APIRouter):
                routes.include_router(
                    api_router,
                    dependencies=(
                        []
                        if is_auth_disabled(router_config, name)
                        else [Depends(get_authorized_user)]
                    ),
                )
        except Exception as e:
            print(e)
            continue

    print(routes.routes)

    return routes


def get_firebase_config() -> dict | None:
    extensions = os.environ.get("DATABUTTON_EXTENSIONS", "[]")
    extensions = json.loads(extensions)

    for ext in extensions:
        if ext["name"] == "firebase-auth":
            return ext["config"]["firebaseConfig"]

    return None


def create_app() -> FastAPI:
    """Create the app. This is called by uvicorn with the factory option to construct the app object."""
    app = FastAPI(
        title="Quarantine Game API",
        description=DESCRIPTION,
        version=VERSION,
        openapi_tags=TAGS_METADATA,
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # Get CORS origins from environment variable or use default
    origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(import_api_routers())

    for route in app.routes:
        if hasattr(route, "methods"):
            for method in route.methods:
                print(f"{method} {route.path}")

    firebase_config = get_firebase_config()

    if firebase_config is None:
        print("No firebase config found")
        app.state.auth_config = None
    else:
        print("Firebase config found")
        auth_config = {
            "jwks_url": "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
            "audience": firebase_config["projectId"],
            "header": "authorization",
        }

        app.state.auth_config = AuthConfig(**auth_config)

    return app


app = create_app()

@app.get("/", tags=["health"])
async def root():
    """
    Health check endpoint to verify API is running.
    Returns API version and status information.
    """
    return {
        "name": "Quarantine Game API",
        "version": VERSION,
        "status": "running"
    }

@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check endpoint for monitoring systems.
    """
    return {"status": "healthy"}

@app.get("/authenticated", tags=["auth"])
async def authenticated_route(user=Depends(get_authorized_user)):
    """
    Test endpoint to verify authentication is working.
    Requires a valid authentication token.
    """
    return {"message": "Successfully authenticated", "user": user.dict()}

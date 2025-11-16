"""Main FastAPI application for Drink Recipe API."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.v1 import auth_routes, chat_routes, static_asset_routes, cocktail_routes
from src.core.config import get_settings
from src.infra.supabase_client import init_supabase

import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup: Initialize Supabase client
    init_supabase()
    yield
    # Shutdown: Cleanup if needed
    pass

# Initialize FastAPI app
settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API for managing Arthur, the Three.js Agentic Bartender, with user authentication",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
    
# Include routers
app.include_router(auth_routes.router, prefix="/api/v1")
app.include_router(chat_routes.router, prefix="/api/v1")
app.include_router(static_asset_routes.router, prefix="/api/v1")
app.include_router(cocktail_routes.router, prefix="/api/v1")


@app.get("/")
async def read_root():
    """Root endpoint - API health check."""
    return {
        "message": "Welcome to Arthur API",
        "status": "healthy",
        "version": settings.app_version
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": settings.app_name}

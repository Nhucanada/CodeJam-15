"""Core configuration settings."""

import os
from functools import lru_cache
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    # Pydantic settings
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Database Settings
    max_connections: int = 100
    max_idle_connections: int = 10
    max_lifetime_connections: int = 3600
    pool_timeout: int = 10
    pool_size: int = 10
    pool_recycle: int = 3600
    pool_pre_ping: bool = True
    pool_use_lifespan: bool = True
    
    # API Settings
    app_name: str = Field(default="Arthur API", description="Application name")
    app_version: str = Field(default="1.0.0", description="Application version")
    debug: bool = Field(default=False, description="Debug mode")
    
    # Supabase Settings
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_key: str = Field(..., description="Supabase anon/public key")
    supabase_jwt_secret: Optional[str] = Field(
        None,
        description="Supabase JWT secret for token verification"
    )

    # Gemini Settings
    gemini_api_key: Optional[str] = Field(
        default=None,
        description="Google Gemini API key"
    )
    gemini_model: str = Field(
        default="gemini-2.5-flash",
        description="Default Gemini model to use"
    )
    gemini_rate_limit_per_minute: int = Field(
        default=100,
        description="Max Gemini API requests allowed per minute"
    )
    gemini_concurrent_requests: int = Field(
        default=10,
        description="Number of concurrent Gemini API requests allowed"
    )
    gemini_general_model: str = Field(
        default="gemini-2.5-flash",
        description="Default Gemini general model"
    )
    gemini_embedding_model: str = Field(
        default="embedding-001",
        description="Default Gemini embedding model"
    )

    # AWS Settings
    aws_access_key_id: Optional[str] = Field(
        default=None,
        description="AWS Access Key ID for S3"
    )
    aws_secret_access_key: Optional[str] = Field(
        default=None,
        description="AWS Secret Access Key for S3"
    )
    aws_region: str = Field(
        default="us-east-1",
        description="AWS region for S3 operations"
    )
    aws_s3_bucket: Optional[str] = Field(
        default=None,
        description="Default S3 bucket name for RAG assets"
    )
    
    # CORS Settings
    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:8000"],
        description="Allowed CORS origins"
    )


@field_validator("cors_origins", mode="after")
@classmethod
def split_cors_origins(cls, v: str) -> list[str]:
    """Convert comma-separated string to list."""
    if isinstance(v, str):
        return [origin.strip() for origin in v.split(",") if origin.strip()]
    return v


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


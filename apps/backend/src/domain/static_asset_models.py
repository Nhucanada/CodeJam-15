"""Domain models for static assets."""

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class AssetKind(str, Enum):
    """Asset kind enumeration."""
    THREE_D_MODEL = "3d_model"
    ICON = "icon"
    THUMBNAIL = "thumbnail"


class AssetFormat(str, Enum):
    """Asset format enumeration."""
    GLTF = "gltf"
    GLB = "glb"
    FBX = "fbx"
    OBJ = "obj"
    USDZ = "usdz"


class AssetResponse(BaseModel):
    """Response model for asset data."""
    id: UUID
    ingredient_id: Optional[UUID] = None
    kind: AssetKind
    format: AssetFormat
    variant: str = "default"
    s3_bucket: str
    s3_key: str
    cdn_path: Optional[str] = None
    content_hash: Optional[str] = None
    file_size_bytes: Optional[int] = None
    lod_level: Optional[int] = None
    metadata: Optional[dict[str, Any]] = None
    is_active: bool = True
    version: int = 1
    created_at: datetime
    updated_at: datetime


class AssetQueryParams(BaseModel):
    """Query parameters for fetching assets."""
    ingredient_id: Optional[UUID] = None
    kind: Optional[AssetKind] = None
    format: Optional[AssetFormat] = None
    variant: Optional[str] = None
    version: Optional[int] = None
    is_active: Optional[bool] = True
    lod_level: Optional[int] = None


class AssetListResponse(BaseModel):
    """Response model for list of assets."""
    assets: list[AssetResponse]
    count: int


class AssetDownloadUrlResponse(BaseModel):
    """Response model for asset download URL."""
    asset_id: UUID
    download_url: str
    expires_in: int = Field(description="Seconds until URL expires")
    s3_key: str
    cdn_path: Optional[str] = None


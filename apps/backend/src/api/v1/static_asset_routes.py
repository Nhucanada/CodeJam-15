"""Static asset API routes."""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from src.core.dependencies import CurrentUser, OptionalUser
from src.domain.static_asset_models import (
    AssetDownloadUrlResponse,
    AssetKind,
    AssetFormat,
    AssetListResponse,
    AssetQueryParams,
    AssetResponse,
)
from src.infra.supabase_client import get_supabase_client
from src.services.graphic_asset_service import (
    get_asset_by_id,
    get_asset_download_url,
    get_assets,
    get_latest_asset,
)

router = APIRouter(prefix="/assets", tags=["Static Assets"])


@router.get(
    "/{asset_id}",
    response_model=AssetResponse,
    status_code=status.HTTP_200_OK,
    summary="Get asset by ID",
    description="Fetch a single asset by its UUID"
)
async def get_asset(
    asset_id: UUID,
    current_user: OptionalUser = None
) -> AssetResponse:
    """
    Get a single asset by ID.
    
    Args:
        asset_id: UUID of the asset to retrieve
        current_user: Optional authenticated user
        
    Returns:
        AssetResponse with asset details
    """
    supabase = get_supabase_client()
    return await get_asset_by_id(asset_id, supabase)


@router.get(
    "/",
    response_model=AssetListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get assets with filters",
    description="Fetch assets with optional filtering by various parameters"
)
async def list_assets(
    ingredient_id: Optional[UUID] = Query(None, description="Filter by ingredient ID"),
    kind: Optional[AssetKind] = Query(None, description="Filter by asset kind"),
    format: Optional[AssetFormat] = Query(None, description="Filter by asset format"),
    variant: Optional[str] = Query(None, description="Filter by variant (e.g., 'default', 'low_poly')"),
    version: Optional[int] = Query(None, description="Filter by version number"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    lod_level: Optional[int] = Query(None, description="Filter by level of detail"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of assets to return"),
    offset: int = Query(0, ge=0, description="Number of assets to skip"),
    current_user: OptionalUser = None
) -> AssetListResponse:
    """
    Get a list of assets with optional filters.
    
    Args:
        ingredient_id: Filter by ingredient ID
        kind: Filter by asset kind (3d_model, icon, thumbnail)
        format: Filter by asset format (gltf, glb, fbx, obj, usdz)
        variant: Filter by variant name
        version: Filter by version number
        is_active: Filter by active status (default: True)
        lod_level: Filter by level of detail
        limit: Maximum number of results (1-500, default: 100)
        offset: Pagination offset (default: 0)
        current_user: Optional authenticated user
        
    Returns:
        AssetListResponse with list of assets and count
    """
    query_params = AssetQueryParams(
        ingredient_id=ingredient_id,
        kind=kind,
        format=format,
        variant=variant,
        version=version,
        is_active=is_active,
        lod_level=lod_level
    )
    
    supabase = get_supabase_client()
    return await get_assets(query_params, supabase, limit=limit, offset=offset)


@router.get(
    "/{asset_id}/download",
    response_model=AssetDownloadUrlResponse,
    status_code=status.HTTP_200_OK,
    summary="Get asset download URL",
    description="Generate a presigned URL to download an asset"
)
async def get_download_url(
    asset_id: UUID,
    expires_in: int = Query(3600, ge=60, le=86400, description="URL expiration time in seconds (60-86400)"),
    current_user: OptionalUser = None
) -> AssetDownloadUrlResponse:
    """
    Generate a presigned download URL for an asset.
    
    Args:
        asset_id: UUID of the asset
        expires_in: URL expiration time in seconds (60-86400, default: 3600)
        current_user: Optional authenticated user
        
    Returns:
        AssetDownloadUrlResponse with presigned download URL
    """
    supabase = get_supabase_client()
    return await get_asset_download_url(asset_id, supabase, expires_in=expires_in)


@router.get(
    "/latest/query",
    response_model=AssetResponse,
    status_code=status.HTTP_200_OK,
    summary="Get latest asset version",
    description="Fetch the latest version of an asset matching the query parameters"
)
async def get_latest_asset_version(
    ingredient_id: Optional[UUID] = Query(None, description="Filter by ingredient ID"),
    kind: Optional[AssetKind] = Query(None, description="Filter by asset kind"),
    format: Optional[AssetFormat] = Query(None, description="Filter by asset format"),
    variant: Optional[str] = Query("default", description="Filter by variant"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    lod_level: Optional[int] = Query(None, description="Filter by level of detail"),
    current_user: OptionalUser = None
) -> AssetResponse:
    """
    Get the latest version of an asset matching the query parameters.
    
    Args:
        ingredient_id: Filter by ingredient ID
        kind: Filter by asset kind
        format: Filter by asset format
        variant: Filter by variant (default: 'default')
        is_active: Filter by active status (default: True)
        lod_level: Filter by level of detail
        current_user: Optional authenticated user
        
    Returns:
        AssetResponse with the latest matching asset
    """
    query_params = AssetQueryParams(
        ingredient_id=ingredient_id,
        kind=kind,
        format=format,
        variant=variant,
        is_active=is_active,
        lod_level=lod_level
    )
    
    supabase = get_supabase_client()
    return await get_latest_asset(query_params, supabase)


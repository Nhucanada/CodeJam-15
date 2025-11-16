"""Service for handling static asset operations."""

from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from supabase import Client

from src.domain.static_asset_models import (
    AssetDownloadUrlResponse,
    AssetListResponse,
    AssetQueryParams,
    AssetResponse,
)


def _format_asset_response(asset_data: dict) -> AssetResponse:
    """Format Supabase asset data into AssetResponse model."""
    return AssetResponse(
        id=asset_data.get("id"),
        ingredient_id=asset_data.get("ingredient_id"),
        kind=asset_data.get("kind"),
        format=asset_data.get("format"),
        variant=asset_data.get("variant", "default"),
        s3_bucket=asset_data.get("s3_bucket"),
        s3_key=asset_data.get("s3_key"),
        cdn_path=asset_data.get("cdn_path"),
        content_hash=asset_data.get("content_hash"),
        file_size_bytes=asset_data.get("file_size_bytes"),
        lod_level=asset_data.get("lod_level"),
        metadata=asset_data.get("metadata"),
        is_active=asset_data.get("is_active", True),
        version=asset_data.get("version", 1),
        created_at=asset_data.get("created_at"),
        updated_at=asset_data.get("updated_at"),
    )


async def get_asset_by_id(
    asset_id: UUID,
    supabase: Client
) -> AssetResponse:
    """
    Fetch a single asset by ID.
    
    Args:
        asset_id: UUID of the asset
        supabase: Supabase client instance
        
    Returns:
        AssetResponse with asset data
        
    Raises:
        HTTPException: If asset not found or retrieval fails
    """
    try:
        response = supabase.table("assets").select("*").eq("id", str(asset_id)).single().execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Asset with ID {asset_id} not found"
            )
        
        return _format_asset_response(response.data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch asset: {str(e)}"
        )


async def get_assets(
    query_params: AssetQueryParams,
    supabase: Client,
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
) -> AssetListResponse:
    """
    Fetch assets based on query parameters.
    
    Args:
        query_params: Query filters for assets
        supabase: Supabase client instance
        limit: Maximum number of assets to return
        offset: Number of assets to skip
        
    Returns:
        AssetListResponse with list of assets and count
        
    Raises:
        HTTPException: If retrieval fails
    """
    try:
        query = supabase.table("assets").select("*")
        
        # Apply filters
        if query_params.ingredient_id:
            query = query.eq("ingredient_id", str(query_params.ingredient_id))
        
        if query_params.kind:
            query = query.eq("kind", query_params.kind.value)
        
        if query_params.format:
            query = query.eq("format", query_params.format.value)
        
        if query_params.variant:
            query = query.eq("variant", query_params.variant)
        
        if query_params.version is not None:
            query = query.eq("version", query_params.version)
        
        if query_params.is_active is not None:
            query = query.eq("is_active", query_params.is_active)
        
        if query_params.lod_level is not None:
            query = query.eq("lod_level", query_params.lod_level)
        
        # Apply ordering, limit and offset
        query = query.order("created_at", desc=True)
        
        if limit:
            query = query.limit(limit)
        
        if offset:
            query = query.offset(offset)
        
        response = query.execute()
        
        assets = [_format_asset_response(asset_data) for asset_data in response.data]
        
        return AssetListResponse(
            assets=assets,
            count=len(assets)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch assets: {str(e)}"
        )


async def get_asset_download_url(
    asset_id: UUID,
    supabase: Client,
    expires_in: int = 3600
) -> AssetDownloadUrlResponse:
    """
    Generate a presigned download URL for an asset.
    
    Args:
        asset_id: UUID of the asset
        supabase: Supabase client instance
        expires_in: URL expiration time in seconds (default: 3600)
        
    Returns:
        AssetDownloadUrlResponse with download URL
        
    Raises:
        HTTPException: If asset not found or URL generation fails
    """
    try:
        # First, get the asset details
        asset = await get_asset_by_id(asset_id, supabase)
        
        # Generate presigned URL using Supabase Storage
        # Note: Assumes s3_bucket corresponds to a Supabase storage bucket
        response = supabase.storage.from_(asset.s3_bucket).create_signed_url(
            asset.s3_key,
            expires_in
        )
        
        if not response or "signedURL" not in response:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate download URL"
            )
        
        return AssetDownloadUrlResponse(
            asset_id=asset.id,
            download_url=response["signedURL"],
            expires_in=expires_in,
            s3_key=asset.s3_key,
            cdn_path=asset.cdn_path
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate download URL: {str(e)}"
        )


async def get_latest_asset(
    query_params: AssetQueryParams,
    supabase: Client
) -> AssetResponse:
    """
    Get the latest version of an asset matching the query parameters.
    
    Args:
        query_params: Query filters for the asset
        supabase: Supabase client instance
        
    Returns:
        AssetResponse with the latest matching asset
        
    Raises:
        HTTPException: If no matching asset found
    """
    try:
        query = supabase.table("assets").select("*")
        
        # Apply filters (same as get_assets)
        if query_params.ingredient_id:
            query = query.eq("ingredient_id", str(query_params.ingredient_id))
        
        if query_params.kind:
            query = query.eq("kind", query_params.kind.value)
        
        if query_params.format:
            query = query.eq("format", query_params.format.value)
        
        if query_params.variant:
            query = query.eq("variant", query_params.variant)
        
        if query_params.is_active is not None:
            query = query.eq("is_active", query_params.is_active)
        
        if query_params.lod_level is not None:
            query = query.eq("lod_level", query_params.lod_level)
        
        # Order by version descending to get latest
        query = query.order("version", desc=True).limit(1)
        
        response = query.execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No matching asset found"
            )
        
        return _format_asset_response(response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch latest asset: {str(e)}"
        )


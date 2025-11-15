"""AWS S3 client initialization and management."""

from functools import lru_cache
from typing import Optional

import boto3
from botocore.client import BaseClient

from src.core.config import get_settings

_s3_client: Optional[BaseClient] = None

def init_s3_client() -> BaseClient:
    """
    Initialize the AWS S3 client with credentials from settings.
    Returns:
        boto3 S3 client instance
    """
    global _s3_client

    if _s3_client is None:
        settings = get_settings()
        _s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region
        )
    return _s3_client

@lru_cache
def get_s3_client() -> BaseClient:
    """
    Get cached AWS S3 client instance.
    Returns:
        boto3 S3 client instance
    """
    return init_s3_client()


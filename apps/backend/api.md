# Arthur API Documentation

## Overview

This FastAPI backend provides endpoints for user authentication and an agentic service that improves as the user uses the application. All authentication endpoints validate inputs using Pydantic models and return structured JSON responses.

## Setup

### 1. Environment Configuration

Create a `.env` file in the `apps/backend/` directory with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here

APP_NAME=Arthur API
APP_VERSION=1.0.0
DEBUG=false

CORS_ORIGINS=http://localhost:5173,http://frontend:5173
```

### 2. Install Dependencies

```bash
cd apps/backend
pip install -e .
# Or install from requirements if needed
pip install -r ../../requirements.txt
```

### 3. Run the Server

```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8080
```

The API will be available at `http://localhost:8080`

## API Endpoints

### Base URL
All authentication endpoints are prefixed with `/api/v1/auth`

---

### 1. User Signup

**POST** `/api/v1/auth/signup`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "John Doe"  // optional
}
```

**Validation Rules:**
- `email`: Must be a valid email address
- `password`: 8-128 characters
- `full_name`: Optional, max 255 characters

**Response (201 Created):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "tokens": {
    "access_token": "jwt_token_here",
    "refresh_token": "refresh_token_here",
    "token_type": "bearer",
    "expires_in": 3600,
    "expires_at": 1234567890
  }
}
```

---

### 2. User Login

**POST** `/api/v1/auth/login`

Authenticate with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "tokens": {
    "access_token": "jwt_token_here",
    "refresh_token": "refresh_token_here",
    "token_type": "bearer",
    "expires_in": 3600,
    "expires_at": 1234567890
  }
}
```

---

### 3. User Logout

**POST** `/api/v1/auth/logout`

Invalidate the current user session.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Successfully logged out"
}
```

---

### 4. Refresh Access Token

**POST** `/api/v1/auth/refresh`

Get a new access token using a refresh token.

**Request Body:**
```json
{
  "refresh_token": "refresh_token_here"
}
```

**Response (200 OK):**
```json
{
  "access_token": "new_jwt_token_here",
  "refresh_token": "new_refresh_token_here",
  "token_type": "bearer",
  "expires_in": 3600,
  "expires_at": 1234567890
}
```

---

### 5. Get Current User

**GET** `/api/v1/auth/me`

Get information about the currently authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

### 6. Auth Health Check

**GET** `/api/v1/auth/health`

Check authentication service health status.

**Response (200 OK):**
```json
{
  "message": "Authentication service is healthy"
}
```

---

## Error Responses

All endpoints return standardized error responses:

**401 Unauthorized:**
```json
{
  "detail": "Invalid email or password"
}
```

**400 Bad Request:**
```json
{
  "detail": "Signup failed: <error_message>"
}
```

**422 Validation Error:**
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

---

## Authentication Flow

### For Protected Routes

1. User signs up or logs in to receive tokens
2. Store the `access_token` securely (e.g., in memory or secure storage)
3. Include the token in the Authorization header for protected endpoints:
   ```
   Authorization: Bearer <access_token>
   ```
4. When the access token expires, use the `refresh_token` to get a new one
5. If refresh fails, redirect user to login

### Using Protected Routes in Your Code

```python
from fastapi import APIRouter, Depends
from src.core.dependencies import CurrentUser, OptionalUser

router = APIRouter()

# Required authentication
@router.get("/protected")
async def protected_route(current_user: CurrentUser):
    return {"user_id": current_user.id, "email": current_user.email}

# Optional authentication
@router.get("/public")
async def public_route(user: OptionalUser):
    if user:
        return {"message": f"Hello, {user.email}"}
    return {"message": "Hello, guest"}
```

---

## Project Structure

```
apps/backend/src/
├── api/
│   └── v1/
│       ├── auth_routes.py           # Authentication endpoints (signup, login, refresh)
│       └── __init__.py
├── core/
│   ├── config.py                    # Environment and settings configuration
│   ├── dependencies.py              # FastAPI dependencies (authentication & common DI)
│   └── __init__.py
├── domain/
│   ├── auth_models.py               # Pydantic models/schemas for authentication
│   └── __init__.py
├── infra/
│   ├── supabase_client.py           # Supabase client initialization and helpers
│   ├── gemini_client.py             # Google Gemini client initialization (if used)
│   └── __init__.py
├── services/
│   ├── auth_service.py              # Authentication business logic
│   └── __init__.py
└── main.py                          # FastAPI app factory and entry point
```

---

## Security Features

1. **Password Validation**: Enforces 8-128 character passwords
2. **Email Validation**: Uses Pydantic's EmailStr for proper email format
3. **JWT Tokens**: Secure token-based authentication via Supabase
4. **Token Refresh**: Automatic token refresh mechanism
5. **Input Sanitization**: Automatic whitespace trimming on string inputs
6. **Type Safety**: Full type hints throughout the codebase

---

## Interactive API Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: http://localhost:8080/docs
- **ReDoc**: http://localhost:8080/redoc

You can test all endpoints directly from the Swagger UI interface.

---

## Next Steps

This authentication system is ready for integration with your drink recipe features. You can now:

1. Create protected endpoints for drinks (CRUD operations)
2. Associate drinks with users via the user ID
3. Implement role-based access control if needed
4. Add password reset functionality
5. Implement email verification

---

## Testing with cURL

**Signup:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","full_name":"Test User"}'
```

**Login:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Get Current User:**
```bash
curl -X GET http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer <your_access_token>"
```


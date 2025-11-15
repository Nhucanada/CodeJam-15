Development Setup

Prerequisites

- Node.js and pnpm
- Python 3.11+

Installation

1. Install root dependencies:
pnpm install

2. Install frontend dependencies:
cd apps/frontend
pnpm install

3. Install backend dependencies:
cd apps/backend
pip3 install fastapi uvicorn pydantic python-multipart

Running the Application

1. Start the backend (from project root):
cd apps/backend
uvicorn src.main:app --reload --port 8000
Backend will be available at: http://127.0.0.1:8000

2. Start the frontend (from project root, in a new terminal):
cd apps/frontend
pnpm dev
Frontend will be available at: http://localhost:5173

URLs

- Frontend: http://localhost:5173
- Backend: http://127.0.0.1:8000
- Backend API docs: http://127.0.0.1:8000/docs
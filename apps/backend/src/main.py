from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# import the saq.py file for link finding 
from .saq import get_first_saq_url

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://frontend:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello from Python backend!"}

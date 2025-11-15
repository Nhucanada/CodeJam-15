import os 
import google.generativeai as genai 

GEMINI_MODEL_NAME="gemini-2.5-flash"

api_key= os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not set")

genai.configure(api_key=api_key)

model=genai.GenerativeModel(GEMINI_MODEL_NAME)

def ask_bartender(prompt: str) -> str:
    resp = model.generate_content(prompt)
    return resp.text
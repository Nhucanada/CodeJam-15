token = "eyJhbGciOiJIUzI1NiIsImtpZCI6ImtLM1pqTDFZUXdwKzhqMkMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2xtbHR5YWR4d29tZHpxa215ZG1kLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4MGY5YWVkZC0xNTA0LTQxYjctODJiMS1mOTFjYTNkMDhjNzIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYzMjcyNjQ5LCJpYXQiOjE3NjMyNjkwNDksImVtYWlsIjoiYWxiZXJ0OTMxMDIzQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJhbGJlcnQ5MzEwMjNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IlRlc3QgVXNlciIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiODBmOWFlZGQtMTUwNC00MWI3LTgyYjEtZjkxY2EzZDA4YzcyIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NjMyNjkwNDl9XSwic2Vzc2lvbl9pZCI6Ijg2ZjdkNGY5LTc5ZDYtNDAyOC1hMjJhLWYwMWRmZGEwZTk2NiIsImlzX2Fub255bW91cyI6ZmFsc2V9.wLvyySPqSEvZ-ILARA4Y3KXUYigtsSB0Dcmu15b9kJc"
    
# Enhanced test_websocket.py
import asyncio
import json
import sys
import websockets
import requests

def get_access_token():
    """Login and get access token."""
    print("Logging in...")
    response = requests.post(
        'http://localhost:8000/api/v1/auth/login',
        json={
            'email': 'albert931023@gmail.com',
            'password': 'SecurePassword123!'
        }
    )
    print(response)
    
    if response.status_code == 200:
        data = response.json()
        token = data['tokens']['access_token']

        print(f"✓ Login successful")
        return token
    else:
        print(f"✗ Login failed: {response.text}")
        sys.exit(1)

async def test_chat():
    # Get token automatically
    token = get_access_token()
    uri = f"ws://localhost:8000/api/v1/chat/ws?token={token}"
    
    print(f"\nConnecting to chat...")
    
    async with websockets.connect(uri) as websocket:
        # Wait for connection message
        response = await websocket.recv()
        data = json.loads(response)
        print(f"✓ Connected: {data}")
        
        # Send a message
        message = {
            "type": "user",
            "content": "Hello, Arthur! Can you recommend a cocktail?"
        }
        print(f"\nSending: {message['content']}")
        await websocket.send(json.dumps(message))
        
        # Receive responses
        full_response = ""
        while True:
            try:
                response = await websocket.recv()
                data = json.loads(response)
                
                if data.get("type") == "stream_start":
                    print("\n🍸 Arthur is responding...")
                    
                elif data.get("type") == "stream_delta":
                    # Print delta without newline for streaming effect
                    print(data.get("delta", ""), end="", flush=True)
                    full_response += data.get("delta", "")
                    
                elif data.get("type") == "stream_end":
                    print("\n\n✓ Response complete")
                    print(f"Full message: {data.get('content', full_response)}")
                    break
                    
                elif data.get("type") == "error":
                    print(f"\n✗ Error: {data.get('detail')}")
                    break
                    
            except websockets.exceptions.ConnectionClosed:
                print("\nConnection closed")
                break

# Run the test
if __name__ == "__main__":
    asyncio.run(test_chat())
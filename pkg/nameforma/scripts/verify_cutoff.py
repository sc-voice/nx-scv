#!/usr/bin/env ./venv/bin/python3
import requests

# Use your specific local IP
url = "http://192.168.0.215:1234/v1/chat/completions"
headers = {"Content-Type": "application/json"}
prompt = "What is your knowledge cutoff date?"

data = {
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 0.0  # Set to 0 for deterministic, non-creative testing
}

try:
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    answer = response.json()['choices'][0]['message']['content']
    
    if "January 2025" in answer:
        print("✅ SUCCESS: Endpoint is confirmed as Gemma 4 (Cutoff: Jan 2025).")
    else:
        print(f"❌ FAILURE: Unexpected cutoff date found: {answer}")
except Exception as e:
    print(f"❌ ERROR: Could not reach the endpoint. Error: {e}")

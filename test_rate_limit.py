#!/usr/bin/env python3
"""
Simple test to check if rate limiting is working
"""

import requests
import time

BACKEND_URL = "https://absence-tracker-21.preview.emergentagent.com/api"

def test_rate_limit():
    print("Testing rate limiting on login endpoint...")
    
    for i in range(7):
        response = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": "test@example.com",
            "password": "wrongpassword"
        })
        
        print(f"Attempt {i+1}: Status {response.status_code}")
        
        # Check for rate limit headers
        headers = response.headers
        if 'X-RateLimit-Limit' in headers:
            print(f"  Rate Limit Headers: Limit={headers.get('X-RateLimit-Limit')}, Remaining={headers.get('X-RateLimit-Remaining')}")
        else:
            print(f"  No rate limit headers found")
        
        if response.status_code == 429:
            print(f"  ✅ Rate limited on attempt {i+1}")
            break
        
        time.sleep(1)  # Small delay between requests
    
    print("Rate limit test completed")

if __name__ == "__main__":
    test_rate_limit()
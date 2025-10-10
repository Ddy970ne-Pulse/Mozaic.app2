#!/usr/bin/env python3
"""
Debug the absence import endpoint to understand validation behavior
"""

import requests
import json

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except FileNotFoundError:
        return "http://localhost:8001"
    return "http://localhost:8001"

BASE_URL = get_backend_url()
API_URL = f"{BASE_URL}/api"

def test_absence_import_debug():
    """Debug absence import with detailed logging"""
    
    # First authenticate
    auth_response = requests.post(
        f"{API_URL}/auth/login", 
        json={"email": "sophie.martin@company.com", "password": "demo123"}, 
        timeout=5
    )
    
    if auth_response.status_code != 200:
        print(f"❌ Authentication failed: {auth_response.status_code}")
        return
    
    auth_data = auth_response.json()
    auth_token = auth_data.get('token')
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    print("✅ Authentication successful")
    
    # Test 1: Valid data
    print("\n=== Test 1: Valid Absence Data ===")
    valid_data = [
        {
            "nom": "ADOLPHIN",
            "prenom": "Joël", 
            "date_debut": "2025-01-15",
            "jours_absence": "5",
            "motif_absence": "CA",
            "notes": "Congés annuels planifiés"
        }
    ]
    
    response = requests.post(
        f"{API_URL}/import/absences",
        json={
            "data_type": "absences",
            "data": valid_data,
            "overwrite_existing": False
        },
        headers=headers,
        timeout=10
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Test 2: Missing required fields
    print("\n=== Test 2: Missing Required Fields ===")
    invalid_data = [
        {
            "nom": "ADOLPHIN",
            # Missing prenom and motif_absence
            "date_debut": "2025-01-15",
            "jours_absence": "5"
        }
    ]
    
    response = requests.post(
        f"{API_URL}/import/absences",
        json={
            "data_type": "absences",
            "data": invalid_data,
            "overwrite_existing": False
        },
        headers=headers,
        timeout=10
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Test 3: Missing date_debut (should generate warning)
    print("\n=== Test 3: Missing Date Debut ===")
    missing_date_data = [
        {
            "nom": "ADOLPHIN",
            "prenom": "Joël",
            "jours_absence": "3",
            "motif_absence": "CA",
            "notes": "Test sans date"
        }
    ]
    
    response = requests.post(
        f"{API_URL}/import/absences",
        json={
            "data_type": "absences",
            "data": missing_date_data,
            "overwrite_existing": False
        },
        headers=headers,
        timeout=10
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Test 4: Non-existent employee
    print("\n=== Test 4: Non-existent Employee ===")
    nonexistent_data = [
        {
            "nom": "NONEXISTENT",
            "prenom": "Employee",
            "date_debut": "2025-01-15",
            "jours_absence": "5",
            "motif_absence": "CA"
        }
    ]
    
    response = requests.post(
        f"{API_URL}/import/absences",
        json={
            "data_type": "absences",
            "data": nonexistent_data,
            "overwrite_existing": False
        },
        headers=headers,
        timeout=10
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

if __name__ == "__main__":
    test_absence_import_debug()
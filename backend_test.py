#!/usr/bin/env python3
"""
Backend Testing Suite for MOZAIK RH System
Tests the FastAPI backend endpoints and functionality
"""

import requests
import json
import sys
import os
from datetime import datetime

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

class BackendTester:
    def __init__(self):
        self.results = {
            "api_health": {"status": "unknown", "details": []},
            "authentication": {"status": "unknown", "details": []},
            "delegation_hours": {"status": "unknown", "details": []},
            "data_retrieval": {"status": "unknown", "details": []},
            "overall_status": "unknown"
        }
        
    def log_result(self, category, success, message):
        """Log test result"""
        status = "pass" if success else "fail"
        self.results[category]["details"].append({"status": status, "message": message})
        print(f"[{status.upper()}] {category}: {message}")
        
    def test_api_health(self):
        """Test basic API health and connectivity"""
        print("\n=== Testing API Health ===")
        
        try:
            # Test root endpoint
            response = requests.get(f"{API_URL}/", timeout=10)
            if response.status_code == 200:
                self.log_result("api_health", True, f"Root endpoint accessible: {response.json()}")
            else:
                self.log_result("api_health", False, f"Root endpoint returned {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            self.log_result("api_health", False, f"Cannot connect to backend at {API_URL}")
            return False
        except Exception as e:
            self.log_result("api_health", False, f"Error testing root endpoint: {str(e)}")
            return False
            
        # Test status endpoints
        try:
            # Test GET status
            response = requests.get(f"{API_URL}/status", timeout=10)
            if response.status_code == 200:
                status_data = response.json()
                self.log_result("api_health", True, f"GET /status works, returned {len(status_data)} items")
            else:
                self.log_result("api_health", False, f"GET /status returned {response.status_code}")
                
            # Test POST status
            test_data = {"client_name": "test_client_mozaik"}
            response = requests.post(f"{API_URL}/status", json=test_data, timeout=10)
            if response.status_code == 200:
                created_status = response.json()
                self.log_result("api_health", True, f"POST /status works, created: {created_status.get('id', 'unknown')}")
            else:
                self.log_result("api_health", False, f"POST /status returned {response.status_code}")
                
        except Exception as e:
            self.log_result("api_health", False, f"Error testing status endpoints: {str(e)}")
            
        self.results["api_health"]["status"] = "pass" if any(d["status"] == "pass" for d in self.results["api_health"]["details"]) else "fail"
        return self.results["api_health"]["status"] == "pass"
        
    def test_authentication(self):
        """Test authentication endpoints for different user types"""
        print("\n=== Testing Authentication ===")
        
        # Test accounts from review request
        test_accounts = [
            {"email": "admin@company.com", "password": "demo123", "role": "admin", "name": "Sophie Martin"},
            {"email": "manager@company.com", "password": "demo123", "role": "manager", "name": "Jean Dupont"},
            {"email": "marie.leblanc@company.com", "password": "demo123", "role": "employee", "name": "Marie Leblanc"},
            {"email": "pierre.moreau@company.com", "password": "demo123", "role": "employee", "name": "Pierre Moreau"}
        ]
        
        # Check for common authentication endpoints
        auth_endpoints = ["/login", "/auth/login", "/authenticate", "/signin", "/auth"]
        
        found_auth_endpoint = False
        for endpoint in auth_endpoints:
            try:
                response = requests.post(f"{API_URL}{endpoint}", json={"email": "test", "password": "test"}, timeout=5)
                if response.status_code != 404:
                    found_auth_endpoint = True
                    self.log_result("authentication", True, f"Found authentication endpoint: {endpoint}")
                    
                    # Test with demo accounts
                    for account in test_accounts:
                        try:
                            auth_response = requests.post(
                                f"{API_URL}{endpoint}", 
                                json={"email": account["email"], "password": account["password"]}, 
                                timeout=5
                            )
                            if auth_response.status_code == 200:
                                self.log_result("authentication", True, f"Login successful for {account['name']} ({account['role']})")
                            else:
                                self.log_result("authentication", False, f"Login failed for {account['name']}: {auth_response.status_code}")
                        except Exception as e:
                            self.log_result("authentication", False, f"Error testing login for {account['name']}: {str(e)}")
                    break
            except:
                continue
                
        if not found_auth_endpoint:
            self.log_result("authentication", False, "No authentication endpoints found. Tested: /login, /auth/login, /authenticate, /signin, /auth")
            
        self.results["authentication"]["status"] = "pass" if any(d["status"] == "pass" for d in self.results["authentication"]["details"]) else "fail"
        
    def test_delegation_hours(self):
        """Test delegation hours module endpoints"""
        print("\n=== Testing Delegation Hours Module ===")
        
        # Check for delegation hours related endpoints
        delegation_endpoints = [
            "/delegation", "/delegation-hours", "/delegations", "/hours", 
            "/absence", "/absences", "/leave", "/motifs", "/delegation/hours"
        ]
        
        found_delegation_endpoint = False
        for endpoint in delegation_endpoints:
            try:
                response = requests.get(f"{API_URL}{endpoint}", timeout=5)
                if response.status_code != 404:
                    found_delegation_endpoint = True
                    self.log_result("delegation_hours", True, f"Found delegation endpoint: {endpoint} (status: {response.status_code})")
                    
                    # If it's a GET endpoint that works, try to get data
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            self.log_result("delegation_hours", True, f"GET {endpoint} returned data: {len(data) if isinstance(data, list) else 'object'}")
                        except:
                            self.log_result("delegation_hours", True, f"GET {endpoint} returned non-JSON response")
            except:
                continue
                
        if not found_delegation_endpoint:
            self.log_result("delegation_hours", False, "No delegation hours endpoints found. Expected endpoints for absence types, delegation management, etc.")
            
        # Test for specific absence types mentioned in requirements
        absence_types = ["arrêt maladie", "congé", "formation", "mission"]
        for absence_type in absence_types:
            try:
                response = requests.get(f"{API_URL}/absence-types", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    if any(absence_type.lower() in str(item).lower() for item in data):
                        self.log_result("delegation_hours", True, f"Found absence type: {absence_type}")
                    else:
                        self.log_result("delegation_hours", False, f"Absence type not found: {absence_type}")
                    break
            except:
                continue
                
        self.results["delegation_hours"]["status"] = "pass" if any(d["status"] == "pass" for d in self.results["delegation_hours"]["details"]) else "fail"
        
    def test_data_retrieval(self):
        """Test data retrieval endpoints for users, delegations, HR info"""
        print("\n=== Testing Data Retrieval ===")
        
        # Check for user data endpoints
        user_endpoints = ["/users", "/user", "/employees", "/employee", "/staff"]
        
        for endpoint in user_endpoints:
            try:
                response = requests.get(f"{API_URL}{endpoint}", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    self.log_result("data_retrieval", True, f"GET {endpoint} works, returned {len(data) if isinstance(data, list) else 'object'} items")
                elif response.status_code == 401:
                    self.log_result("data_retrieval", True, f"GET {endpoint} requires authentication (401) - endpoint exists")
                elif response.status_code != 404:
                    self.log_result("data_retrieval", False, f"GET {endpoint} returned {response.status_code}")
            except Exception as e:
                self.log_result("data_retrieval", False, f"Error testing {endpoint}: {str(e)}")
                
        # Check for HR data endpoints
        hr_endpoints = ["/departments", "/sites", "/contracts", "/categories", "/parameters"]
        
        for endpoint in hr_endpoints:
            try:
                response = requests.get(f"{API_URL}{endpoint}", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    self.log_result("data_retrieval", True, f"GET {endpoint} works, returned data")
                elif response.status_code == 401:
                    self.log_result("data_retrieval", True, f"GET {endpoint} requires authentication - endpoint exists")
                elif response.status_code != 404:
                    self.log_result("data_retrieval", False, f"GET {endpoint} returned {response.status_code}")
            except:
                continue
                
        self.results["data_retrieval"]["status"] = "pass" if any(d["status"] == "pass" for d in self.results["data_retrieval"]["details"]) else "fail"
        
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"Starting MOZAIK RH Backend Tests")
        print(f"Backend URL: {BASE_URL}")
        print(f"API URL: {API_URL}")
        print("=" * 50)
        
        # Run tests in order
        api_healthy = self.test_api_health()
        
        if api_healthy:
            self.test_authentication()
            self.test_delegation_hours()
            self.test_data_retrieval()
        else:
            print("Skipping other tests due to API health issues")
            
        # Determine overall status
        categories = ["api_health", "authentication", "delegation_hours", "data_retrieval"]
        passed_tests = sum(1 for cat in categories if self.results[cat]["status"] == "pass")
        
        if passed_tests == len(categories):
            self.results["overall_status"] = "pass"
        elif passed_tests >= 1:
            self.results["overall_status"] = "partial"
        else:
            self.results["overall_status"] = "fail"
            
        self.print_summary()
        return self.results
        
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 50)
        print("BACKEND TEST SUMMARY")
        print("=" * 50)
        
        for category, result in self.results.items():
            if category == "overall_status":
                continue
                
            status_icon = "✅" if result["status"] == "pass" else "❌"
            print(f"{status_icon} {category.replace('_', ' ').title()}: {result['status'].upper()}")
            
            for detail in result["details"]:
                detail_icon = "  ✓" if detail["status"] == "pass" else "  ✗"
                print(f"{detail_icon} {detail['message']}")
                
        print(f"\nOverall Status: {self.results['overall_status'].upper()}")
        
        if self.results['overall_status'] == 'fail':
            print("\n⚠️  CRITICAL ISSUES FOUND:")
            print("- Backend appears to be missing core MOZAIK RH functionality")
            print("- No authentication system implemented")
            print("- No delegation hours management endpoints")
            print("- No user/employee management system")
            
        elif self.results['overall_status'] == 'partial':
            print("\n⚠️  PARTIAL FUNCTIONALITY:")
            print("- Some basic endpoints work but core HR features missing")

if __name__ == "__main__":
    tester = BackendTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    if results["overall_status"] == "pass":
        sys.exit(0)
    elif results["overall_status"] == "partial":
        sys.exit(1)
    else:
        sys.exit(2)
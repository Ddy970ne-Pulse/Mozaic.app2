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
        
        # Test accounts from review request - focus on Sophie Martin as specified
        test_accounts = [
            {"email": "sophie.martin@company.com", "password": "demo123", "role": "admin", "name": "Sophie Martin"},
            {"email": "admin@company.com", "password": "demo123", "role": "admin", "name": "Sophie Martin"},
            {"email": "manager@company.com", "password": "demo123", "role": "manager", "name": "Jean Dupont"},
            {"email": "marie.leblanc@company.com", "password": "demo123", "role": "employee", "name": "Marie Leblanc"},
            {"email": "pierre.moreau@company.com", "password": "demo123", "role": "employee", "name": "Pierre Moreau"}
        ]
        
        # Check for authentication endpoint
        auth_endpoint = "/auth/login"
        auth_token = None
        
        try:
            # Test with Sophie Martin first (as specified in review request)
            sophie_account = test_accounts[0]  # sophie.martin@company.com
            auth_response = requests.post(
                f"{API_URL}{auth_endpoint}", 
                json={"email": sophie_account["email"], "password": sophie_account["password"]}, 
                timeout=5
            )
            if auth_response.status_code == 200:
                auth_data = auth_response.json()
                auth_token = auth_data.get('token')
                self.log_result("authentication", True, f"✅ Sophie Martin login successful (sophie.martin@company.com / demo123)")
                
                # Test /auth/me endpoint
                if auth_token:
                    me_response = requests.get(
                        f"{API_URL}/auth/me", 
                        headers={"Authorization": f"Bearer {auth_token}"}, 
                        timeout=5
                    )
                    if me_response.status_code == 200:
                        user_data = me_response.json()
                        self.log_result("authentication", True, f"User profile retrieval works: {user_data.get('name', 'Unknown')}")
                    else:
                        self.log_result("authentication", False, f"/auth/me returned {me_response.status_code}")
            else:
                self.log_result("authentication", False, f"Sophie Martin login failed: {auth_response.status_code}")
                
            # Test other accounts
            for account in test_accounts[1:]:
                try:
                    auth_response = requests.post(
                        f"{API_URL}{auth_endpoint}", 
                        json={"email": account["email"], "password": account["password"]}, 
                        timeout=5
                    )
                    if auth_response.status_code == 200:
                        self.log_result("authentication", True, f"Login successful for {account['name']} ({account['role']})")
                    else:
                        self.log_result("authentication", False, f"Login failed for {account['name']}: {auth_response.status_code}")
                except Exception as e:
                    self.log_result("authentication", False, f"Error testing login for {account['name']}: {str(e)}")
                    
        except Exception as e:
            self.log_result("authentication", False, f"Error testing authentication: {str(e)}")
            
        self.results["authentication"]["status"] = "pass" if any(d["status"] == "pass" for d in self.results["authentication"]["details"]) else "fail"
        return auth_token
        
    def test_delegation_hours(self, auth_token=None):
        """Test delegation hours module endpoints"""
        print("\n=== Testing Delegation Hours Module ===")
        
        headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
        
        # Test actual delegation endpoints from server.py
        delegation_endpoints = [
            "/delegation/delegates",
            "/delegation/usage", 
            "/delegation/cessions",
            "/absence-types",
            "/absence-requests"
        ]
        
        for endpoint in delegation_endpoints:
            try:
                response = requests.get(f"{API_URL}{endpoint}", headers=headers, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    self.log_result("delegation_hours", True, f"GET {endpoint} works, returned {len(data) if isinstance(data, list) else 'object'} items")
                elif response.status_code == 401:
                    self.log_result("delegation_hours", True, f"GET {endpoint} requires authentication (endpoint exists)")
                elif response.status_code == 403:
                    self.log_result("delegation_hours", True, f"GET {endpoint} requires proper permissions (endpoint exists)")
                else:
                    self.log_result("delegation_hours", False, f"GET {endpoint} returned {response.status_code}")
            except Exception as e:
                self.log_result("delegation_hours", False, f"Error testing {endpoint}: {str(e)}")
                
        # Test specific absence types for monthly planning
        try:
            response = requests.get(f"{API_URL}/absence-types", headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                required_codes = ["CA", "AM", "REC", "DEL", "TEL", "FO", "CT", "MAT", "STG"]
                found_codes = []
                for item in data:
                    if isinstance(item, dict) and item.get('code') in required_codes:
                        found_codes.append(item.get('code'))
                
                if found_codes:
                    self.log_result("delegation_hours", True, f"Found absence codes for monthly planning: {', '.join(found_codes)}")
                else:
                    self.log_result("delegation_hours", False, "No required absence codes found for monthly planning")
            else:
                self.log_result("delegation_hours", False, f"Cannot retrieve absence types: {response.status_code}")
        except Exception as e:
            self.log_result("delegation_hours", False, f"Error testing absence types: {str(e)}")
                
        self.results["delegation_hours"]["status"] = "pass" if any(d["status"] == "pass" for d in self.results["delegation_hours"]["details"]) else "fail"
        
    def test_data_retrieval(self, auth_token=None):
        """Test data retrieval endpoints for users, delegations, HR info"""
        print("\n=== Testing Data Retrieval ===")
        
        headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
        
        # Test user endpoints
        try:
            response = requests.get(f"{API_URL}/users", headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log_result("data_retrieval", True, f"GET /users works, returned {len(data)} users")
                
                # Check for Sophie Martin specifically
                sophie_found = any(user.get('name') == 'Sophie Martin' for user in data)
                if sophie_found:
                    self.log_result("data_retrieval", True, "Sophie Martin user found in users list")
                else:
                    self.log_result("data_retrieval", False, "Sophie Martin user not found in users list")
            else:
                self.log_result("data_retrieval", False, f"GET /users returned {response.status_code}")
        except Exception as e:
            self.log_result("data_retrieval", False, f"Error testing /users: {str(e)}")
                
        # Test HR configuration endpoints
        hr_endpoints = [
            "/hr-config/departments",
            "/hr-config/sites", 
            "/hr-config/contracts",
            "/hr-config/employee-categories"
        ]
        
        for endpoint in hr_endpoints:
            try:
                response = requests.get(f"{API_URL}{endpoint}", headers=headers, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    self.log_result("data_retrieval", True, f"GET {endpoint} works, returned data")
                else:
                    self.log_result("data_retrieval", False, f"GET {endpoint} returned {response.status_code}")
            except Exception as e:
                self.log_result("data_retrieval", False, f"Error testing {endpoint}: {str(e)}")
                
        # Test on-call management endpoints for monthly planning integration
        oncall_endpoints = [
            "/on-call/employees",
            "/on-call/assignments"
        ]
        
        for endpoint in oncall_endpoints:
            try:
                response = requests.get(f"{API_URL}{endpoint}", headers=headers, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    self.log_result("data_retrieval", True, f"GET {endpoint} works, returned {len(data) if isinstance(data, list) else 'object'} items")
                else:
                    self.log_result("data_retrieval", False, f"GET {endpoint} returned {response.status_code}")
            except Exception as e:
                self.log_result("data_retrieval", False, f"Error testing {endpoint}: {str(e)}")
                
        self.results["data_retrieval"]["status"] = "pass" if any(d["status"] == "pass" for d in self.results["data_retrieval"]["details"]) else "fail"
        
    def test_monthly_planning_support(self, auth_token=None):
        """Test endpoints that support monthly planning and print functionality"""
        print("\n=== Testing Monthly Planning Support ===")
        
        headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
        
        # Test analytics endpoint for planning data
        try:
            response = requests.get(f"{API_URL}/analytics/absence-kpi", headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log_result("monthly_planning", True, "Analytics KPI endpoint works for planning statistics")
                
                # Check for required data structure
                if 'byCategory' in data and 'monthlyTrend' in data:
                    self.log_result("monthly_planning", True, "Analytics data contains monthly trends and categories for planning")
                else:
                    self.log_result("monthly_planning", False, "Analytics data missing required planning structure")
            else:
                self.log_result("monthly_planning", False, f"Analytics KPI endpoint returned {response.status_code}")
        except Exception as e:
            self.log_result("monthly_planning", False, f"Error testing analytics endpoint: {str(e)}")
            
        # Test on-call export functionality (for enhanced print features)
        try:
            response = requests.get(f"{API_URL}/on-call/export/9/2025", headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log_result("monthly_planning", True, "On-call export endpoint works (supports enhanced print functionality)")
            else:
                self.log_result("monthly_planning", False, f"On-call export endpoint returned {response.status_code}")
        except Exception as e:
            self.log_result("monthly_planning", False, f"Error testing on-call export: {str(e)}")
            
        # Test on-call validation (CCN66 compliance)
        try:
            validation_data = {
                "employeeId": "1",
                "startDate": "2025-01-15",
                "endDate": "2025-01-16"
            }
            response = requests.post(f"{API_URL}/on-call/validate", json=validation_data, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log_result("monthly_planning", True, "On-call validation endpoint works (CCN66 compliance)")
            else:
                self.log_result("monthly_planning", False, f"On-call validation returned {response.status_code}")
        except Exception as e:
            self.log_result("monthly_planning", False, f"Error testing on-call validation: {str(e)}")
            
        self.results["monthly_planning"]["status"] = "pass" if any(d["status"] == "pass" for d in self.results["monthly_planning"]["details"]) else "fail"

    def run_all_tests(self):
        """Run all backend tests"""
        print(f"Starting MOZAIK RH Backend Tests - Focus on Monthly Planning & Print Support")
        print(f"Backend URL: {BASE_URL}")
        print(f"API URL: {API_URL}")
        print("=" * 70)
        
        # Initialize monthly_planning results
        self.results["monthly_planning"] = {"status": "unknown", "details": []}
        
        # Run tests in order
        api_healthy = self.test_api_health()
        
        if api_healthy:
            auth_token = self.test_authentication()
            self.test_delegation_hours(auth_token)
            self.test_data_retrieval(auth_token)
            self.test_monthly_planning_support(auth_token)
        else:
            print("Skipping other tests due to API health issues")
            
        # Determine overall status
        categories = ["api_health", "authentication", "delegation_hours", "data_retrieval", "monthly_planning"]
        passed_tests = sum(1 for cat in categories if self.results[cat]["status"] == "pass")
        
        if passed_tests == len(categories):
            self.results["overall_status"] = "pass"
        elif passed_tests >= 3:  # At least API health, auth, and one other
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
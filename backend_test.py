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
            "excel_import": {"status": "unknown", "details": []},
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
        
        # Test accounts - first try original Sophie Martin, then try new DACALOR Diego admin
        test_accounts = [
            {"email": "sophie.martin@company.com", "password": "demo123", "role": "admin", "name": "Sophie Martin"},
            {"email": "diego.dacalor@company.com", "password": "admin123", "role": "admin", "name": "DACALOR Diégo"},
            {"email": "admin@company.com", "password": "demo123", "role": "admin", "name": "Sophie Martin"},
            {"email": "manager@company.com", "password": "demo123", "role": "manager", "name": "Jean Dupont"},
            {"email": "marie.leblanc@company.com", "password": "demo123", "role": "employee", "name": "Marie Leblanc"},
            {"email": "pierre.moreau@company.com", "password": "demo123", "role": "employee", "name": "Pierre Moreau"}
        ]
        
        # Check for authentication endpoint
        auth_endpoint = "/auth/login"
        auth_token = None
        
        try:
            # Test with Sophie Martin first, then try DACALOR Diego if Sophie fails
            sophie_account = test_accounts[0]  # sophie.martin@company.com
            diego_account = test_accounts[1]   # diego.dacalor@company.com
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

    def test_excel_import_functionality(self, auth_token=None):
        """Test Excel import backend functionality comprehensively"""
        print("\n=== Testing Excel Import Backend Functionality ===")
        
        headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
        
        # Test data samples as specified in review request
        valid_employee_data = [
            {
                "nom": "Test",
                "prenom": "User", 
                "email": "test@example.com",
                "departement": "IT"
            }
        ]
        
        invalid_employee_data = [
            {
                "nom": "Test",
                "prenom": "User"
                # Missing email and departement
            }
        ]
        
        valid_absence_data = [
            {
                "employee_name": "Test User",
                "date_debut": "2025-01-15",
                "jours_absence": "5",
                "motif_absence": "CA"
            }
        ]
        
        valid_work_hours_data = [
            {
                "employee_name": "Test User",
                "date": "2025-01-15",
                "heures_travaillees": 8.0
            }
        ]
        
        # 1. Test Admin Access Control - All 5 import endpoints with admin token
        import_endpoints = [
            "/import/validate",
            "/import/employees", 
            "/import/absences",
            "/import/work-hours",
            "/import/reset-demo",
            "/import/statistics"
        ]
        
        print("\n--- Testing Admin Access Control ---")
        for endpoint in import_endpoints:
            try:
                if endpoint == "/import/statistics":
                    # GET endpoint
                    response = requests.get(f"{API_URL}{endpoint}", headers=headers, timeout=10)
                elif endpoint == "/import/reset-demo":
                    # POST endpoint without data
                    response = requests.post(f"{API_URL}{endpoint}", headers=headers, timeout=10)
                else:
                    # POST endpoints with test data
                    test_data = {
                        "data_type": "employees",
                        "data": valid_employee_data
                    }
                    response = requests.post(f"{API_URL}{endpoint}", json=test_data, headers=headers, timeout=10)
                
                if response.status_code in [200, 201]:
                    self.log_result("excel_import", True, f"✅ Admin access to {endpoint} works (status: {response.status_code})")
                elif response.status_code == 401:
                    self.log_result("excel_import", False, f"❌ {endpoint} returned 401 with admin token")
                elif response.status_code == 403:
                    self.log_result("excel_import", False, f"❌ {endpoint} returned 403 with admin token")
                else:
                    self.log_result("excel_import", False, f"❌ {endpoint} returned unexpected status: {response.status_code}")
                    
            except Exception as e:
                self.log_result("excel_import", False, f"❌ Error testing {endpoint}: {str(e)}")
        
        # 2. Test endpoints without token (should get 401)
        print("\n--- Testing Access Control Without Token ---")
        for endpoint in import_endpoints[:4]:  # Skip reset-demo and statistics for this test
            try:
                test_data = {
                    "data_type": "employees", 
                    "data": valid_employee_data
                }
                response = requests.post(f"{API_URL}{endpoint}", json=test_data, timeout=10)
                
                if response.status_code == 401:
                    self.log_result("excel_import", True, f"✅ {endpoint} correctly returns 401 without token")
                else:
                    self.log_result("excel_import", False, f"❌ {endpoint} should return 401 without token, got {response.status_code}")
                    
            except Exception as e:
                self.log_result("excel_import", False, f"❌ Error testing {endpoint} without token: {str(e)}")
        
        # 3. Test Demo Account Reset & Admin Creation
        print("\n--- Testing Demo Account Reset ---")
        try:
            response = requests.post(f"{API_URL}/import/reset-demo", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'new_admin' in data:
                    new_admin = data['new_admin']
                    expected_email = "diego.dacalor@company.com"
                    expected_password = "admin123"
                    
                    if (new_admin.get('email') == expected_email and 
                        new_admin.get('password') == expected_password):
                        self.log_result("excel_import", True, f"✅ Demo reset creates DACALOR Diego admin correctly")
                    else:
                        self.log_result("excel_import", False, f"❌ Demo reset admin credentials incorrect")
                else:
                    self.log_result("excel_import", False, f"❌ Demo reset response missing required fields")
            else:
                self.log_result("excel_import", False, f"❌ Demo reset returned {response.status_code}")
        except Exception as e:
            self.log_result("excel_import", False, f"❌ Error testing demo reset: {str(e)}")
        
        # 4. Test Data Validation System
        print("\n--- Testing Data Validation System ---")
        
        # Test valid employee data validation
        try:
            validation_request = {
                "data_type": "employees",
                "data": valid_employee_data
            }
            response = requests.post(f"{API_URL}/import/validate", json=validation_request, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('success') == True and data.get('failed_imports') == 0:
                    self.log_result("excel_import", True, f"✅ Valid employee data validation passes")
                else:
                    self.log_result("excel_import", False, f"❌ Valid employee data validation failed")
            else:
                self.log_result("excel_import", False, f"❌ Employee validation returned {response.status_code}")
        except Exception as e:
            self.log_result("excel_import", False, f"❌ Error testing employee validation: {str(e)}")
        
        # Test invalid employee data validation
        try:
            validation_request = {
                "data_type": "employees",
                "data": invalid_employee_data
            }
            response = requests.post(f"{API_URL}/import/validate", json=validation_request, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('success') == False and len(data.get('errors', [])) > 0:
                    errors = data.get('errors', [])
                    required_field_errors = [e for e in errors if 'email' in e.get('error', '') or 'departement' in e.get('error', '')]
                    if required_field_errors:
                        self.log_result("excel_import", True, f"✅ Invalid employee data validation catches missing required fields")
                    else:
                        self.log_result("excel_import", False, f"❌ Validation didn't catch missing required fields")
                else:
                    self.log_result("excel_import", False, f"❌ Invalid employee data should fail validation")
            else:
                self.log_result("excel_import", False, f"❌ Employee validation returned {response.status_code}")
        except Exception as e:
            self.log_result("excel_import", False, f"❌ Error testing invalid employee validation: {str(e)}")
        
        # Test absence data validation
        try:
            validation_request = {
                "data_type": "absences",
                "data": valid_absence_data
            }
            response = requests.post(f"{API_URL}/import/validate", json=validation_request, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('success') == True:
                    self.log_result("excel_import", True, f"✅ Absence data validation works")
                else:
                    self.log_result("excel_import", False, f"❌ Valid absence data validation failed")
            else:
                self.log_result("excel_import", False, f"❌ Absence validation returned {response.status_code}")
        except Exception as e:
            self.log_result("excel_import", False, f"❌ Error testing absence validation: {str(e)}")
        
        # Test work hours validation
        try:
            validation_request = {
                "data_type": "work_hours",
                "data": valid_work_hours_data
            }
            response = requests.post(f"{API_URL}/import/validate", json=validation_request, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('success') == True:
                    self.log_result("excel_import", True, f"✅ Work hours data validation works")
                else:
                    self.log_result("excel_import", False, f"❌ Valid work hours data validation failed")
            else:
                self.log_result("excel_import", False, f"❌ Work hours validation returned {response.status_code}")
        except Exception as e:
            self.log_result("excel_import", False, f"❌ Error testing work hours validation: {str(e)}")
        
        # 5. Test Import Endpoints Functionality
        print("\n--- Testing Import Endpoints ---")
        
        # Test employee import
        try:
            import_request = {
                "data_type": "employees",
                "data": valid_employee_data,
                "overwrite_existing": False
            }
            response = requests.post(f"{API_URL}/import/employees", json=import_request, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('successful_imports') > 0:
                    self.log_result("excel_import", True, f"✅ Employee import creates database records")
                else:
                    self.log_result("excel_import", False, f"❌ Employee import failed to create records")
            else:
                self.log_result("excel_import", False, f"❌ Employee import returned {response.status_code}")
        except Exception as e:
            self.log_result("excel_import", False, f"❌ Error testing employee import: {str(e)}")
        
        # Test absence import
        try:
            import_request = {
                "data_type": "absences",
                "data": valid_absence_data,
                "overwrite_existing": False
            }
            response = requests.post(f"{API_URL}/import/absences", json=import_request, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('successful_imports') >= 0:  # May be 0 if employee not found
                    self.log_result("excel_import", True, f"✅ Absence import endpoint functional")
                else:
                    self.log_result("excel_import", False, f"❌ Absence import failed")
            else:
                self.log_result("excel_import", False, f"❌ Absence import returned {response.status_code}")
        except Exception as e:
            self.log_result("excel_import", False, f"❌ Error testing absence import: {str(e)}")
        
        # Test work hours import
        try:
            import_request = {
                "data_type": "work_hours",
                "data": valid_work_hours_data,
                "overwrite_existing": False
            }
            response = requests.post(f"{API_URL}/import/work-hours", json=import_request, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('successful_imports') >= 0:  # May be 0 if employee not found
                    self.log_result("excel_import", True, f"✅ Work hours import endpoint functional")
                else:
                    self.log_result("excel_import", False, f"❌ Work hours import failed")
            else:
                self.log_result("excel_import", False, f"❌ Work hours import returned {response.status_code}")
        except Exception as e:
            self.log_result("excel_import", False, f"❌ Error testing work hours import: {str(e)}")
        
        # 6. Test Statistics & Monitoring
        print("\n--- Testing Statistics & Monitoring ---")
        try:
            response = requests.get(f"{API_URL}/import/statistics", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                required_fields = ['employees', 'absences', 'work_hours', 'total_records']
                if all(field in data for field in required_fields):
                    self.log_result("excel_import", True, f"✅ Statistics endpoint returns proper counts: {data}")
                else:
                    self.log_result("excel_import", False, f"❌ Statistics missing required fields")
            else:
                self.log_result("excel_import", False, f"❌ Statistics endpoint returned {response.status_code}")
        except Exception as e:
            self.log_result("excel_import", False, f"❌ Error testing statistics: {str(e)}")
        
        # 7. Test Error Handling
        print("\n--- Testing Error Handling ---")
        
        # Test malformed JSON
        try:
            response = requests.post(
                f"{API_URL}/import/validate", 
                data="invalid json", 
                headers={**headers, "Content-Type": "application/json"}, 
                timeout=10
            )
            if response.status_code == 422:  # FastAPI validation error
                self.log_result("excel_import", True, f"✅ Malformed JSON returns proper error (422)")
            else:
                self.log_result("excel_import", False, f"❌ Malformed JSON should return 422, got {response.status_code}")
        except Exception as e:
            self.log_result("excel_import", False, f"❌ Error testing malformed JSON: {str(e)}")
        
        # Test missing Authorization header
        try:
            test_data = {"data_type": "employees", "data": valid_employee_data}
            response = requests.post(f"{API_URL}/import/validate", json=test_data, timeout=10)
            if response.status_code == 401:
                self.log_result("excel_import", True, f"✅ Missing auth header returns 401")
            else:
                self.log_result("excel_import", False, f"❌ Missing auth should return 401, got {response.status_code}")
        except Exception as e:
            self.log_result("excel_import", False, f"❌ Error testing missing auth: {str(e)}")
        
        self.results["excel_import"]["status"] = "pass" if any(d["status"] == "pass" for d in self.results["excel_import"]["details"]) else "fail"

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
            self.test_excel_import_functionality(auth_token)
        else:
            print("Skipping other tests due to API health issues")
            
        # Determine overall status
        categories = ["api_health", "authentication", "delegation_hours", "data_retrieval", "monthly_planning", "excel_import"]
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
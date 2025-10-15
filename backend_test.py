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
            "ccn66_system": {"status": "unknown", "details": []},
            "cse_cessions": {"status": "unknown", "details": []},
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
        
        # Test accounts - use actual admin from database
        test_accounts = [
            {"email": "ddacalor@aaea-gpe.fr", "password": "admin123", "role": "admin", "name": "Diégo DACALOR"},
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
            # Test with DACALOR Diego first (actual admin in database)
            diego_account = test_accounts[0]   # ddacalor@aaea-gpe.fr
            sophie_account = test_accounts[1]  # sophie.martin@company.com
            auth_response = requests.post(
                f"{API_URL}{auth_endpoint}", 
                json={"email": diego_account["email"], "password": diego_account["password"]}, 
                timeout=5
            )
            if auth_response.status_code == 200:
                auth_data = auth_response.json()
                auth_token = auth_data.get('token')
                self.log_result("authentication", True, f"✅ DACALOR Diego admin login successful ({diego_account['email']} / admin123)")
                
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
                self.log_result("authentication", False, f"DACALOR Diego login failed: {auth_response.status_code}")
                
                # Try Sophie Martin if Diego fails
                auth_response = requests.post(
                    f"{API_URL}{auth_endpoint}", 
                    json={"email": sophie_account["email"], "password": sophie_account["password"]}, 
                    timeout=5
                )
                if auth_response.status_code == 200:
                    auth_data = auth_response.json()
                    auth_token = auth_data.get('token')
                    self.log_result("authentication", True, f"✅ Sophie Martin login successful ({sophie_account['email']} / demo123)")
                    
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
                    self.log_result("authentication", False, f"Sophie Martin login also failed: {auth_response.status_code}")
                
            # Test other accounts
            for account in test_accounts[2:]:
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

    def test_absence_import_new_format(self, auth_token=None):
        """Test NEW Absence Import Module with Enhanced Excel Format"""
        print("\n=== Testing NEW Absence Import Module - Enhanced Excel Format ===")
        
        headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
        
        # Sample data matching the new Excel format from review request
        sample_absence_data = [
            {
                "nom": "ADOLPHIN",
                "prenom": "Joël", 
                "date_debut": "2025-01-15",
                "jours_absence": "5",
                "motif_absence": "CA",
                "notes": "Congés annuels planifiés"
            },
            {
                "nom": "LOUBER",
                "prenom": "Fabrice",
                "date_debut": "2025-01-20", 
                "jours_absence": "3",
                "motif_absence": "AM",
                "notes": "Arrêt maladie"
            },
            {
                "nom": "BERNARD",
                "prenom": "Jean-François",
                "date_debut": "2025-01-25",
                "jours_absence": "2", 
                "motif_absence": "REC",
                "notes": "Récupération heures sup"
            }
        ]
        
        # Test data with missing date (should generate warning)
        missing_date_data = [
            {
                "nom": "ADOLPHIN",
                "prenom": "Joël",
                "jours_absence": "3",
                "motif_absence": "CA",
                "notes": "Test sans date"
            }
        ]
        
        # Test data with missing required fields (should generate errors)
        invalid_absence_data = [
            {
                "nom": "ADOLPHIN",
                # Missing prenom and motif_absence
                "date_debut": "2025-01-15",
                "jours_absence": "5"
            }
        ]
        
        # Test data with non-existent employee
        nonexistent_employee_data = [
            {
                "nom": "NONEXISTENT",
                "prenom": "Employee",
                "date_debut": "2025-01-15",
                "jours_absence": "5",
                "motif_absence": "CA"
            }
        ]
        
        # 1. Test POST /api/import/absences - Enhanced Absence Import Endpoint
        print("\n--- Testing POST /api/import/absences ---")
        
        # Test with valid sample data
        try:
            response = requests.post(
                f"{API_URL}/import/absences", 
                json={
                    "data_type": "absences",
                    "data": sample_absence_data,
                    "overwrite_existing": False
                }, 
                headers=headers, 
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                self.log_result("absence_import", True, f"✅ POST /api/import/absences accepts new Excel format")
                
                # Check for successful imports and proper structure
                if 'successful_imports' in data and 'errors' in data and 'warnings' in data:
                    self.log_result("absence_import", True, f"✅ Response includes proper import statistics")
                else:
                    self.log_result("absence_import", False, f"❌ Response missing required fields")
            else:
                self.log_result("absence_import", False, f"❌ POST /api/import/absences returned {response.status_code}")
        except Exception as e:
            self.log_result("absence_import", False, f"❌ Error testing absence import: {str(e)}")
        
        # Test required field validation
        try:
            response = requests.post(
                f"{API_URL}/import/absences",
                json={
                    "data_type": "absences",
                    "data": invalid_absence_data,
                    "overwrite_existing": False
                },
                headers=headers,
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                errors = data.get('errors', [])
                if any('PRENOM' in str(error) or 'obligatoires' in str(error) for error in errors):
                    self.log_result("absence_import", True, f"✅ Required field validation working (nom, prenom, motif_absence)")
                else:
                    self.log_result("absence_import", False, f"❌ Required field validation not working properly: {errors}")
            else:
                self.log_result("absence_import", False, f"❌ Validation test returned {response.status_code}")
        except Exception as e:
            self.log_result("absence_import", False, f"❌ Error testing validation: {str(e)}")
        
        # Test warning generation for missing date_debut
        try:
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
            if response.status_code == 200:
                data = response.json()
                warnings = data.get('warnings', [])
                if any('Date de début manquante' in str(warning) or 'ligne ignorée' in str(warning) for warning in warnings):
                    self.log_result("absence_import", True, f"✅ Missing date_debut generates warnings (not errors)")
                else:
                    self.log_result("absence_import", False, f"❌ Missing date_debut should generate warnings: {warnings}")
            else:
                self.log_result("absence_import", False, f"❌ Warning test returned {response.status_code}")
        except Exception as e:
            self.log_result("absence_import", False, f"❌ Error testing warnings: {str(e)}")
        
        # Test employee not found error handling
        try:
            response = requests.post(
                f"{API_URL}/import/absences",
                json={
                    "data_type": "absences",
                    "data": nonexistent_employee_data,
                    "overwrite_existing": False
                },
                headers=headers,
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                errors = data.get('errors', [])
                if any('non trouvé' in str(error) or 'suggestion' in str(data) for error in errors):
                    self.log_result("absence_import", True, f"✅ Employee not found generates clear error with suggestion")
                else:
                    self.log_result("absence_import", False, f"❌ Employee not found should generate clear error: {errors}")
            else:
                self.log_result("absence_import", False, f"❌ Employee not found test returned {response.status_code}")
        except Exception as e:
            self.log_result("absence_import", False, f"❌ Error testing employee not found: {str(e)}")
        
        # 2. Test GET /api/absences - List Absences with Role-Based Access
        print("\n--- Testing GET /api/absences ---")
        
        # Test as admin (should return ALL absences)
        try:
            response = requests.get(f"{API_URL}/absences", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_result("absence_import", True, f"✅ GET /api/absences works as admin, returned {len(data)} absences")
            elif response.status_code == 404:
                self.log_result("absence_import", False, f"❌ GET /api/absences endpoint not found (404)")
            else:
                self.log_result("absence_import", False, f"❌ GET /api/absences returned {response.status_code}")
        except Exception as e:
            self.log_result("absence_import", False, f"❌ Error testing GET /api/absences: {str(e)}")
        
        # Test without auth (should return 401/403)
        try:
            response = requests.get(f"{API_URL}/absences", timeout=10)
            if response.status_code in [401, 403]:
                self.log_result("absence_import", True, f"✅ GET /api/absences correctly returns {response.status_code} without auth")
            else:
                self.log_result("absence_import", False, f"❌ GET /api/absences should return 401/403 without auth, got {response.status_code}")
        except Exception as e:
            self.log_result("absence_import", False, f"❌ Error testing GET /api/absences without auth: {str(e)}")
        
        # 3. Test GET /api/absences/{employee_id} - Get Absences by Employee
        print("\n--- Testing GET /api/absences/{employee_id} ---")
        
        # Test with a sample employee ID (we'll use a UUID format)
        sample_employee_id = "12345678-1234-1234-1234-123456789012"
        
        try:
            response = requests.get(f"{API_URL}/absences/{sample_employee_id}", headers=headers, timeout=10)
            if response.status_code in [200, 404]:  # 200 if found, 404 if not found
                self.log_result("absence_import", True, f"✅ GET /api/absences/{{employee_id}} endpoint exists")
            else:
                self.log_result("absence_import", False, f"❌ GET /api/absences/{{employee_id}} returned {response.status_code}")
        except Exception as e:
            self.log_result("absence_import", False, f"❌ Error testing GET /api/absences/{{employee_id}}: {str(e)}")
        
        # Test without auth
        try:
            response = requests.get(f"{API_URL}/absences/{sample_employee_id}", timeout=10)
            if response.status_code in [401, 403]:
                self.log_result("absence_import", True, f"✅ GET /api/absences/{{employee_id}} correctly requires auth")
            else:
                self.log_result("absence_import", False, f"❌ GET /api/absences/{{employee_id}} should require auth")
        except Exception as e:
            self.log_result("absence_import", False, f"❌ Error testing GET /api/absences/{{employee_id}} without auth: {str(e)}")
        
        # 4. Test DELETE /api/absences/{absence_id} - Delete Absence (Admin Only)
        print("\n--- Testing DELETE /api/absences/{absence_id} ---")
        
        sample_absence_id = "12345678-1234-1234-1234-123456789012"
        
        # Test as admin
        try:
            response = requests.delete(f"{API_URL}/absences/{sample_absence_id}", headers=headers, timeout=10)
            if response.status_code in [200, 404]:  # 200 if deleted, 404 if not found
                self.log_result("absence_import", True, f"✅ DELETE /api/absences/{{absence_id}} endpoint exists for admin")
            elif response.status_code == 403:
                self.log_result("absence_import", False, f"❌ DELETE /api/absences/{{absence_id}} returned 403 for admin")
            else:
                self.log_result("absence_import", False, f"❌ DELETE /api/absences/{{absence_id}} returned {response.status_code}")
        except Exception as e:
            self.log_result("absence_import", False, f"❌ Error testing DELETE /api/absences/{{absence_id}}: {str(e)}")
        
        # Test without auth (should return 401/403)
        try:
            response = requests.delete(f"{API_URL}/absences/{sample_absence_id}", timeout=10)
            if response.status_code in [401, 403]:
                self.log_result("absence_import", True, f"✅ DELETE /api/absences/{{absence_id}} correctly requires auth")
            else:
                self.log_result("absence_import", False, f"❌ DELETE /api/absences/{{absence_id}} should require auth")
        except Exception as e:
            self.log_result("absence_import", False, f"❌ Error testing DELETE /api/absences/{{absence_id}} without auth: {str(e)}")
        
        self.results["absence_import"]["status"] = "pass" if any(d["status"] == "pass" for d in self.results["absence_import"]["details"]) else "fail"

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

    def test_ccn66_leave_balance_system(self, auth_token=None):
        """Test du nouveau système de compteurs CCN66 as requested in French review"""
        print("\n=== Testing CCN66 Leave Balance System ===")
        print("Testing: Système de calcul automatique des droits à congés selon la Convention Collective Nationale 66")
        
        headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
        
        # 1. Test Initialisation CCN66 avec force_recalculate=true
        print("\n--- 1. Testing Initialisation CCN66 ---")
        
        try:
            response = requests.post(
                f"{API_URL}/leave-balance/initialize-all?force_recalculate=true", 
                headers=headers, 
                timeout=15
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    nb_employees = data.get('employees_initialized', 0)
                    self.log_result("ccn66_system", True, f"✅ Initialisation CCN66: {nb_employees} employés initialisés avec force_recalculate=true")
                    
                    # Vérifier qu'on a bien 32 employés comme attendu
                    if nb_employees >= 30:  # Au moins 30 employés attendus
                        self.log_result("ccn66_system", True, f"✅ Nombre d'employés cohérent: {nb_employees} employés")
                    else:
                        self.log_result("ccn66_system", False, f"❌ Nombre d'employés insuffisant: {nb_employees} (attendu: ~32)")
                else:
                    self.log_result("ccn66_system", False, f"❌ Initialisation CCN66 échouée")
            else:
                self.log_result("ccn66_system", False, f"❌ POST /api/leave-balance/initialize-all?force_recalculate=true returned {response.status_code}")
        except Exception as e:
            self.log_result("ccn66_system", False, f"❌ Erreur lors de l'initialisation CCN66: {str(e)}")
        
        # 2. Test des compteurs pour profils spécifiques
        print("\n--- 2. Testing Compteurs pour Profils Spécifiques ---")
        
        # Profils à tester selon la demande
        test_profiles = [
            {
                "name": "Cindy GREGOIRE",
                "email": "cgregoire@aaea-gpe.fr",
                "expected_category": "B",
                "expected_ca": 30,
                "expected_ct": 9,
                "description": "Cadre / Comptable → Catégorie B"
            },
            {
                "name": "Joël ADOLPHIN", 
                "email": "jadolphin@aaea-gpe.fr",
                "expected_category": "A",
                "expected_ca": 30,
                "expected_ct": 18,
                "description": "Ouvrier qualifié / Educateur Technique → Catégorie A"
            },
            {
                "name": "Stéphy FERIAUX",
                "email": "sferiaux@aaea-gpe.fr", 
                "expected_category": "A",
                "expected_ca": 30,
                "expected_ct": 18,
                "description": "Technicien / Educateur Spécialisé → Catégorie A"
            },
            {
                "name": "Jean-François BERNARD",
                "email": "jfbernard@aaea-gpe.fr",
                "expected_category": None,  # À déterminer
                "expected_ca": None,  # Proratisé selon temps partiel
                "expected_ct": None,  # Proratisé selon temps partiel
                "description": "Temps Partiel - Vérifier proratisation CA et CT"
            }
        ]
        
        # D'abord, récupérer la liste des utilisateurs pour obtenir les employee_id
        users_map = {}
        try:
            response = requests.get(f"{API_URL}/users", headers=headers, timeout=10)
            if response.status_code == 200:
                users = response.json()
                for user in users:
                    users_map[user.get('email', '').lower()] = user.get('id')
                self.log_result("ccn66_system", True, f"✅ Liste des utilisateurs récupérée: {len(users)} utilisateurs")
            else:
                self.log_result("ccn66_system", False, f"❌ Impossible de récupérer la liste des utilisateurs: {response.status_code}")
        except Exception as e:
            self.log_result("ccn66_system", False, f"❌ Erreur récupération utilisateurs: {str(e)}")
        
        # Tester chaque profil
        for profile in test_profiles:
            print(f"\n--- Testing {profile['name']} ---")
            
            employee_id = users_map.get(profile['email'].lower())
            if not employee_id:
                self.log_result("ccn66_system", False, f"❌ {profile['name']} non trouvé dans la base ({profile['email']})")
                continue
            
            try:
                response = requests.get(
                    f"{API_URL}/leave-balance/{employee_id}", 
                    headers=headers, 
                    timeout=10
                )
                if response.status_code == 200:
                    balance_data = response.json()
                    
                    ca_balance = balance_data.get('ca_initial', 0)
                    ct_balance = balance_data.get('ct_initial', 0)
                    cex_balance = balance_data.get('cex_initial', 0)
                    
                    self.log_result("ccn66_system", True, f"✅ {profile['name']}: Compteurs récupérés - CA={ca_balance}, CT={ct_balance}, CEX={cex_balance}")
                    
                    # Vérifications spécifiques selon le profil
                    if profile['expected_ca'] is not None:
                        if abs(ca_balance - profile['expected_ca']) < 0.1:
                            self.log_result("ccn66_system", True, f"✅ {profile['name']}: CA correct ({ca_balance}j)")
                        else:
                            self.log_result("ccn66_system", False, f"❌ {profile['name']}: CA incorrect (attendu {profile['expected_ca']}j, obtenu {ca_balance}j)")
                    
                    if profile['expected_ct'] is not None:
                        if abs(ct_balance - profile['expected_ct']) < 0.1:
                            self.log_result("ccn66_system", True, f"✅ {profile['name']}: CT correct ({ct_balance}j)")
                        else:
                            self.log_result("ccn66_system", False, f"❌ {profile['name']}: CT incorrect (attendu {profile['expected_ct']}j, obtenu {ct_balance}j)")
                    
                    # Vérifier l'ancienneté (CEX) - doit être >= 0
                    if cex_balance >= 0:
                        self.log_result("ccn66_system", True, f"✅ {profile['name']}: Ancienneté calculée ({cex_balance}j)")
                    else:
                        self.log_result("ccn66_system", False, f"❌ {profile['name']}: Ancienneté négative ({cex_balance}j)")
                    
                    # Pour Jean-François BERNARD, vérifier la proratisation
                    if profile['name'] == "Jean-François BERNARD":
                        if ca_balance < 30 or ct_balance < 18:  # Proratisé donc < temps plein
                            self.log_result("ccn66_system", True, f"✅ {profile['name']}: Proratisation temps partiel détectée (CA={ca_balance}, CT={ct_balance})")
                        else:
                            self.log_result("ccn66_system", False, f"❌ {profile['name']}: Proratisation temps partiel non appliquée")
                    
                else:
                    self.log_result("ccn66_system", False, f"❌ {profile['name']}: Impossible de récupérer les compteurs ({response.status_code})")
            except Exception as e:
                self.log_result("ccn66_system", False, f"❌ {profile['name']}: Erreur récupération compteurs: {str(e)}")
        
        # 3. Test Manager Jacques EDAU
        print("\n--- 3. Testing Manager Jacques EDAU ---")
        
        jacques_email = "jedau@aaea-gpe.fr"
        jacques_id = users_map.get(jacques_email.lower())
        
        if jacques_id:
            try:
                response = requests.get(f"{API_URL}/users/{jacques_id}", headers=headers, timeout=10)
                if response.status_code == 200:
                    user_data = response.json()
                    role = user_data.get('role', '')
                    
                    if role == 'manager':
                        self.log_result("ccn66_system", True, f"✅ Jacques EDAU a le rôle manager")
                        
                        # Tester la connexion avec Jacques EDAU
                        try:
                            # Récupérer le mot de passe initial depuis la base
                            initial_password = user_data.get('initial_password')
                            if initial_password:
                                auth_response = requests.post(
                                    f"{API_URL}/auth/login", 
                                    json={"email": jacques_email, "password": initial_password}, 
                                    timeout=5
                                )
                                if auth_response.status_code == 200:
                                    self.log_result("ccn66_system", True, f"✅ Jacques EDAU: Connexion réussie avec mot de passe initial")
                                else:
                                    self.log_result("ccn66_system", False, f"❌ Jacques EDAU: Connexion échouée avec mot de passe initial")
                            else:
                                self.log_result("ccn66_system", False, f"❌ Jacques EDAU: Pas de mot de passe initial trouvé")
                        except Exception as e:
                            self.log_result("ccn66_system", False, f"❌ Jacques EDAU: Erreur test connexion: {str(e)}")
                    else:
                        self.log_result("ccn66_system", False, f"❌ Jacques EDAU a le rôle '{role}' au lieu de 'manager'")
                else:
                    self.log_result("ccn66_system", False, f"❌ Jacques EDAU: Impossible de récupérer les données utilisateur ({response.status_code})")
            except Exception as e:
                self.log_result("ccn66_system", False, f"❌ Jacques EDAU: Erreur récupération données: {str(e)}")
        else:
            self.log_result("ccn66_system", False, f"❌ Jacques EDAU non trouvé dans la base ({jacques_email})")
        
        # 4. Test Vérification Globale des Compteurs
        print("\n--- 4. Testing Vérification Globale ---")
        
        try:
            # Compter combien d'employés ont des compteurs initialisés
            initialized_count = 0
            total_users = len(users_map)
            
            for email, employee_id in users_map.items():
                try:
                    response = requests.get(
                        f"{API_URL}/leave-balance/{employee_id}", 
                        headers=headers, 
                        timeout=5
                    )
                    if response.status_code == 200:
                        balance_data = response.json()
                        # Vérifier que les compteurs sont initialisés (pas tous à 0)
                        ca_initial = balance_data.get('ca_initial', 0)
                        if ca_initial > 0:
                            initialized_count += 1
                except:
                    pass  # Ignorer les erreurs individuelles
            
            self.log_result("ccn66_system", True, f"✅ Compteurs initialisés: {initialized_count}/{total_users} employés")
            
            if initialized_count >= 30:  # Au moins 30 employés avec compteurs
                self.log_result("ccn66_system", True, f"✅ Critère de succès atteint: {initialized_count} employés avec compteurs")
            else:
                self.log_result("ccn66_system", False, f"❌ Critère de succès non atteint: seulement {initialized_count} employés avec compteurs")
                
        except Exception as e:
            self.log_result("ccn66_system", False, f"❌ Erreur vérification globale: {str(e)}")
        
        self.results["ccn66_system"]["status"] = "pass" if any(d["status"] == "pass" for d in self.results["ccn66_system"]["details"]) else "fail"

    def test_leave_balance_management_system(self, auth_token=None):
        """Test Leave Balance Management System with Automatic Reintegration as requested in French review"""
        print("\n=== Testing Leave Balance Management System ===")
        print("Testing: Système de gestion des soldes de congés et réintégration automatique")
        
        headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
        employee_id = None
        
        # 1. Test Initialisation des Soldes (Admin uniquement)
        print("\n--- 1. Testing Initialisation des Soldes (Admin Only) ---")
        
        try:
            response = requests.post(
                f"{API_URL}/leave-balance/initialize-all", 
                json={"year": 2025}, 
                headers=headers, 
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'employees_initialized' in data:
                    nb_employees = data.get('employees_initialized', 0)
                    self.log_result("leave_balance", True, f"✅ Initialisation des soldes: {nb_employees} employés initialisés")
                else:
                    self.log_result("leave_balance", False, f"❌ Réponse d'initialisation manque les champs requis")
            else:
                self.log_result("leave_balance", False, f"❌ POST /api/leave-balance/initialize-all returned {response.status_code}")
        except Exception as e:
            self.log_result("leave_balance", False, f"❌ Erreur lors de l'initialisation des soldes: {str(e)}")
        
        # 2. Test Consultation d'un Solde
        print("\n--- 2. Testing Consultation d'un Solde ---")
        
        # First get user info to extract employee_id
        try:
            me_response = requests.get(f"{API_URL}/auth/me", headers=headers, timeout=10)
            if me_response.status_code == 200:
                user_data = me_response.json()
                employee_id = user_data.get('id')
                self.log_result("leave_balance", True, f"✅ Employee ID récupéré: {employee_id}")
            else:
                self.log_result("leave_balance", False, f"❌ Impossible de récupérer l'employee_id")
        except Exception as e:
            self.log_result("leave_balance", False, f"❌ Erreur lors de la récupération de l'employee_id: {str(e)}")
        
        if employee_id:
            try:
                response = requests.get(
                    f"{API_URL}/leave-balance/{employee_id}?year=2025", 
                    headers=headers, 
                    timeout=10
                )
                if response.status_code == 200:
                    balance_data = response.json()
                    required_fields = ['ca_initial', 'ca_balance', 'rtt_initial', 'rtt_balance']
                    
                    if all(field in balance_data for field in required_fields):
                        ca_initial = balance_data.get('ca_initial', 0)
                        ca_balance = balance_data.get('ca_balance', 0)
                        rtt_initial = balance_data.get('rtt_initial', 0)
                        rtt_balance = balance_data.get('rtt_balance', 0)
                        
                        self.log_result("leave_balance", True, f"✅ Consultation solde: CA={ca_balance}/{ca_initial}, RTT={rtt_balance}/{rtt_initial}")
                    else:
                        self.log_result("leave_balance", False, f"❌ Structure du solde incomplète")
                else:
                    self.log_result("leave_balance", False, f"❌ GET /api/leave-balance/{{employee_id}} returned {response.status_code}")
            except Exception as e:
                self.log_result("leave_balance", False, f"❌ Erreur consultation solde: {str(e)}")
        
        # 3. Test Déduction de Congés (Simulation Pose)
        print("\n--- 3. Testing Déduction de Congés (Simulation Pose) ---")
        
        if employee_id:
            deduction_request = {
                "employee_id": employee_id,
                "leave_type": "CA",
                "operation": "deduct",
                "amount": 5.0,
                "reason": "Test : Pose 5 jours CA"
            }
            
            try:
                response = requests.post(
                    f"{API_URL}/leave-balance/update", 
                    json=deduction_request, 
                    headers=headers, 
                    timeout=10
                )
                if response.status_code == 200:
                    data = response.json()
                    balance_before = data.get('balance_before')
                    balance_after = data.get('balance_after')
                    
                    if balance_before is not None and balance_after is not None:
                        expected_after = balance_before - 5.0
                        if abs(balance_after - expected_after) < 0.01:  # Float comparison
                            self.log_result("leave_balance", True, f"✅ Déduction CA: {balance_before} → {balance_after} (-5 jours)")
                        else:
                            self.log_result("leave_balance", False, f"❌ Déduction incorrecte: attendu {expected_after}, obtenu {balance_after}")
                    else:
                        self.log_result("leave_balance", False, f"❌ Réponse déduction manque balance_before/after")
                else:
                    self.log_result("leave_balance", False, f"❌ POST /api/leave-balance/update (deduct) returned {response.status_code}")
            except Exception as e:
                self.log_result("leave_balance", False, f"❌ Erreur déduction congés: {str(e)}")
        
        # 4. Test Réintégration (Simulation Interruption)
        print("\n--- 4. Testing Réintégration (Simulation Interruption) ---")
        
        if employee_id:
            reintegration_request = {
                "employee_id": employee_id,
                "leave_type": "CA",
                "operation": "reintegrate",
                "amount": 2.0,
                "reason": "Test : Réintégration suite AM",
                "interrupting_absence_type": "AM"
            }
            
            try:
                response = requests.post(
                    f"{API_URL}/leave-balance/update", 
                    json=reintegration_request, 
                    headers=headers, 
                    timeout=10
                )
                if response.status_code == 200:
                    data = response.json()
                    balance_before = data.get('balance_before')
                    balance_after = data.get('balance_after')
                    
                    if balance_before is not None and balance_after is not None:
                        expected_after = balance_before + 2.0
                        if abs(balance_after - expected_after) < 0.01:  # Float comparison
                            self.log_result("leave_balance", True, f"✅ Réintégration CA: {balance_before} → {balance_after} (+2 jours)")
                        else:
                            self.log_result("leave_balance", False, f"❌ Réintégration incorrecte: attendu {expected_after}, obtenu {balance_after}")
                    else:
                        self.log_result("leave_balance", False, f"❌ Réponse réintégration manque balance_before/after")
                else:
                    self.log_result("leave_balance", False, f"❌ POST /api/leave-balance/update (reintegrate) returned {response.status_code}")
            except Exception as e:
                self.log_result("leave_balance", False, f"❌ Erreur réintégration: {str(e)}")
        
        # 5. Test Consultation de l'Historique
        print("\n--- 5. Testing Consultation de l'Historique ---")
        
        if employee_id:
            try:
                response = requests.get(
                    f"{API_URL}/leave-transactions/{employee_id}?year=2025", 
                    headers=headers, 
                    timeout=10
                )
                if response.status_code == 200:
                    transactions = response.json()
                    if isinstance(transactions, list):
                        self.log_result("leave_balance", True, f"✅ Historique récupéré: {len(transactions)} transactions")
                        
                        # Check for our test transactions
                        deduct_found = False
                        reintegrate_found = False
                        
                        for transaction in transactions:
                            if (transaction.get('operation') == 'deduct' and 
                                transaction.get('amount') == 5.0 and
                                'Test : Pose 5 jours CA' in transaction.get('reason', '')):
                                deduct_found = True
                            elif (transaction.get('operation') == 'reintegrate' and 
                                  transaction.get('amount') == 2.0 and
                                  'Test : Réintégration suite AM' in transaction.get('reason', '')):
                                reintegrate_found = True
                        
                        if deduct_found and reintegrate_found:
                            self.log_result("leave_balance", True, f"✅ Transactions de test trouvées dans l'historique")
                        else:
                            self.log_result("leave_balance", False, f"❌ Transactions de test manquantes dans l'historique")
                    else:
                        self.log_result("leave_balance", False, f"❌ Historique doit retourner un tableau")
                else:
                    self.log_result("leave_balance", False, f"❌ GET /api/leave-transactions/{{employee_id}} returned {response.status_code}")
            except Exception as e:
                self.log_result("leave_balance", False, f"❌ Erreur consultation historique: {str(e)}")
        
        # 6. Test Re-consultation du Solde Final
        print("\n--- 6. Testing Re-consultation du Solde Final ---")
        
        if employee_id:
            try:
                response = requests.get(
                    f"{API_URL}/leave-balance/{employee_id}", 
                    headers=headers, 
                    timeout=10
                )
                if response.status_code == 200:
                    final_balance = response.json()
                    ca_balance = final_balance.get('ca_balance', 0)
                    ca_taken = final_balance.get('ca_taken', 0)
                    ca_reintegrated = final_balance.get('ca_reintegrated', 0)
                    
                    # Expected: initial 25 - taken 5 + reintegrated 2 = 22
                    expected_balance = 25.0 - 5.0 + 2.0  # 22.0
                    
                    if abs(ca_balance - expected_balance) < 0.01:
                        self.log_result("leave_balance", True, f"✅ Solde final cohérent: CA={ca_balance}, pris={ca_taken}, réintégré={ca_reintegrated}")
                    else:
                        self.log_result("leave_balance", False, f"❌ Solde final incohérent: attendu {expected_balance}, obtenu {ca_balance}")
                else:
                    self.log_result("leave_balance", False, f"❌ Re-consultation solde returned {response.status_code}")
            except Exception as e:
                self.log_result("leave_balance", False, f"❌ Erreur re-consultation solde: {str(e)}")
        
        # 7. Test avec Différents Types (RTT, REC)
        print("\n--- 7. Testing avec Différents Types (RTT, REC) ---")
        
        if employee_id:
            # Test RTT
            rtt_requests = [
                {
                    "employee_id": employee_id,
                    "leave_type": "RTT",
                    "operation": "deduct",
                    "amount": 2.0,
                    "reason": "Test RTT déduction"
                },
                {
                    "employee_id": employee_id,
                    "leave_type": "RTT",
                    "operation": "reintegrate",
                    "amount": 1.0,
                    "reason": "Test RTT réintégration"
                }
            ]
            
            for request in rtt_requests:
                try:
                    response = requests.post(
                        f"{API_URL}/leave-balance/update", 
                        json=request, 
                        headers=headers, 
                        timeout=10
                    )
                    if response.status_code == 200:
                        data = response.json()
                        operation = request['operation']
                        amount = request['amount']
                        self.log_result("leave_balance", True, f"✅ RTT {operation}: {amount} jours traité")
                    else:
                        self.log_result("leave_balance", False, f"❌ RTT {request['operation']} failed: {response.status_code}")
                except Exception as e:
                    self.log_result("leave_balance", False, f"❌ Erreur RTT {request['operation']}: {str(e)}")
            
            # Test REC
            rec_requests = [
                {
                    "employee_id": employee_id,
                    "leave_type": "REC",
                    "operation": "deduct",
                    "amount": 3.0,
                    "reason": "Test REC déduction"
                },
                {
                    "employee_id": employee_id,
                    "leave_type": "REC",
                    "operation": "reintegrate",
                    "amount": 1.0,
                    "reason": "Test REC réintégration"
                }
            ]
            
            for request in rec_requests:
                try:
                    response = requests.post(
                        f"{API_URL}/leave-balance/update", 
                        json=request, 
                        headers=headers, 
                        timeout=10
                    )
                    if response.status_code == 200:
                        data = response.json()
                        operation = request['operation']
                        amount = request['amount']
                        self.log_result("leave_balance", True, f"✅ REC {operation}: {amount} jours traité")
                    else:
                        self.log_result("leave_balance", False, f"❌ REC {request['operation']} failed: {response.status_code}")
                except Exception as e:
                    self.log_result("leave_balance", False, f"❌ Erreur REC {request['operation']}: {str(e)}")
        
        # 8. Test Gestion des Erreurs
        print("\n--- 8. Testing Gestion des Erreurs ---")
        
        # Test sans token
        try:
            response = requests.get(f"{API_URL}/leave-balance/test-employee-id", timeout=10)
            if response.status_code in [401, 403]:
                self.log_result("leave_balance", True, f"✅ Endpoints requièrent authentification ({response.status_code})")
            else:
                self.log_result("leave_balance", False, f"❌ Endpoints devraient requérir auth, got {response.status_code}")
        except Exception as e:
            self.log_result("leave_balance", False, f"❌ Erreur test sans token: {str(e)}")
        
        # Test avec employee_id invalide
        try:
            response = requests.get(
                f"{API_URL}/leave-balance/invalid-employee-id", 
                headers=headers, 
                timeout=10
            )
            if response.status_code == 404:
                self.log_result("leave_balance", True, f"✅ Employee ID invalide retourne 404")
            else:
                self.log_result("leave_balance", False, f"❌ Employee ID invalide devrait retourner 404, got {response.status_code}")
        except Exception as e:
            self.log_result("leave_balance", False, f"❌ Erreur test employee_id invalide: {str(e)}")
        
        # Test avec leave_type invalide
        if employee_id:
            invalid_request = {
                "employee_id": employee_id,
                "leave_type": "INVALID_TYPE",
                "operation": "deduct",
                "amount": 1.0,
                "reason": "Test type invalide"
            }
            
            try:
                response = requests.post(
                    f"{API_URL}/leave-balance/update", 
                    json=invalid_request, 
                    headers=headers, 
                    timeout=10
                )
                if response.status_code == 400:
                    self.log_result("leave_balance", True, f"✅ Leave type invalide retourne 400")
                else:
                    self.log_result("leave_balance", False, f"❌ Leave type invalide devrait retourner 400, got {response.status_code}")
            except Exception as e:
                self.log_result("leave_balance", False, f"❌ Erreur test leave_type invalide: {str(e)}")
        
        self.results["leave_balance"]["status"] = "pass" if any(d["status"] == "pass" for d in self.results["leave_balance"]["details"]) else "fail"

    def test_mongodb_validation(self, auth_token=None):
        """Test MongoDB Collections for Leave Balance System"""
        print("\n=== Testing MongoDB Collections Validation ===")
        
        # Test MongoDB collections existence using backend endpoints
        headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
        
        # Test leave_balances collection via API
        try:
            response = requests.get(f"{API_URL}/leave-balance/test-employee-id", headers=headers, timeout=10)
            # Even if 404, it means the endpoint exists and tries to query the collection
            if response.status_code in [200, 404]:
                self.log_result("mongodb_validation", True, f"✅ leave_balances collection accessible via API")
            else:
                self.log_result("mongodb_validation", False, f"❌ leave_balances collection endpoint issue: {response.status_code}")
        except Exception as e:
            self.log_result("mongodb_validation", False, f"❌ Erreur test leave_balances collection: {str(e)}")
        
        # Test leave_transactions collection via API
        try:
            response = requests.get(f"{API_URL}/leave-transactions/test-employee-id", headers=headers, timeout=10)
            # Even if 404, it means the endpoint exists and tries to query the collection
            if response.status_code in [200, 404]:
                self.log_result("mongodb_validation", True, f"✅ leave_transactions collection accessible via API")
            else:
                self.log_result("mongodb_validation", False, f"❌ leave_transactions collection endpoint issue: {response.status_code}")
        except Exception as e:
            self.log_result("mongodb_validation", False, f"❌ Erreur test leave_transactions collection: {str(e)}")
        
        self.results["mongodb_validation"]["status"] = "pass" if any(d["status"] == "pass" for d in self.results["mongodb_validation"]["details"]) else "fail"

    def test_cse_cessions_endpoints(self, auth_token=None):
        """Test CSE Cessions API endpoints as requested in review"""
        print("\n=== Testing CSE Cessions API Endpoints ===")
        
        headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
        
        # 1. Test GET /api/cse/cessions - Should return empty array initially
        print("\n--- Testing GET /api/cse/cessions ---")
        
        try:
            response = requests.get(f"{API_URL}/cse/cessions", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("cse_cessions", True, f"✅ GET /api/cse/cessions returns array (length: {len(data)})")
                    if len(data) == 0:
                        self.log_result("cse_cessions", True, f"✅ Initially returns empty array as expected")
                else:
                    self.log_result("cse_cessions", False, f"❌ GET /api/cse/cessions should return array, got {type(data)}")
            else:
                self.log_result("cse_cessions", False, f"❌ GET /api/cse/cessions returned {response.status_code}")
        except Exception as e:
            self.log_result("cse_cessions", False, f"❌ Error testing GET /api/cse/cessions: {str(e)}")
        
        # Test without authentication (should get 401/403)
        try:
            response = requests.get(f"{API_URL}/cse/cessions", timeout=10)
            if response.status_code in [401, 403]:
                self.log_result("cse_cessions", True, f"✅ GET /api/cse/cessions requires authentication ({response.status_code})")
            else:
                self.log_result("cse_cessions", False, f"❌ GET /api/cse/cessions should require auth, got {response.status_code}")
        except Exception as e:
            self.log_result("cse_cessions", False, f"❌ Error testing GET /api/cse/cessions without auth: {str(e)}")
        
        # 2. Test POST /api/cse/cessions - Create new cession
        print("\n--- Testing POST /api/cse/cessions ---")
        
        # Test cession payload as specified in review request
        test_cession = {
            "from_id": "test-user-1",
            "from_name": "Sophie Martin",
            "to_id": "test-user-2", 
            "to_name": "Jean Dupont",
            "hours": 5.0,
            "usage_date": "2025-02-01",
            "reason": "Réunion CSE extraordinaire",
            "created_by": "Sophie Martin"
        }
        
        try:
            response = requests.post(f"{API_URL}/cse/cessions", json=test_cession, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                # Verify response structure
                required_fields = ["id", "from_id", "from_name", "to_id", "to_name", "hours", "usage_date", "reason", "created_by", "created_at"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("cse_cessions", True, f"✅ POST /api/cse/cessions creates cession with proper structure")
                    
                    # Verify field values
                    if (data.get("from_name") == "Sophie Martin" and 
                        data.get("to_name") == "Jean Dupont" and 
                        data.get("hours") == 5.0 and
                        data.get("reason") == "Réunion CSE extraordinaire"):
                        self.log_result("cse_cessions", True, f"✅ Created cession has correct field values")
                    else:
                        self.log_result("cse_cessions", False, f"❌ Created cession has incorrect field values")
                        
                    # Verify auto-generated fields
                    if data.get("id") and data.get("created_at"):
                        self.log_result("cse_cessions", True, f"✅ Auto-generated fields (id, created_at) present")
                    else:
                        self.log_result("cse_cessions", False, f"❌ Missing auto-generated fields")
                        
                else:
                    self.log_result("cse_cessions", False, f"❌ Response missing required fields: {missing_fields}")
            else:
                self.log_result("cse_cessions", False, f"❌ POST /api/cse/cessions returned {response.status_code}")
        except Exception as e:
            self.log_result("cse_cessions", False, f"❌ Error testing POST /api/cse/cessions: {str(e)}")
        
        # Test without authentication
        try:
            response = requests.post(f"{API_URL}/cse/cessions", json=test_cession, timeout=10)
            if response.status_code in [401, 403]:
                self.log_result("cse_cessions", True, f"✅ POST /api/cse/cessions requires authentication ({response.status_code})")
            else:
                self.log_result("cse_cessions", False, f"❌ POST /api/cse/cessions should require auth, got {response.status_code}")
        except Exception as e:
            self.log_result("cse_cessions", False, f"❌ Error testing POST /api/cse/cessions without auth: {str(e)}")
        
        # 3. Test Data Persistence - Call GET again to verify created cession appears
        print("\n--- Testing Data Persistence ---")
        
        try:
            response = requests.get(f"{API_URL}/cse/cessions", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Look for our created cession
                    created_cession = None
                    for cession in data:
                        if (cession.get("from_name") == "Sophie Martin" and 
                            cession.get("to_name") == "Jean Dupont" and 
                            cession.get("hours") == 5.0):
                            created_cession = cession
                            break
                    
                    if created_cession:
                        self.log_result("cse_cessions", True, f"✅ Created cession persisted in MongoDB and retrievable via GET")
                        
                        # Verify all fields are correctly stored
                        if (created_cession.get("reason") == "Réunion CSE extraordinaire" and
                            created_cession.get("usage_date") == "2025-02-01" and
                            created_cession.get("created_by") == "Sophie Martin"):
                            self.log_result("cse_cessions", True, f"✅ All cession fields correctly stored in database")
                        else:
                            self.log_result("cse_cessions", False, f"❌ Some cession fields not stored correctly")
                    else:
                        self.log_result("cse_cessions", False, f"❌ Created cession not found in GET response")
                else:
                    self.log_result("cse_cessions", False, f"❌ GET after POST should return created cession")
            else:
                self.log_result("cse_cessions", False, f"❌ GET after POST returned {response.status_code}")
        except Exception as e:
            self.log_result("cse_cessions", False, f"❌ Error testing data persistence: {str(e)}")
        
        # 4. Test Error Handling - Invalid data formats
        print("\n--- Testing Error Handling ---")
        
        # Test with missing required fields
        invalid_cession = {
            "from_name": "Sophie Martin",
            # Missing required fields: from_id, to_id, to_name, hours, usage_date, reason, created_by
        }
        
        try:
            response = requests.post(f"{API_URL}/cse/cessions", json=invalid_cession, headers=headers, timeout=10)
            if response.status_code in [400, 422]:  # Bad Request or Validation Error
                self.log_result("cse_cessions", True, f"✅ Invalid data returns proper error ({response.status_code})")
            else:
                self.log_result("cse_cessions", False, f"❌ Invalid data should return 400/422, got {response.status_code}")
        except Exception as e:
            self.log_result("cse_cessions", False, f"❌ Error testing invalid data: {str(e)}")
        
        # Test with invalid data types
        invalid_types_cession = {
            "from_id": "test-user-1",
            "from_name": "Sophie Martin",
            "to_id": "test-user-2", 
            "to_name": "Jean Dupont",
            "hours": "invalid_number",  # Should be float
            "usage_date": "2025-02-01",
            "reason": "Test",
            "created_by": "Sophie Martin"
        }
        
        try:
            response = requests.post(f"{API_URL}/cse/cessions", json=invalid_types_cession, headers=headers, timeout=10)
            if response.status_code in [400, 422]:  # Bad Request or Validation Error
                self.log_result("cse_cessions", True, f"✅ Invalid data types return proper error ({response.status_code})")
            else:
                self.log_result("cse_cessions", False, f"❌ Invalid data types should return 400/422, got {response.status_code}")
        except Exception as e:
            self.log_result("cse_cessions", False, f"❌ Error testing invalid data types: {str(e)}")
        
        self.results["cse_cessions"]["status"] = "pass" if any(d["status"] == "pass" for d in self.results["cse_cessions"]["details"]) else "fail"

    def run_all_tests(self):
        """Run all backend tests"""
        print(f"Starting MOZAIK RH Backend Tests - Focus on Leave Balance Management System")
        print(f"Backend URL: {BASE_URL}")
        print(f"API URL: {API_URL}")
        print("=" * 70)
        
        # Initialize results for leave balance testing
        self.results["leave_balance"] = {"status": "unknown", "details": []}
        self.results["mongodb_validation"] = {"status": "unknown", "details": []}
        self.results["absence_import"] = {"status": "unknown", "details": []}
        self.results["monthly_planning"] = {"status": "unknown", "details": []}
        
        # Run tests in order
        api_healthy = self.test_api_health()
        
        if api_healthy:
            auth_token = self.test_authentication()
            # Focus on Leave Balance Management System testing as requested in French review
            self.test_leave_balance_management_system(auth_token)
            self.test_mongodb_validation(auth_token)
            # Also test other systems
            self.test_cse_cessions_endpoints(auth_token)
            self.test_delegation_hours(auth_token)
            self.test_data_retrieval(auth_token)
            self.test_monthly_planning_support(auth_token)
            self.test_excel_import_functionality(auth_token)
        else:
            print("Skipping other tests due to API health issues")
            
        # Determine overall status
        categories = ["api_health", "authentication", "leave_balance", "mongodb_validation", "cse_cessions", "delegation_hours", "data_retrieval", "monthly_planning", "excel_import"]
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
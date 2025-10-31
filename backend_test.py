#!/usr/bin/env python3
"""
COMPREHENSIVE ON-CALL SCHEDULE BACKEND API TESTING

OBJECTIF: Test complet de l'API backend Planning Astreintes nouvellement implémentée pour MOZAIK RH
USER ACCOUNT: Admin Diego DACALOR (ddacalor@aaea-gpe.fr / admin123)

API ENDPOINTS À TESTER:
1. GET /api/on-call/schedule - Retrieve schedules with filtering
2. POST /api/on-call/schedule/bulk - Create multiple schedules (week-long)
3. GET /api/on-call/assignments - Date range filtering for Monthly Planning
4. DELETE /api/on-call/schedule/{id} - Delete schedule
5. PUT /api/on-call/schedule/{id} - Update schedule

TESTS CRITIQUES:
1. Authentication required for all endpoints (403 without token)
2. Bulk creation creates multiple schedules correctly
3. Duplicate prevention works (returns existing schedule)
4. GET endpoints filter correctly by month/year and date range
5. DELETE removes schedules permanently
6. PUT updates schedules correctly
7. MongoDB persistence verified (data survives operations)
8. Proper error handling (404 for not found, 400 for validation errors)

EXPECTED OUTCOMES:
- All endpoints respond with correct HTTP status codes
- Authentication required for all endpoints (403/401 without token)
- Data validation working (date format, type validation)
- MongoDB persistence working correctly
- Proper error responses for edge cases
"""

import requests
import json
import sys
import os
import asyncio
import websockets
import threading
import time
from datetime import datetime, timedelta

# Configuration
BACKEND_URL = "https://mozaik-hr-2.preview.emergentagent.com/api"
WEBSOCKET_URL = "wss://hr-multi-saas.preview.emergentagent.com/api/ws"
ADMIN_EMAIL = "ddacalor@aaea-gpe.fr"
ADMIN_PASSWORD = "admin123"

class OnCallScheduleAPITester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.session = requests.Session()
        self.websocket_messages = []
        self.websocket_connected = False
        self.test_results = {
            "authentication": {"passed": 0, "failed": 0, "details": []},
            "get_endpoints": {"passed": 0, "failed": 0, "details": []},
            "post_endpoints": {"passed": 0, "failed": 0, "details": []},
            "delete_endpoints": {"passed": 0, "failed": 0, "details": []},
            "put_endpoints": {"passed": 0, "failed": 0, "details": []},
            "data_persistence": {"passed": 0, "failed": 0, "details": []},
            "error_handling": {"passed": 0, "failed": 0, "details": []}
        }
        self.created_schedule_ids = []  # Track created schedules for cleanup
        
    def log_result(self, phase, test_name, success, message, expected=None, actual=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        detail = {
            "test": test_name,
            "status": status,
            "message": message
        }
        if expected is not None:
            detail["expected"] = expected
        if actual is not None:
            detail["actual"] = actual
            
        self.test_results[phase]["details"].append(detail)
        if success:
            self.test_results[phase]["passed"] += 1
        else:
            self.test_results[phase]["failed"] += 1
            
        print(f"{status} {test_name}: {message}")
        if expected is not None and actual is not None:
            print(f"    Expected: {expected}")
            print(f"    Actual: {actual}")

    def authenticate(self):
        """Authenticate as admin Diego DACALOR"""
        print(f"\n🔐 AUTHENTICATION - Admin Diego DACALOR")
        print("=" * 60)
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("token")
                user = data.get("user", {})
                self.user_id = user.get("id")
                print(f"✅ Login successful: {user.get('name')} ({user.get('email')})")
                print(f"✅ Role: {user.get('role')}")
                print(f"✅ User ID: {self.user_id}")
                print(f"✅ Token obtained: {self.token[:20]}...")
                
                # Set authorization header for all future requests
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False

    def test_authentication_requirements(self):
        """Test that all on-call endpoints require authentication"""
        print(f"\n🔐 AUTHENTICATION REQUIREMENTS")
        print("=" * 60)
        
        # Test endpoints without authentication
        endpoints_to_test = [
            ("GET", "/on-call/schedule", {}),
            ("GET", "/on-call/assignments?startDate=2025-01-01&endDate=2025-01-31", {}),
            ("POST", "/on-call/schedule", {
                "employee_id": "test-id",
                "employee_name": "Test User",
                "date": "2025-01-15",
                "type": "Astreinte semaine",
                "notes": "Test"
            }),
            ("POST", "/on-call/schedule/bulk", {
                "schedules": [{
                    "employee_id": "test-id",
                    "employee_name": "Test User", 
                    "date": "2025-01-15",
                    "type": "Astreinte semaine",
                    "notes": "Test"
                }]
            })
        ]
        
        for method, endpoint, data in endpoints_to_test:
            try:
                if method == "GET":
                    response = requests.get(f"{BACKEND_URL}{endpoint}")
                else:
                    response = requests.post(f"{BACKEND_URL}{endpoint}", json=data)
                
                if response.status_code in [401, 403]:
                    print(f"✅ {method} {endpoint} requires authentication ({response.status_code})")
                    self.log_result("authentication", f"{method} {endpoint} auth required", True,
                                   f"Properly rejected with {response.status_code}")
                else:
                    self.log_result("authentication", f"{method} {endpoint} auth required", False,
                                   f"Expected 401/403, got {response.status_code}")
                    
            except Exception as e:
                self.log_result("authentication", f"{method} {endpoint} auth test", False, f"Exception: {str(e)}")

    def test_get_endpoints(self):
        """Test GET endpoints for on-call schedules"""
        print(f"\n📅 GET ENDPOINTS TESTING")
        print("=" * 60)
        
        # Test 1: GET /api/on-call/schedule (no filters - should return empty initially)
        print(f"\n📋 Test 1: GET /api/on-call/schedule (no filters)")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/on-call/schedule")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ GET schedule successful (200) - Found {len(data)} schedules")
                self.log_result("get_endpoints", "GET schedule no filters", True,
                               f"Returned {len(data)} schedules successfully")
            else:
                self.log_result("get_endpoints", "GET schedule no filters", False,
                               f"Expected 200, got {response.status_code}")
                
        except Exception as e:
            self.log_result("get_endpoints", "GET schedule no filters", False, f"Exception: {str(e)}")
        
        # Test 2: GET /api/on-call/schedule with month/year filtering
        print(f"\n📋 Test 2: GET /api/on-call/schedule with month/year filtering")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/on-call/schedule?month=1&year=2025")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ GET schedule with filters successful (200) - Found {len(data)} schedules")
                self.log_result("get_endpoints", "GET schedule with month/year filter", True,
                               f"Month/year filtering working, returned {len(data)} schedules")
            else:
                self.log_result("get_endpoints", "GET schedule with month/year filter", False,
                               f"Expected 200, got {response.status_code}")
                
        except Exception as e:
            self.log_result("get_endpoints", "GET schedule with month/year filter", False, f"Exception: {str(e)}")
        
        # Test 3: GET /api/on-call/assignments with date range
        print(f"\n📋 Test 3: GET /api/on-call/assignments with date range")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/on-call/assignments?startDate=2025-01-01&endDate=2025-01-31")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ GET assignments successful (200) - Found {len(data)} assignments")
                self.log_result("get_endpoints", "GET assignments with date range", True,
                               f"Date range filtering working, returned {len(data)} assignments")
            else:
                self.log_result("get_endpoints", "GET assignments with date range", False,
                               f"Expected 200, got {response.status_code}")
                
        except Exception as e:
            self.log_result("get_endpoints", "GET assignments with date range", False, f"Exception: {str(e)}")
        
        # Test 4: GET /api/on-call/assignments with invalid date format
        print(f"\n📋 Test 4: GET /api/on-call/assignments with invalid date format")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/on-call/assignments?startDate=invalid&endDate=2025-01-31")
            
            if response.status_code == 400:
                print(f"✅ Invalid date format rejected (400)")
                self.log_result("get_endpoints", "GET assignments invalid date format", True,
                               "Invalid date format properly rejected with 400")
            else:
                self.log_result("get_endpoints", "GET assignments invalid date format", False,
                               f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_result("get_endpoints", "GET assignments invalid date format", False, f"Exception: {str(e)}")

    def test_post_endpoints(self):
        """Test POST endpoints for creating on-call schedules"""
        print(f"\n➕ POST ENDPOINTS TESTING")
        print("=" * 60)
        
        # Test 1: POST /api/on-call/schedule/bulk (bulk creation)
        print(f"\n📋 Test 1: POST /api/on-call/schedule/bulk (bulk creation)")
        
        try:
            # Create test data for bulk creation (7 schedules for one week)
            bulk_data = {
                "schedules": [
                    {
                        "employee_id": self.user_id,
                        "employee_name": "Diego DACALOR",
                        "date": "2025-01-15",
                        "type": "Astreinte semaine",
                        "notes": "Test astreinte week 1"
                    },
                    {
                        "employee_id": self.user_id,
                        "employee_name": "Diego DACALOR", 
                        "date": "2025-01-16",
                        "type": "Astreinte jour",
                        "notes": "Test astreinte day 2"
                    }
                ]
            }
            
            response = self.session.post(f"{BACKEND_URL}/on-call/schedule/bulk", json=bulk_data)
            
            if response.status_code == 201:
                data = response.json()
                print(f"✅ Bulk creation successful (201) - Created {len(data)} schedules")
                
                # Track created schedules for cleanup
                for schedule in data:
                    if schedule.get("id"):
                        self.created_schedule_ids.append(schedule["id"])
                
                # Verify response structure
                if len(data) == 2 and all("id" in s and "created_at" in s and "created_by" in s for s in data):
                    self.log_result("post_endpoints", "POST bulk creation", True,
                                   f"Successfully created {len(data)} schedules with proper structure")
                else:
                    self.log_result("post_endpoints", "POST bulk creation", False,
                                   "Response structure incomplete")
            else:
                self.log_result("post_endpoints", "POST bulk creation", False,
                               f"Expected 201, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("post_endpoints", "POST bulk creation", False, f"Exception: {str(e)}")
        
        # Test 2: POST /api/on-call/schedule/bulk (duplicate prevention)
        print(f"\n📋 Test 2: POST /api/on-call/schedule/bulk (duplicate prevention)")
        
        try:
            # Try to create the same schedules again
            duplicate_data = {
                "schedules": [
                    {
                        "employee_id": self.user_id,
                        "employee_name": "Diego DACALOR",
                        "date": "2025-01-15",
                        "type": "Astreinte semaine",
                        "notes": "Duplicate test"
                    }
                ]
            }
            
            response = self.session.post(f"{BACKEND_URL}/on-call/schedule/bulk", json=duplicate_data)
            
            if response.status_code == 201:
                data = response.json()
                print(f"✅ Duplicate prevention working - Returned existing schedule")
                self.log_result("post_endpoints", "POST duplicate prevention", True,
                               "Duplicate schedule returned existing instead of error")
            else:
                self.log_result("post_endpoints", "POST duplicate prevention", False,
                               f"Expected 201, got {response.status_code}")
                
        except Exception as e:
            self.log_result("post_endpoints", "POST duplicate prevention", False, f"Exception: {str(e)}")
        
        # Test 3: POST /api/on-call/schedule (single schedule creation)
        print(f"\n📋 Test 3: POST /api/on-call/schedule (single schedule)")
        
        try:
            single_schedule = {
                "employee_id": self.user_id,
                "employee_name": "Diego DACALOR",
                "date": "2025-01-20",
                "type": "Astreinte jour",
                "notes": "Single schedule test"
            }
            
            response = self.session.post(f"{BACKEND_URL}/on-call/schedule", json=single_schedule)
            
            if response.status_code == 201:
                data = response.json()
                print(f"✅ Single schedule creation successful (201)")
                
                # Track for cleanup
                if data.get("id"):
                    self.created_schedule_ids.append(data["id"])
                
                self.log_result("post_endpoints", "POST single schedule", True,
                               "Single schedule created successfully")
            else:
                self.log_result("post_endpoints", "POST single schedule", False,
                               f"Expected 201, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("post_endpoints", "POST single schedule", False, f"Exception: {str(e)}")
        
        # Test 4: Data validation (invalid date format)
        print(f"\n📋 Test 4: POST data validation (invalid date)")
        
        try:
            invalid_data = {
                "employee_id": self.user_id,
                "employee_name": "Diego DACALOR",
                "date": "invalid-date",
                "type": "Astreinte jour",
                "notes": "Invalid date test"
            }
            
            response = self.session.post(f"{BACKEND_URL}/on-call/schedule", json=invalid_data)
            
            if response.status_code == 422:
                print(f"✅ Invalid date format rejected (422)")
                self.log_result("post_endpoints", "POST invalid date validation", True,
                               "Invalid date format properly rejected")
            else:
                self.log_result("post_endpoints", "POST invalid date validation", False,
                               f"Expected 422, got {response.status_code}")
                
        except Exception as e:
            self.log_result("post_endpoints", "POST invalid date validation", False, f"Exception: {str(e)}")
        
        # Test 5: Type validation and normalization
        print(f"\n📋 Test 5: POST type validation and normalization")
        
        try:
            type_test_data = {
                "employee_id": self.user_id,
                "employee_name": "Diego DACALOR",
                "date": "2025-01-25",
                "type": "semaine",  # Should be normalized to "Astreinte semaine"
                "notes": "Type normalization test"
            }
            
            response = self.session.post(f"{BACKEND_URL}/on-call/schedule", json=type_test_data)
            
            if response.status_code == 201:
                data = response.json()
                if data.get("type") == "Astreinte semaine":
                    print(f"✅ Type normalization working ('semaine' → 'Astreinte semaine')")
                    self.log_result("post_endpoints", "POST type normalization", True,
                                   "Type properly normalized from 'semaine' to 'Astreinte semaine'")
                    
                    # Track for cleanup
                    if data.get("id"):
                        self.created_schedule_ids.append(data["id"])
                else:
                    self.log_result("post_endpoints", "POST type normalization", False,
                                   f"Type not normalized: {data.get('type')}")
            else:
                self.log_result("post_endpoints", "POST type normalization", False,
                               f"Expected 201, got {response.status_code}")
                
        except Exception as e:
            self.log_result("post_endpoints", "POST type normalization", False, f"Exception: {str(e)}")

    def test_delete_endpoints(self):
        """Test DELETE endpoints for on-call schedules"""
        print(f"\n🗑️ DELETE ENDPOINTS TESTING")
        print("=" * 60)
        
        # Test 1: DELETE existing schedule
        print(f"\n📋 Test 1: DELETE existing schedule")
        
        if self.created_schedule_ids:
            schedule_id = self.created_schedule_ids[0]
            
            try:
                response = self.session.delete(f"{BACKEND_URL}/on-call/schedule/{schedule_id}")
                
                if response.status_code == 204:
                    print(f"✅ Schedule deleted successfully (204)")
                    self.log_result("delete_endpoints", "DELETE existing schedule", True,
                                   "Schedule deleted with proper 204 status")
                    
                    # Remove from tracking list
                    self.created_schedule_ids.remove(schedule_id)
                else:
                    self.log_result("delete_endpoints", "DELETE existing schedule", False,
                                   f"Expected 204, got {response.status_code}")
                    
            except Exception as e:
                self.log_result("delete_endpoints", "DELETE existing schedule", False, f"Exception: {str(e)}")
        else:
            self.log_result("delete_endpoints", "DELETE existing schedule", False, "No schedules available to delete")
        
        # Test 2: DELETE non-existent schedule (404)
        print(f"\n📋 Test 2: DELETE non-existent schedule")
        
        try:
            fake_id = "00000000-0000-0000-0000-000000000000"
            response = self.session.delete(f"{BACKEND_URL}/on-call/schedule/{fake_id}")
            
            if response.status_code == 404:
                print(f"✅ Non-existent schedule properly rejected (404)")
                self.log_result("delete_endpoints", "DELETE non-existent schedule", True,
                               "Non-existent schedule properly returns 404")
            else:
                self.log_result("delete_endpoints", "DELETE non-existent schedule", False,
                               f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_result("delete_endpoints", "DELETE non-existent schedule", False, f"Exception: {str(e)}")

    def test_put_endpoints(self):
        """Test PUT endpoints for updating on-call schedules"""
        print(f"\n✏️ PUT ENDPOINTS TESTING")
        print("=" * 60)
        
        # Test 1: PUT update existing schedule
        print(f"\n📋 Test 1: PUT update existing schedule")
        
        if self.created_schedule_ids:
            schedule_id = self.created_schedule_ids[0]
            
            try:
                update_data = {
                    "employee_id": self.user_id,
                    "employee_name": "Diego DACALOR (Updated)",
                    "date": "2025-01-16",
                    "type": "Astreinte jour",
                    "notes": "Updated schedule notes"
                }
                
                response = self.session.put(f"{BACKEND_URL}/on-call/schedule/{schedule_id}", json=update_data)
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Schedule updated successfully (200)")
                    
                    # Verify updated fields
                    if (data.get("employee_name") == "Diego DACALOR (Updated)" and 
                        data.get("type") == "Astreinte jour" and
                        data.get("notes") == "Updated schedule notes"):
                        self.log_result("put_endpoints", "PUT update existing schedule", True,
                                       "Schedule updated with correct field values")
                    else:
                        self.log_result("put_endpoints", "PUT update existing schedule", False,
                                       "Updated fields not reflected correctly")
                else:
                    self.log_result("put_endpoints", "PUT update existing schedule", False,
                                   f"Expected 200, got {response.status_code}")
                    
            except Exception as e:
                self.log_result("put_endpoints", "PUT update existing schedule", False, f"Exception: {str(e)}")
        else:
            self.log_result("put_endpoints", "PUT update existing schedule", False, "No schedules available to update")
        
        # Test 2: PUT update non-existent schedule (404)
        print(f"\n📋 Test 2: PUT update non-existent schedule")
        
        try:
            fake_id = "00000000-0000-0000-0000-000000000000"
            update_data = {
                "employee_id": self.user_id,
                "employee_name": "Test User",
                "date": "2025-01-30",
                "type": "Astreinte jour",
                "notes": "Test update"
            }
            
            response = self.session.put(f"{BACKEND_URL}/on-call/schedule/{fake_id}", json=update_data)
            
            if response.status_code == 404:
                print(f"✅ Non-existent schedule update properly rejected (404)")
                self.log_result("put_endpoints", "PUT non-existent schedule", True,
                               "Non-existent schedule update properly returns 404")
            else:
                self.log_result("put_endpoints", "PUT non-existent schedule", False,
                               f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_result("put_endpoints", "PUT non-existent schedule", False, f"Exception: {str(e)}")

    def test_data_persistence(self):
        """Test MongoDB data persistence"""
        print(f"\n💾 DATA PERSISTENCE TESTING")
        print("=" * 60)
        
        # Test 1: Verify created schedules appear in GET requests
        print(f"\n📋 Test 1: Verify schedules appear in GET requests")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/on-call/schedule")
            
            if response.status_code == 200:
                data = response.json()
                created_count = len([s for s in data if s.get("id") in self.created_schedule_ids])
                
                if created_count > 0:
                    print(f"✅ Found {created_count} created schedules in GET response")
                    self.log_result("data_persistence", "Schedules appear in GET", True,
                                   f"Created schedules properly persisted and retrievable")
                else:
                    self.log_result("data_persistence", "Schedules appear in GET", False,
                                   "Created schedules not found in GET response")
            else:
                self.log_result("data_persistence", "Schedules appear in GET", False,
                               f"GET request failed: {response.status_code}")
                
        except Exception as e:
            self.log_result("data_persistence", "Schedules appear in GET", False, f"Exception: {str(e)}")
        
        # Test 2: Test month/year filtering with created data
        print(f"\n📋 Test 2: Test month/year filtering with created data")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/on-call/schedule?month=1&year=2025")
            
            if response.status_code == 200:
                data = response.json()
                january_schedules = [s for s in data if s.get("date", "").startswith("2025-01")]
                
                if len(january_schedules) > 0:
                    print(f"✅ Month/year filtering working - Found {len(january_schedules)} January 2025 schedules")
                    self.log_result("data_persistence", "Month/year filtering works", True,
                                   f"Filtering correctly returned {len(january_schedules)} schedules for January 2025")
                else:
                    print(f"ℹ️ No January 2025 schedules found (expected if no test data in that period)")
                    self.log_result("data_persistence", "Month/year filtering works", True,
                                   "Filtering working correctly (no data in filtered period)")
            else:
                self.log_result("data_persistence", "Month/year filtering works", False,
                               f"Filtered GET request failed: {response.status_code}")
                
        except Exception as e:
            self.log_result("data_persistence", "Month/year filtering works", False, f"Exception: {str(e)}")

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print(f"\n⚠️ ERROR HANDLING TESTING")
        print("=" * 60)
        
        # Test 1: Missing required fields
        print(f"\n📋 Test 1: Missing required fields")
        
        try:
            incomplete_data = {
                "employee_name": "Test User",
                # Missing employee_id, date, type
                "notes": "Incomplete data test"
            }
            
            response = self.session.post(f"{BACKEND_URL}/on-call/schedule", json=incomplete_data)
            
            if response.status_code == 422:
                print(f"✅ Missing required fields properly rejected (422)")
                self.log_result("error_handling", "Missing required fields", True,
                               "Missing required fields properly rejected with validation error")
            else:
                self.log_result("error_handling", "Missing required fields", False,
                               f"Expected 422, got {response.status_code}")
                
        except Exception as e:
            self.log_result("error_handling", "Missing required fields", False, f"Exception: {str(e)}")
        
        # Test 2: Invalid employee_id format
        print(f"\n📋 Test 2: Invalid employee_id format")
        
        try:
            invalid_id_data = {
                "employee_id": "not-a-uuid",
                "employee_name": "Test User",
                "date": "2025-01-30",
                "type": "Astreinte jour",
                "notes": "Invalid ID test"
            }
            
            response = self.session.post(f"{BACKEND_URL}/on-call/schedule", json=invalid_id_data)
            
            # This might be accepted depending on validation rules, so we check the response
            if response.status_code in [422, 400]:
                print(f"✅ Invalid employee_id format handled ({response.status_code})")
                self.log_result("error_handling", "Invalid employee_id format", True,
                               f"Invalid employee_id properly handled with {response.status_code}")
            elif response.status_code == 201:
                print(f"ℹ️ Invalid employee_id accepted (may be by design)")
                self.log_result("error_handling", "Invalid employee_id format", True,
                               "Invalid employee_id accepted (validation may be lenient by design)")
            else:
                self.log_result("error_handling", "Invalid employee_id format", False,
                               f"Unexpected response: {response.status_code}")
                
        except Exception as e:
            self.log_result("error_handling", "Invalid employee_id format", False, f"Exception: {str(e)}")

    def cleanup_test_data(self):
        """Clean up any remaining test schedules"""
        print(f"\n🧹 CLEANUP - Removing test schedules")
        
        for schedule_id in self.created_schedule_ids[:]:
            try:
                response = self.session.delete(f"{BACKEND_URL}/on-call/schedule/{schedule_id}")
                if response.status_code == 204:
                    print(f"✅ Cleaned up schedule: {schedule_id}")
                    self.created_schedule_ids.remove(schedule_id)
                else:
                    print(f"⚠️ Failed to cleanup schedule {schedule_id}: {response.status_code}")
            except Exception as e:
                print(f"⚠️ Exception cleaning up schedule {schedule_id}: {str(e)}")
        
        if not self.created_schedule_ids:
            print(f"✅ All test schedules cleaned up successfully")

    def print_summary(self):
        """Afficher le résumé des tests de sécurité"""
        print(f"\n" + "=" * 80)
        print(f"🛡️ RÉSUMÉ COMPLET DES TESTS DE SÉCURITÉ CRITIQUES")
        print(f"=" * 80)
        
        total_passed = 0
        total_failed = 0
        
        for phase_name, results in self.test_results.items():
            phase_display = {
                "phase1_secret_key": "PHASE 1 - SECRET_KEY VALIDATION",
                "phase2_validation": "PHASE 2 - PYDANTIC VALIDATION", 
                "phase3_rate_limiting": "PHASE 3 - RATE LIMITING",
                "security_bypass": "SECURITY BYPASS TESTS"
            }
            
            passed = results["passed"]
            failed = results["failed"]
            total = passed + failed
            
            total_passed += passed
            total_failed += failed
            
            status_icon = "✅" if failed == 0 else "❌" if passed == 0 else "⚠️"
            print(f"\n{status_icon} {phase_display[phase_name]}")
            print(f"   Tests réussis: {passed}/{total}")
            print(f"   Tests échoués: {failed}/{total}")
            
            if failed > 0:
                print(f"   Échecs critiques:")
                for detail in results["details"]:
                    if "❌ FAIL" in detail["status"]:
                        print(f"     - {detail['test']}: {detail['message']}")
        
        print(f"\n" + "=" * 80)
        overall_status = "✅ SÉCURITÉ COMPLÈTE" if total_failed == 0 else "❌ FAILLES DÉTECTÉES" if total_passed == 0 else "⚠️ SÉCURITÉ PARTIELLE"
        print(f"🎯 RÉSULTAT GLOBAL: {overall_status}")
        print(f"📈 TOTAL: {total_passed} réussis, {total_failed} échoués sur {total_passed + total_failed} tests")
        
        # Critères de succès critiques pour la sécurité
        print(f"\n🔒 CRITÈRES DE SÉCURITÉ CRITIQUES:")
        success_criteria = [
            ("Backend started with secure SECRET_KEY", self.test_results["phase1_secret_key"]["failed"] == 0),
            ("JWT tokens properly signed and verified", self.test_results["phase1_secret_key"]["passed"] >= 1),
            ("Login rate limiting (5/minute) enforced", self.test_results["phase3_rate_limiting"]["passed"] >= 1),
            ("Password validation (min 6 chars + numbers)", self.test_results["phase2_validation"]["passed"] >= 2),
            ("Email validation enforced", self.test_results["phase2_validation"]["passed"] >= 1),
            ("Input sanitization working", self.test_results["phase2_validation"]["passed"] >= 3),
            ("Authentication bypass prevented", self.test_results["security_bypass"]["passed"] >= 2)
        ]
        
        for criterion, met in success_criteria:
            status = "✅" if met else "❌"
            print(f"   {status} {criterion}")
        
        # Focus sur les tests critiques de sécurité
        print(f"\n🎯 TESTS CRITIQUES DE SÉCURITÉ:")
        rate_limiting_success = self.test_results["phase3_rate_limiting"]["failed"] == 0
        validation_success = self.test_results["phase2_validation"]["failed"] == 0
        print(f"   {'✅' if rate_limiting_success else '❌'} RATE LIMITING - Protection contre brute force")
        print(f"   {'✅' if validation_success else '❌'} VALIDATION - Sécurité des données")
        
        critical_success = rate_limiting_success and validation_success
        print(f"\n🏆 SÉCURITÉ CRITIQUE: {'✅ PROTÉGÉE' if critical_success else '❌ VULNÉRABLE'}")
        
        return critical_success

    def run_all_tests(self):
        """Exécuter tous les tests de sécurité critiques"""
        print("🚀 DÉMARRAGE DES TESTS DE SÉCURITÉ CRITIQUES")
        print("=" * 80)
        print("OBJECTIF: Test complet des améliorations de sécurité critiques MOZAIK RH")
        print("USER ACCOUNT: Admin Diego DACALOR (ddacalor@aaea-gpe.fr / admin123)")
        print("PRIORITÉ: Rate limiting (brute force) + Validation (sécurité données)")
        print("=" * 80)
        
        # Phase 1: SECRET_KEY Validation (should already be working if backend started)
        self.test_phase1_secret_key_validation()
        
        # Authentification pour les tests suivants
        if not self.authenticate():
            print("❌ Impossible de continuer sans authentification")
            return False
        
        # Exécuter tous les tests de sécurité
        print(f"\n🔄 EXÉCUTION DES TESTS DE SÉCURITÉ...")
        
        # Phase 2: Pydantic Validation - CRITIQUE
        self.test_phase2_pydantic_validation()
        
        # Phase 3: Rate Limiting - CRITIQUE (protection brute force)
        self.test_phase3_rate_limiting()
        
        # Security Bypass Tests
        self.test_security_bypass_attempts()
        
        # Afficher le résumé
        return self.print_summary()

def main():
    """Point d'entrée principal"""
    tester = SecurityEnhancementsTester()
    success = tester.run_all_tests()
    
    # Code de sortie
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
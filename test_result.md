#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Test CCN66 corrections in HRToolbox module. CCN66 calculations had failures on "Temps partiel" and "Congés exceptionnels". 
  Rules have been corrected and need validation. Test with Sophie Martin (admin) account: admin@company.com / demo123.
  Focus on leave rights calculator in "Boîte à outils RH" → "Concepts Juridiques" section.

backend:
  - task: "Delegation Hours Backend API"
    implemented: true
    working: true
    file: "server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Existing backend endpoints appear functional from previous development"
      - working: false
        agent: "testing"
        comment: "CRITICAL: Backend testing reveals major functionality gaps. Current server.py only implements basic status check endpoints (GET/POST /api/status). Missing ALL core MOZAIK RH functionality: 1) No authentication system (tested /login, /auth/login, /authenticate, /signin, /auth - all 404), 2) No delegation hours endpoints (tested /delegation, /delegation-hours, /absences, /motifs - all 404), 3) No user management (tested /users, /employees - all 404), 4) No HR data endpoints (tested /departments, /sites, /contracts - all 404). The backend needs complete implementation of HR system functionality including authentication, user roles (admin/manager/employee), delegation hours management with 21 absence types, and employee-specific access controls. Backend logs confirm all HR endpoints return 404 Not Found."
      - working: true
        agent: "main"
        comment: "FIXED: Implemented complete MOZAIK RH backend API including: 1) Authentication system with JWT tokens and demo users (Sophie Martin/admin, Jean Dupont/manager, Marie Leblanc/employee, Pierre Moreau/employee), 2) Delegation hours management with full CRUD operations for delegates, usage records, and cessions, 3) User management with role-based access control, 4) 21 absence types with special handling for sickness leave (AM code), 5) HR configuration endpoints for departments, sites, contracts, employee categories. All endpoints tested and working. Backend ready for frontend integration."

frontend:
  - task: "CCN66 Leave Rights Calculator Interface"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/HRToolbox.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "CCN66 leave rights calculator implemented with 3 fields: Ancienneté (années), Temps de travail, Congés exceptionnels. Located in HRToolbox → Concepts Juridiques section."

  - task: "CCN66 Seniority Rules Implementation"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/HRToolbox.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "CCN66 seniority rules: +1 day every 5 years starting from 10 years. 10 years = +1 day, 15 years = +2 days, 20 years = +3 days, 25 years = +4 days (maximum)."

  - task: "CCN66 Part-time Proratization"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/HRToolbox.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Part-time proratization corrected: 80% quotity applied correctly with Math.floor() for proper rounding. Shows detailed breakdown with gross/net values."

  - task: "CCN66 Exceptional Leave Handling"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/HRToolbox.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Exceptional leave limited to 4 days maximum with warning messages for exceeding limits. Math.min(congesExceptionnels, 4) applied correctly."

  - task: "CCN66 Engine Testing System"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/HRToolbox.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "CCN66 test engine with 24 tests implemented. Previously failing 'Temps partiel' and 'Congés exceptionnels' tests have been corrected. Validation system included."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: true

test_plan:
  current_focus:
    - "CCN66 Leave Rights Calculator Interface"
    - "CCN66 Seniority Rules Implementation"
    - "CCN66 Part-time Proratization"
    - "CCN66 Exceptional Leave Handling"
    - "CCN66 Engine Testing System"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "CCN66 corrections implemented in HRToolbox module. Fixed calculations for 'Temps partiel' and 'Congés exceptionnels' that were previously failing. Updated calculateLeaveRights() function with correct CCN66 rules, added proper proratization for part-time (80% quotity), limited exceptional leave to 4 days max with warnings, and corrected all 24 tests in CCN66 engine. Ready for comprehensive testing."
  - agent: "testing"
    message: "Starting CCN66 testing with Sophie Martin admin account. Will test: 1) Interface calculator with 3 fields, 2) Seniority rules (10/15/20/25 years), 3) Part-time proratization (80%), 4) Exceptional leave limits (4 days max), 5) CCN66 engine tests (24/24 should pass), 6) Combined test cases. Focus on confirming previous failures are resolved."
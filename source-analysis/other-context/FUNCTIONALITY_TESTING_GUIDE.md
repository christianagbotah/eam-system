# 🧪 Comprehensive Functionality Testing Guide

**Project**: iFactory EAM System  
**Version**: 2.0.0  
**Purpose**: Verify all features are working correctly  
**Date**: 2024

---

## 📋 TESTING OVERVIEW

This guide will help you systematically test all 13 migrated modules and advanced features to ensure everything works as expected.

---

## 🎯 TESTING APPROACH

### Test Environment
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost/factorymanager/public/index.php/api/v1/eam
- **Database**: MySQL (factory_manager)

### Test Accounts
```
Admin:
- Username: admin
- Password: admin123
- Permissions: All (279 permissions)

Technician:
- Username: technician1
- Password: password
- Permissions: Limited (work orders, assets view)

Operator:
- Username: operator1
- Password: password
- Permissions: Minimal (production surveys)
```

---

## ✅ MODULE-BY-MODULE TESTING

### 1. Authentication & Permissions ✅

#### Test 1.1: Login
```
Steps:
1. Navigate to http://localhost:3000/login
2. Enter username: admin
3. Enter password: admin123
4. Click "Login"

Expected Results:
✓ Redirected to /dashboard
✓ Token stored in localStorage
✓ Permissions loaded (check browser console)
✓ User info displayed in header
```

#### Test 1.2: Permission Check
```
Steps:
1. Open browser console (F12)
2. Type: localStorage.getItem('permissions')
3. Verify permissions array is present

Expected Results:
✓ Array of 279 permissions for admin
✓ Permissions include: work_orders.view, assets.create, etc.
```

#### Test 1.3: Logout
```
Steps:
1. Click user menu in header
2. Click "Logout"

Expected Results:
✓ Redirected to /login
✓ Token removed from localStorage
✓ Cannot access protected pages
```

---

### 2. Dashboard 📊

#### Test 2.1: Dashboard Load
```
Steps:
1. Login as admin
2. Navigate to /dashboard

Expected Results:
✓ Page loads within 2 seconds
✓ Stats cards display (Work Orders, Assets, Inventory, Production)
✓ Quick action buttons visible
✓ Real-time data displayed
```

#### Test 2.2: Stats Cards
```
Steps:
1. Check each stat card
2. Verify numbers are accurate

Expected Results:
✓ Work Orders count matches database
✓ Assets count matches database
✓ Inventory count matches database
✓ Production count matches database
```

#### Test 2.3: Quick Actions
```
Steps:
1. Click each quick action button
2. Verify navigation

Expected Results:
✓ "Create Work Order" → /work-orders (with modal)
✓ "View Assets" → /assets
✓ "Inventory" → /inventory
✓ "Reports" → /reports
```

---

### 3. Work Orders Module 🔧

#### Test 3.1: Work Orders List
```
Steps:
1. Navigate to /work-orders
2. Verify page loads

Expected Results:
✓ Gradient header (blue → indigo → purple)
✓ Stats dashboard (Total, Draft, Assigned, In Progress, Completed)
✓ Work orders table/cards displayed
✓ Search bar functional
✓ Filters working (status, priority, type)
✓ Pagination controls visible
```

#### Test 3.2: Create Work Order
```
Steps:
1. Click "Create Work Order" button
2. Fill in form:
   - Title: "Test Work Order"
   - Description: "Testing functionality"
   - Asset: Select any asset
   - Priority: High
   - Type: Corrective
3. Click "Create"

Expected Results:
✓ Modal opens
✓ Form validation works
✓ Success toast notification
✓ New work order appears in list
✓ Modal closes
```

#### Test 3.3: Work Order Detail
```
Steps:
1. Click on any work order
2. Navigate to detail page

Expected Results:
✓ Work order information displayed
✓ Asset details shown
✓ Team assignment visible
✓ Safety information displayed
✓ Materials & tools listed
✓ Action buttons based on permissions
```

#### Test 3.4: Search & Filter
```
Steps:
1. Type in search bar: "pump"
2. Select status filter: "In Progress"
3. Select priority filter: "High"

Expected Results:
✓ Results update in real-time
✓ Only matching work orders shown
✓ Count updates correctly
```

#### Test 3.5: Pagination
```
Steps:
1. Scroll to bottom of page
2. Click "Next" button
3. Click "Previous" button

Expected Results:
✓ Page 2 loads
✓ Different work orders shown
✓ Page indicator updates
✓ Previous button works
```

---

### 4. Assets Module 📦

#### Test 4.1: Assets List
```
Steps:
1. Navigate to /assets
2. Verify page loads

Expected Results:
✓ Gradient header (green → teal → cyan)
✓ Stats dashboard visible
✓ Grid/List view toggle works
✓ Assets displayed correctly
✓ Search functional
✓ Filters working
```

#### Test 4.2: Grid View
```
Steps:
1. Click grid view icon
2. Verify layout

Expected Results:
✓ Assets displayed in card grid
✓ Asset icons visible
✓ Asset names and codes shown
✓ Status badges displayed
✓ Hover effects work
```

#### Test 4.3: List View
```
Steps:
1. Click list view icon
2. Verify layout

Expected Results:
✓ Assets displayed in table
✓ All columns visible
✓ Sortable columns work
✓ Row hover effects
```

#### Test 4.4: Create Asset
```
Steps:
1. Click "Add Asset" button
2. Fill in form:
   - Asset Code: "TEST-001"
   - Asset Name: "Test Asset"
   - Type: Equipment
   - Status: Active
3. Click "Create"

Expected Results:
✓ Modal opens
✓ Form validation works
✓ Success notification
✓ New asset in list
```

#### Test 4.5: Export Assets
```
Steps:
1. Click "Export" button
2. Check downloads folder

Expected Results:
✓ CSV file downloaded
✓ Filename: assets-YYYY-MM-DD.csv
✓ All assets included
✓ Correct columns
```

---

### 5. Inventory Module 📦

#### Test 5.1: Inventory List
```
Steps:
1. Navigate to /inventory
2. Verify page loads

Expected Results:
✓ Gradient header (orange → amber → yellow)
✓ Stats dashboard (Total, Low Stock, Out of Stock, Value)
✓ Grid/List view toggle
✓ Inventory items displayed
✓ Stock status badges
```

#### Test 5.2: Stock In
```
Steps:
1. Click "Stock In" on any item
2. Enter quantity: 10
3. Click "Submit"

Expected Results:
✓ Modal opens
✓ Before/After quantities shown
✓ Success notification
✓ Quantity updated in list
```

#### Test 5.3: Low Stock Alert
```
Steps:
1. Check stats dashboard
2. Verify low stock count

Expected Results:
✓ Low stock items highlighted
✓ Count matches items with quantity < reorder level
✓ Red badge on low stock items
```

#### Test 5.4: Search Inventory
```
Steps:
1. Type in search: "bearing"
2. Verify results

Expected Results:
✓ Only matching items shown
✓ Search works on name, code, category
✓ Real-time filtering
```

---

### 6. Maintenance Requests Module 🔨

#### Test 6.1: Requests List
```
Steps:
1. Navigate to /maintenance/requests
2. Verify page loads

Expected Results:
✓ Gradient header (red → pink → purple)
✓ Stats dashboard visible
✓ Workflow status tabs
✓ Requests displayed
✓ Search functional
```

#### Test 6.2: Create Request
```
Steps:
1. Click "Create Request" button
2. Fill in form:
   - Title: "Test Request"
   - Description: "Testing"
   - Priority: High
   - Location: "Building A"
3. Click "Submit"

Expected Results:
✓ Modal opens
✓ Form validation
✓ Success notification
✓ New request in list
```

#### Test 6.3: Convert to Work Order
```
Steps:
1. Click "Convert to WO" on any request
2. Fill in work order details
3. Click "Create Work Order"

Expected Results:
✓ Modal opens with WO form
✓ Request details pre-filled
✓ Work order created
✓ Request status updated
```

#### Test 6.4: Workflow Status
```
Steps:
1. Check request status
2. Verify workflow progression

Expected Results:
✓ Status badges color-coded
✓ Workflow: Pending → Assigned → In Progress → Completed
✓ Status updates correctly
```

---

### 7. PM Schedules Module 📅

#### Test 7.1: PM Schedules List
```
Steps:
1. Navigate to /pm-schedules
2. Verify page loads

Expected Results:
✓ Gradient header (purple → pink → red)
✓ Stats dashboard (Total, Due This Week, Overdue, Completed)
✓ Table/Calendar view toggle
✓ Schedules displayed
```

#### Test 7.2: Table View
```
Steps:
1. Verify table view is active
2. Check schedule details

Expected Results:
✓ All schedules listed
✓ Frequency displayed
✓ Next due date shown
✓ Status badges visible
```

#### Test 7.3: Calendar View (if implemented)
```
Steps:
1. Click "Calendar" view toggle
2. Verify calendar display

Expected Results:
✓ Calendar grid displayed
✓ Schedules on correct dates
✓ Color-coded by priority
✓ Click events to view details
```

#### Test 7.4: Create PM Schedule
```
Steps:
1. Click "Add Schedule" button
2. Fill in form:
   - Asset: Select asset
   - Frequency: 30 days
   - Next Due: Select date
3. Click "Create"

Expected Results:
✓ Modal opens
✓ Form validation
✓ Success notification
✓ New schedule in list
```

---

### 8. Reports Hub Module 📊

#### Test 8.1: Reports List
```
Steps:
1. Navigate to /reports
2. Verify page loads

Expected Results:
✓ Gradient header (indigo → purple → pink)
✓ 12 report types displayed
✓ 10 categories visible
✓ Search functional
✓ Report cards clickable
```

#### Test 8.2: Generate Report
```
Steps:
1. Click on "Work Orders Report"
2. Select date range
3. Click "Generate"

Expected Results:
✓ Report parameters modal opens
✓ Date picker works
✓ Report generates
✓ Data displayed correctly
```

#### Test 8.3: Export Report
```
Steps:
1. Generate any report
2. Click "Export" dropdown
3. Select "CSV"

Expected Results:
✓ Export options shown (CSV, PDF, Excel)
✓ File downloads
✓ Correct format
✓ All data included
```

#### Test 8.4: Search Reports
```
Steps:
1. Type in search: "asset"
2. Verify results

Expected Results:
✓ Only matching reports shown
✓ Search works on title and category
✓ Real-time filtering
```

---

### 9. Users Management Module 👥

#### Test 9.1: Users List
```
Steps:
1. Navigate to /users
2. Verify page loads

Expected Results:
✓ Gradient header (indigo → purple)
✓ Stats dashboard (Total, Active, Inactive)
✓ Users table displayed
✓ Search functional
✓ Role filter works
```

#### Test 9.2: Create User
```
Steps:
1. Click "Add User" button
2. Fill in form:
   - Username: "testuser"
   - Email: "test@example.com"
   - Role: Technician
   - Password: "password123"
3. Click "Create"

Expected Results:
✓ Modal opens
✓ Form validation
✓ Success notification
✓ New user in list
```

#### Test 9.3: Edit User
```
Steps:
1. Click edit icon on any user
2. Change email
3. Click "Update"

Expected Results:
✓ Modal opens with user data
✓ Changes saved
✓ Success notification
✓ List updates
```

#### Test 9.4: Export Users
```
Steps:
1. Click "Export" button
2. Check downloads

Expected Results:
✓ CSV file downloaded
✓ All users included
✓ Correct columns
```

---

### 10. Roles & Permissions Module 🔐

#### Test 10.1: Roles List
```
Steps:
1. Navigate to /settings/roles
2. Verify page loads

Expected Results:
✓ Gradient header (purple → pink)
✓ 15 roles displayed
✓ Permission counts shown
✓ System roles protected
```

#### Test 10.2: View Role Permissions
```
Steps:
1. Click on "Technician" role
2. View permissions

Expected Results:
✓ Role details displayed
✓ Assigned permissions listed
✓ Permission count accurate
```

#### Test 10.3: Permissions Viewer
```
Steps:
1. Navigate to /settings/permissions
2. Verify page loads

Expected Results:
✓ 279 permissions displayed
✓ Grouped by module (11 modules)
✓ Search functional
✓ Module filter works
```

#### Test 10.4: Search Permissions
```
Steps:
1. Type in search: "work_orders"
2. Verify results

Expected Results:
✓ Only work order permissions shown
✓ Real-time filtering
✓ Count updates
```

---

### 11. Departments Module 🏢

#### Test 11.1: Departments List
```
Steps:
1. Navigate to /departments
2. Verify page loads

Expected Results:
✓ Gradient header (indigo → purple → pink)
✓ Stats dashboard (Total, Active, Employees)
✓ Departments displayed
✓ Hierarchical/Flat view toggle
```

#### Test 11.2: Create Department
```
Steps:
1. Click "Add Department" button
2. Fill in form:
   - Code: "TEST"
   - Name: "Test Department"
   - Manager: Select manager
3. Click "Create"

Expected Results:
✓ Modal opens
✓ Form validation
✓ Success notification
✓ New department in list
```

#### Test 11.3: View Toggle
```
Steps:
1. Click "Hierarchical" view
2. Click "Flat" view

Expected Results:
✓ View changes
✓ Hierarchical shows parent/child
✓ Flat shows all departments
```

---

### 12. Training Records Module 🎓

#### Test 12.1: Training List
```
Steps:
1. Navigate to /operations/training
2. Verify page loads

Expected Results:
✓ Gradient header (blue → indigo → purple)
✓ Stats dashboard (Completed, Expiring, Total)
✓ Tabs (All / Expiring Soon)
✓ Records displayed
```

#### Test 12.2: Create Training Record
```
Steps:
1. Click "Add Training" button
2. Fill in form:
   - Employee ID: 1
   - Training Type: "Safety Training"
   - Date: Today
   - Score: 95
3. Click "Create"

Expected Results:
✓ Modal opens
✓ Form validation
✓ Success notification
✓ New record in list
```

#### Test 12.3: Expiring Soon Tab
```
Steps:
1. Click "Expiring Soon" tab
2. Verify records

Expected Results:
✓ Only expiring records shown
✓ Count matches badge
✓ Yellow alert indicators
```

---

### 13. Calibration Management Module ⚙️

#### Test 13.1: Calibration List
```
Steps:
1. Navigate to /maintenance/calibration
2. Verify page loads

Expected Results:
✓ Gradient header (purple → pink → red)
✓ Stats dashboard (Current, Due Soon, Overdue)
✓ Tabs (All / Overdue)
✓ Records displayed
```

#### Test 13.2: Create Calibration Record
```
Steps:
1. Click "Add Calibration" button
2. Fill in form:
   - Asset ID: 1
   - Last Calibration: Today
   - Frequency: 365 days
   - Certificate: "CAL-001"
3. Click "Create"

Expected Results:
✓ Modal opens
✓ Form validation
✓ Success notification
✓ New record in list
```

#### Test 13.3: Overdue Tab
```
Steps:
1. Click "Overdue" tab
2. Verify records

Expected Results:
✓ Only overdue records shown
✓ Count matches badge
✓ Red alert indicators
```

---

### 14. Teams Management Module 👥

#### Test 14.1: Teams List
```
Steps:
1. Navigate to /teams
2. Verify page loads

Expected Results:
✓ Gradient header (indigo → purple → pink)
✓ Stats dashboard (Total, Active, Inactive, Roles)
✓ Team members in grid
✓ Search functional
```

#### Test 14.2: Search Team Members
```
Steps:
1. Type in search: "john"
2. Verify results

Expected Results:
✓ Only matching members shown
✓ Search works on name, email, role
✓ Real-time filtering
```

#### Test 14.3: Filter by Role
```
Steps:
1. Select role filter: "Technician"
2. Verify results

Expected Results:
✓ Only technicians shown
✓ Count updates
✓ Filter works correctly
```

---

## 🚀 ADVANCED FEATURES TESTING

### 15. WebSocket Real-time Updates

#### Test 15.1: Connection Status
```
Steps:
1. Login to application
2. Check header for realtime indicator

Expected Results:
✓ Realtime indicator visible
✓ Shows "Connected" status
✓ Green pulse animation
✓ Wifi icon displayed
```

#### Test 15.2: Real-time Notifications
```
Steps:
1. Open two browser windows
2. Login to both as different users
3. Create work order in window 1
4. Check window 2

Expected Results:
✓ Notification appears in window 2
✓ Toast message displayed
✓ Work order list updates
✓ No page refresh needed
```

---

### 16. Calendar View

#### Test 16.1: Calendar Display
```
Steps:
1. Navigate to PM Schedules
2. Click "Calendar" view (if available)

Expected Results:
✓ Calendar grid displayed
✓ Current month shown
✓ Events on correct dates
✓ Color-coded by priority
```

#### Test 16.2: Calendar Navigation
```
Steps:
1. Click "Previous Month"
2. Click "Next Month"
3. Click "Today"

Expected Results:
✓ Month changes correctly
✓ Events update
✓ Today button returns to current month
```

---

## 📊 PERFORMANCE TESTING

### Test P1: Page Load Times
```
Steps:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to each module
4. Record load times

Expected Results:
✓ Dashboard: <2s
✓ Work Orders: <2s
✓ Assets: <2s
✓ Inventory: <2s
✓ All other pages: <2s
```

### Test P2: API Response Times
```
Steps:
1. Open browser DevTools
2. Go to Network tab
3. Filter by "XHR"
4. Check API call times

Expected Results:
✓ GET requests: <150ms
✓ POST requests: <200ms
✓ PUT requests: <200ms
✓ DELETE requests: <150ms
```

### Test P3: Search Performance
```
Steps:
1. Go to any list page
2. Type in search box
3. Measure response time

Expected Results:
✓ Results update in <100ms
✓ No lag or delay
✓ Smooth typing experience
```

---

## 🔒 SECURITY TESTING

### Test S1: Unauthorized Access
```
Steps:
1. Logout
2. Try to access /work-orders directly
3. Try to access /users directly

Expected Results:
✓ Redirected to /login
✓ Cannot access protected pages
✓ Token required for API calls
```

### Test S2: Permission Enforcement
```
Steps:
1. Login as "operator1" (limited permissions)
2. Try to access /users
3. Try to create work order

Expected Results:
✓ Cannot access admin pages
✓ Create button hidden (no permission)
✓ Only allowed actions visible
```

### Test S3: Token Expiration
```
Steps:
1. Login
2. Wait for token to expire (or manually delete)
3. Try to perform action

Expected Results:
✓ Redirected to login
✓ Error message displayed
✓ Must re-authenticate
```

---

## 📱 MOBILE RESPONSIVENESS

### Test M1: Mobile Layout
```
Steps:
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone/Android
4. Navigate through pages

Expected Results:
✓ All pages responsive
✓ No horizontal scroll
✓ Buttons accessible
✓ Text readable
✓ Images scale correctly
```

### Test M2: Touch Interactions
```
Steps:
1. Use mobile device or emulator
2. Test tap interactions
3. Test swipe gestures

Expected Results:
✓ Buttons respond to tap
✓ Links work correctly
✓ Modals open/close
✓ Dropdowns work
```

---

## 🐛 BUG REPORTING TEMPLATE

If you find any issues, please document them:

```
Bug ID: [Unique ID]
Module: [Module name]
Severity: [Critical/High/Medium/Low]
Description: [What happened]
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]
Expected Result: [What should happen]
Actual Result: [What actually happened]
Browser: [Chrome/Firefox/Safari/Edge]
Screenshot: [Attach if applicable]
```

---

## ✅ TESTING CHECKLIST

### Core Modules
- [ ] Authentication & Permissions
- [ ] Dashboard
- [ ] Work Orders
- [ ] Assets
- [ ] Inventory
- [ ] Maintenance Requests
- [ ] PM Schedules
- [ ] Reports Hub

### Admin Modules
- [ ] Users Management
- [ ] Roles & Permissions
- [ ] Departments

### Optional Modules
- [ ] Training Records
- [ ] Calibration Management
- [ ] Teams Management

### Advanced Features
- [ ] WebSocket Real-time
- [ ] Calendar View

### Cross-cutting
- [ ] Performance
- [ ] Security
- [ ] Mobile Responsiveness

---

## 📝 TEST RESULTS SUMMARY

### Overall Status
- **Total Tests**: _____ / _____
- **Passed**: _____
- **Failed**: _____
- **Blocked**: _____
- **Pass Rate**: _____%

### Critical Issues
```
[List any critical issues found]
```

### Recommendations
```
[List recommendations for improvements]
```

---

**Status**: Ready for Testing  
**Next Steps**: Execute tests and document results

---

**Let's test the system thoroughly! 🧪**

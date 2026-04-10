# 🚀 Week 1 Quick Start Testing Guide

## Prerequisites ✅
- ✅ Backend: WAMP running on port 80
- ✅ Frontend: Node.js development server
- ✅ Database: MySQL with 279 permissions, 15 roles seeded
- ✅ Users: 10 users assigned to roles

---

## Step 1: Start Servers (2 minutes)

### Backend
```bash
# WAMP should already be running
# Verify: http://localhost/factorymanager/public/index.php/api/v1/eam/auth/login
```

### Frontend
```bash
cd c:\devs\factorymanager
npm run dev
```

**Expected**: Server running on `http://localhost:3000`

---

## Step 2: Test Admin User (5 minutes)

### 2.1 Login
1. Open browser: `http://localhost:3000/login`
2. Enter credentials:
   - Username: `admin`
   - Password: `admin123`
3. Click "Sign In"

### 2.2 Verify Dashboard
**Expected Results**:
- ✅ URL changes to `/dashboard`
- ✅ Welcome message shows "Welcome back, Administrator!"
- ✅ Role shows "admin"
- ✅ All 4 stat widgets visible:
  - Work Orders
  - Assets
  - Inventory
  - Production (OEE)
- ✅ All 6 quick actions visible:
  - New Work Order
  - Add Asset
  - Request Maintenance
  - Schedule PM
  - View Reports
  - Production Survey

### 2.3 Check Browser Console
**Expected**:
- ✅ No errors
- ✅ No 401 Unauthorized errors
- ✅ API calls successful

### 2.4 Check localStorage
**Open DevTools → Application → Local Storage**

**Expected**:
- ✅ `token` exists
- ✅ `user_permissions` exists (array with 279 items)
- ✅ `user` object exists

---

## Step 3: Test Technician User (5 minutes)

### 3.1 Logout Admin
1. Click logout button (if available)
2. Or clear localStorage and refresh

### 3.2 Login as Technician
1. Navigate to `http://localhost:3000/login`
2. Enter credentials:
   - Username: `technician1`
   - Password: `password`
3. Click "Sign In"

### 3.3 Verify Dashboard
**Expected Results**:
- ✅ URL changes to `/dashboard`
- ✅ Welcome message shows technician name
- ✅ Role shows "technician"
- ✅ Limited widgets visible:
  - ✅ Work Orders (own only)
  - ✅ Assets
  - ❌ Inventory (hidden)
  - ❌ Production (hidden)
- ✅ Limited quick actions:
  - ❌ New Work Order (hidden)
  - ❌ Add Asset (hidden)
  - ✅ Request Maintenance (visible)
  - ❌ Schedule PM (hidden)
  - ❌ View Reports (hidden)
  - ❌ Production Survey (hidden)

### 3.4 Check localStorage
**Expected**:
- ✅ `user_permissions` has 22 items (not 279)

---

## Step 4: Test Operator User (5 minutes)

### 4.1 Logout Technician
Clear localStorage and refresh

### 4.2 Login as Operator
1. Navigate to `http://localhost:3000/login`
2. Enter credentials:
   - Username: `operator1`
   - Password: `password`
3. Click "Sign In"

### 4.3 Verify Dashboard
**Expected Results**:
- ✅ URL changes to `/dashboard`
- ✅ Role shows "operator"
- ✅ Production-focused widgets:
  - ❌ Work Orders (hidden)
  - ✅ Assets (visible)
  - ❌ Inventory (hidden)
  - ✅ Production (visible)
- ✅ Production quick actions:
  - ❌ New Work Order (hidden)
  - ❌ Add Asset (hidden)
  - ✅ Request Maintenance (visible)
  - ❌ Schedule PM (hidden)
  - ❌ View Reports (hidden)
  - ✅ Production Survey (visible)

### 4.4 Check localStorage
**Expected**:
- ✅ `user_permissions` has 14 items

---

## Step 5: Test API Endpoints (5 minutes)

### 5.1 Test Login Endpoint
```bash
curl -X POST http://localhost/factorymanager/public/index.php/api/v1/eam/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

**Expected Response**:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "admin",
    "permissions": ["assets.view", "assets.create", ...]
  }
}
```

### 5.2 Test Dashboard Endpoint
```bash
# Copy token from step 5.1
curl -X GET http://localhost/factorymanager/public/index.php/api/v1/eam/dashboard/unified \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "status": "success",
  "data": {
    "workOrders": { "total": 150, "pending": 25, ... },
    "assets": { "total": 500, "active": 450, ... },
    "inventory": { "total": 1200, ... },
    "production": { "oee": 82.5, ... }
  }
}
```

---

## Step 6: Verify Permission System (3 minutes)

### 6.1 Check Permission Guard
1. Login as technician
2. Try to access admin-only features
3. Verify they are hidden/disabled

### 6.2 Check Browser Console
**Open DevTools → Console**

**Look for**:
- ✅ No permission errors
- ✅ No 401 errors
- ✅ Clean console output

---

## Common Issues & Solutions

### Issue 1: Login fails with 401
**Solution**: Check database credentials in `.env` file

### Issue 2: Dashboard shows no data
**Solution**: 
1. Check if backend is running
2. Verify API URL in `.env.local`
3. Check browser console for errors

### Issue 3: All widgets visible for all users
**Solution**:
1. Clear localStorage
2. Login again
3. Verify permissions in localStorage

### Issue 4: 401 Unauthorized on API calls
**Solution**:
1. Check if token is in localStorage
2. Verify token is being sent in Authorization header
3. Check token expiration

### Issue 5: Frontend not loading
**Solution**:
```bash
cd c:\devs\factorymanager
npm install
npm run dev
```

---

## Success Checklist

### Backend ✅
- [x] Database has 279 permissions
- [x] Database has 15 roles
- [x] Users assigned to roles
- [x] Login endpoint returns permissions
- [x] Dashboard endpoint works

### Frontend ⏳
- [ ] Login page works
- [ ] Redirects to /dashboard
- [ ] Dashboard loads for all roles
- [ ] Widgets adapt to permissions
- [ ] Quick actions filtered
- [ ] No console errors

### Integration ⏳
- [ ] Admin sees all features
- [ ] Technician sees limited features
- [ ] Operator sees production features
- [ ] Permission checks work
- [ ] API authentication works

---

## Test Results

**Date**: __________
**Tester**: __________

| Test | Status | Notes |
|------|--------|-------|
| Admin Login | ⏳ | |
| Admin Dashboard | ⏳ | |
| Technician Login | ⏳ | |
| Technician Dashboard | ⏳ | |
| Operator Login | ⏳ | |
| Operator Dashboard | ⏳ | |
| API Login | ⏳ | |
| API Dashboard | ⏳ | |
| Permission Guards | ⏳ | |
| No Console Errors | ⏳ | |

**Overall Status**: ⏳ PENDING

---

## Next Steps After Testing

1. ✅ Document any issues found
2. 🔧 Fix bugs if any
3. 📝 Update test report
4. 🚀 Begin Week 2 implementation

---

**Ready to test? Start with Step 1!** 🚀

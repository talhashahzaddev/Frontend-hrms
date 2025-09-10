# HRMS Frontend Troubleshooting Guide

## Issue: Blank Screen on Startup

### Problem Description
When starting the HRMS application, users experienced a blank screen with console errors related to `MessageService` from PrimeNG.

### Root Causes
1. **Missing MessageService Provider**: PrimeNG's `ToastModule` requires `MessageService` to be provided in the dependency injection container
2. **Authentication State Timing**: The authentication state wasn't being properly initialized on app startup
3. **Missing PWA Manifest**: Browser was looking for `manifest.json` file that didn't exist

### Solutions Applied

#### 1. Fixed MessageService Provider
**File**: `src/main.ts`
- Added `MessageService` import from `primeng/api`
- Added `MessageService` to the providers array in `bootstrapApplication`

#### 2. Improved Authentication Flow
**File**: `src/app/core/services/auth.service.ts`
- Modified `loadStoredAuth()` to explicitly set authentication state
- Improved `clearAuthData()` method
- Enhanced logout flow with proper navigation

#### 3. Created PWA Manifest
**File**: `src/manifest.json`
- Created complete PWA manifest file
- Configured app name, theme colors, and icons

### Verification Steps
1. Check browser console - no more `NullInjectorError` messages
2. Verify app loads properly on `http://localhost:4200`
3. Confirm authentication flow works (shows login page when not authenticated)
4. Test navigation between different modules

### Additional Notes
- The app uses Angular 17+ standalone components architecture
- Authentication is JWT-based with role-based access control
- The UI follows Hubstaff-inspired design patterns
- All major modules (Employee, Attendance, Leave, Payroll, Performance) are implemented

### Common Issues and Solutions

#### Issue: Still seeing blank screen
- Clear browser cache and localStorage
- Check network tab for failed API calls
- Verify Angular dev server is running properly

#### Issue: Authentication not working
- Check `environment.ts` API URL configuration
- Verify backend API is running (though not required for frontend-only testing)
- Clear localStorage to reset authentication state

#### Issue: Routing problems
- Check that all lazy-loaded routes have corresponding files
- Verify guards are properly implemented
- Check browser console for route resolution errors

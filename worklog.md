---
Task ID: 1
Agent: Main Agent
Task: Fix IoT Devices page missing action buttons + comprehensive permission system audit

Work Log:
- Discovered permission slug mismatches: code used `iot.create/update/delete` but seed defines `iot_devices.create/update/delete`
- Found 12 occurrences across 9 API route files (IoT + Telemetry) with wrong slugs
- Found 4 IoT API routes with NO permission checks at all (rules, alerts)
- Found IoTPages.tsx had wrong slugs and missing permission gates on Edit/Remove actions
- Found duplicate className props causing JSX errors in IoTPages.tsx
- Found pagePermissions map in EAMApp.tsx had 23 stale legacy entries and 87 unguarded pages
- Fixed all 12 API route permission slug mismatches
- Added permission checks to 4 unprotected IoT routes
- Fixed IoTPages.tsx: corrected slugs, added Edit/Remove permission gates, fixed duplicate classNames
- Completely rewrote pagePermissions map: 23 legacy removed, 87 new guards added, total 104 entries
- Verified all permission slugs match seed definitions
- Committed and pushed to GitHub

Stage Summary:
- 15 files changed, 146 insertions, 58 deletions
- All IoT permission slugs now match database seed definitions
- All 104 sidebar pages now have route-level permission guards
- 4 previously unprotected API routes now have proper permission checks
- Deployment to VPS pending (SSH not available in sandbox)

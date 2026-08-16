# iAssetsPro Repairs/RWOP — Manual Role-Based UAT Checklist

This checklist is used during industrial User Acceptance Testing. Each item must be verified by the designated tester and signed off.

---

## 1. REQUESTER

| # | Screen | Action | Expected Result | Forbidden | Evidence |
|---|-------|--------|-----------------|----------|----------|
| 1.1 | Maintenance Requests | Create new MR with asset, description, priority | MR saved, status=pending, MR number assigned | Cannot approve own MR | Screenshot of MR list showing new entry |
| 1.2 | MR Detail | View submitted MR | Shows all fields, requester name, timestamp | Cannot edit after submission | Screenshot |
| 1.3 | MR List | Filter by status (pending, approved, rejected, converted) | Correct filtering | — | Screenshot of each filter |
| 1.4 | WO Detail (after conversion) | View WO created from MR | MR link visible, WO number displayed | Cannot modify WO execution | Screenshot of WO with MR reference |
| 1.5 | Notifications | Receive notification when WO is closed | Notification received with WO number | — | Screenshot of notification |

---

## 2. SUPERVISOR

| # | Screen | Action | Expected Result | Forbidden | Evidence |
|---|-------|--------|-----------------|----------|----------|
| 2.1 | Supervisor Inbox | View pending MRs for approval | List of pending MRs with requester info | Cannot create MRs | Screenshot |
| 2.2 | MR Detail | Approve MR | Status→approved, planner notified | Cannot reject without reason | Screenshot |
| 2.3 | MR Detail | Reject MR with reason | Status→rejected, requester notified | Cannot approve after rejection | Screenshot |
| 2.4 | Supervisor Inbox | View WOs awaiting verification | Completed WOs listed | Cannot verify WOs from other plants | Screenshot |
| 2.5 | WO Verification | Verify completed WO | Status→verified, quality rating saved | Cannot verify without viewing completion details | Screenshot |
| 2.6 | WO Verification | Request rework with reason | Status→in_progress, rework counter incremented, team notified | Cannot request rework without reason | Screenshot of rework comment |
| 2.7 | WO Detail | Assign technician (if delegated by planner) | Technician assigned, notified | Cannot assign inactive users | Screenshot |
| 2.8 | Assistance Requests | Approve/reject assistance request | Requested user notified, added to team if approved | Cannot approve for users without plant access | Screenshot |

---

## 3. PLANNER

| # | Screen | Action | Expected Result | Forbidden | Evidence |
|---|-------|--------|-----------------|----------|----------|
| 3.1 | Planner Inbox | View approved MRs | List with MR numbers, priority, asset | Cannot approve MRs (supervisor role) | Screenshot |
| 3.2 | Convert MR → WO | Convert approved MR to work order | WO created with WO-YYYYMM-NNNN format, MR linked | Cannot convert rejected/pending MR | Screenshot of new WO |
| 3.3 | WO Planning | Add tasks, tools, materials, safety notes | All items saved under WO | Cannot add items to locked WO | Screenshot of task list |
| 3.4 | WO Assignment | Assign single technician | Technician shows as assignee, notified | Cannot assign user without plant access | Screenshot |
| 3.5 | WO Assignment | Assign team + team leader | Team members visible, leader flagged | Cannot complete multi-tech WO as non-leader | Screenshot of team view |
| 3.6 | WO Assignment | Delegate to supervisor for assignment | Supervisor can now assign | — | Screenshot |
| 3.7 | Planner Closeout Inbox | View verified WOs awaiting closure | List of verified WOs with cost summary | Cannot close unverified WO | Screenshot |
| 3.8 | WO Close | Close verified WO with failure coding | Status→closed, WO locked, reliability event created | Cannot reopen closed WO | Screenshot of closed WO |
| 3.9 | Reports | Export XLSX report | Valid .xlsx file downloaded with WO data | Cannot export WOs from unauthorized plants | Downloaded file |
| 3.10 | Closed WO Pack | Download PDF pack | Multi-section PDF generated | — | Downloaded PDF |

---

## 4. TECHNICIAN (Single-Tech)

| # | Screen | Action | Expected Result | Forbidden | Evidence |
|---|-------|--------|-----------------|----------|----------|
| 4.1 | Technician Workspace | View assigned WO | Full WO detail, tasks, team, schedule | Cannot view WOs from other plants | Screenshot |
| 4.2 | Capabilities Check | Verify action buttons match assignment | Start/Pause/Complete visible; Verify/Close hidden | Must NOT see Verify/Close buttons | Screenshot showing correct buttons |
| 4.3 | Start Work | Click Start | Status→in_progress, timer starts, time log created | Cannot start WO assigned to someone else | Screenshot of running timer |
| 4.4 | Timer Accuracy | Let timer run, pause, resume | Active time excludes pause duration | Timer should not count pause time | Screenshot showing time breakdown |
| 4.5 | Task Execution | Toggle tasks complete/incomplete | Task status updates, progress bar updates | Cannot modify tasks on locked WO | Screenshot of task progress |
| 4.6 | Time Tab | View time history | All start/pause/resume entries visible with durations | — | Screenshot |
| 4.7 | Request Tools | View tool requests, status | Shows pending/approved/issued tools | Cannot approve own tool requests | Screenshot |
| 4.8 | Request Materials | View material requests, status | Shows quantities requested/issued/consumed | Cannot approve own material requests | Screenshot |
| 4.9 | Request Assistance | Submit assistance request | Request created, supervisor notified | — | Screenshot |
| 4.10 | Evidence Tab | Upload photo from camera | Photo uploaded, appears in list | — | Screenshot of uploaded photo |
| 4.11 | Evidence Tab | Record voice note | Recording starts, stops, uploads, plays back | — | Screenshot of voice note list |
| 4.12 | Evidence Tab | Record measurement (before/after) | Reading saved with pass/fail indicator | — | Screenshot of measurements list |
| 4.13 | Pause Work | Pause with reason | Status→on_hold, timer stops, reason saved | Cannot pause without reason | Screenshot |
| 4.14 | Resume Work | Resume after pause | Status→in_progress, timer resumes | — | Screenshot |
| 4.15 | Completion Tab | Submit completion with failure coding | Status→completed if readiness passes | Cannot complete with active timers or unreconciled tools | Screenshot of completion |
| 4.16 | Readiness Blockers | Attempt completion with outstanding tools | Blocked with clear error message | — | Screenshot of blocker message |
| 4.17 | Handover Tab | View handover summary | Shows pending tasks, tools in custody, safety state | — | Screenshot |
| 4.18 | Offline Behavior | Go offline, add comment, come back online | Comment queued, synced on reconnect, no duplicate | — | Screenshot of offline indicator + synced comment |

---

## 5. TEAM LEADER (Multi-Tech)

| # | Screen | Action | Expected Result | Forbidden | Evidence |
|---|-------|--------|-----------------|----------|----------|
| 5.1 | Team View | See all team members and roles | Leader badge visible, members listed | — | Screenshot |
| 5.2 | Capabilities | Verify canSubmitCompletion=true | Completion tab and button visible | — | Screenshot |
| 5.3 | Log Team Time | Log time for team member | Time entry created with isTeamLog=true | Cannot log time for non-team members | Screenshot of time log entry |
| 5.4 | Submit Completion | Complete multi-tech WO | Status→completed, all team time included | — | Screenshot |

---

## 6. ASSISTANT TECHNICIAN

| # | Screen | Action | Expected Result | Forbidden | Evidence |
|---|-------|--------|-----------------|----------|----------|
| 6.1 | Capabilities | Verify canSubmitCompletion=false | Completion tab HIDDEN or disabled | MUST NOT be able to submit final completion | Screenshot showing no Completion tab |
| 6.2 | Log Own Time | Log personal time entry | Time entry created for assistant | Cannot log time for other team members | Screenshot |
| 6.3 | Toggle Tasks | Complete assigned tasks | Task marked complete | — | Screenshot |
| 6.4 | Evidence | Upload photos, record measurements | All evidence linked to WO | — | Screenshot |
| 6.5 | Attempt Completion | Try to access completion (if tab visible) | Blocked with "Only team leader can complete" | — | Screenshot of blocked message |

---

## 7. STOREKEEPER / TOOL KEEPER

| # | Screen | Action | Expected Result | Forbidden | Evidence |
|---|-------|--------|-----------------|----------|----------|
| 7.1 | Tool Requests | View pending tool requests | List with WO, technician, tool details | — | Screenshot |
| 7.2 | Tool Issue | Issue approved tool request | Tool quantity deducted, status→issued, transaction recorded | Cannot issue unapproved requests | Screenshot |
| 7.3 | Calibration Block | Attempt issue of uncalibrated tool | Blocked with calibration error message | Must not issue without emergency override | Screenshot of calibration block |
| 7.4 | Tool Return | Confirm tool return | Quantity restored, condition updated, status→returned | Cannot confirm return without physical inspection | Screenshot |
| 7.5 | Material Requests | Issue approved material request | Quantity issued, status→issued | — | Screenshot |
| 7.6 | Material Reconciliation | View consumed/returned quantities | Correct quantities displayed | — | Screenshot |

---

## 8. MAINTENANCE MANAGER

| # | Screen | Action | Expected Result | Forbidden | Evidence |
|---|-------|--------|-----------------|----------|----------|
| 8.1 | Cross-Plant | View WO from Plant A as Plant B user | Access denied or empty result (403) | MUST NOT see other plant's WOs | Screenshot of access denied |
| 8.2 | Cross-Plant | Attempt to mutate Plant B WO as Plant A user | 403 Forbidden | — | Screenshot |
| 8.3 | Reports | Generate cross-plant report | Only authorized plant data included | — | Screenshot of filtered report |
| 8.4 | Admin Override | View any WO (admin privilege) | All WOs visible regardless of plant | — | Screenshot |
| 8.5 | Cost Review | View authoritative cost breakdown | Server-calculated costs from actual records displayed | Client-submitted costs must not appear | Screenshot of cost breakdown |

---

## Sign-Off

| Role | Tester Name | Date | Signature | Pass/Fail |
|------|-----------|------|----------|----------|
| Requester | | | | ☐ Pass ☐ Fail |
| Supervisor | | | | ☐ Pass ☐ Fail |
| Planner | | | | ☐ Pass ☐ Fail |
| Technician | | | | ☐ Pass ☐ Fail |
| Team Leader | | | | ☐ Pass ☐ Fail |
| Assistant | | | | ☐ Pass ☐ Fail |
| Storekeeper | | | | ☐ Pass ☐ Fail |
| Maintenance Manager | | | | ☐ Pass ☐ Fail |

### Overall UAT Decision: ☐ APPROVED  ☐ CONDITIONAL  ☐ REJECTED

### Conditions/Notes:
_____________________________________________________________

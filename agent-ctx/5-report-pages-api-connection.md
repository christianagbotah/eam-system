# Task 5: Connect 5 Hardcoded Report Pages to Real API Data

## Agent: Main

## Work Log:
- Read worklog.md to understand project history and previous changes
- Analyzed existing report page structures (ReportsProductionPage, ReportsQualityPage, ReportsSafetyPage, ReportsFinancialPage, ReportsCustomPage)
- Studied API response shapes from /api/work-orders, /api/assets, /api/inventory, /api/maintenance-requests
- Identified that WorkOrder and MaintenanceRequest types were already imported, but Asset and InventoryItem were not

## Changes Made:

### 1. Type Import (line 9)
- Added `Asset` and `InventoryItem` to the type imports from `@/types`

### 2. ReportsProductionPage (~line 12450)
- **Before**: Hardcoded `monthlyData` array with mock production figures
- **After**: Fetches work orders (`/api/work-orders?limit=9999`) and assets (`/api/assets?limit=9999`)
- Groups completed/closed/verified WOs by month using `actualEnd`/`updatedAt`/`createdAt`
- Calculates: completed count, planned vs actual hours, efficiency %, under-maintenance asset count
- Summary cards: Completed WOs, Efficiency %, Avg Actual Hours/mo, Over-hours Rate
- Bar chart shows monthly completed WOs
- Table shows: Month, Completed WOs, Planned Hrs, Actual Hrs, Efficiency, Assets in Maintenance
- Added loading skeleton and empty state ("No production data available yet")
- Filter by month works with real month keys

### 3. ReportsQualityPage (~line 12567)
- **Before**: Hardcoded NCR categories and monthly inspection data
- **After**: Fetches work orders from API
- Groups WOs by type (preventive, corrective, emergency, inspection, predictive, project)
- Calculates completion rate per type with color-coded progress bars
- Groups WOs by month for completion rate trends
- Summary cards: Total Work Orders, Completion Rate, Incomplete WOs, WO Types
- "Work Orders by Type" horizontal bar chart replaces "NCR by Category"
- Monthly table shows: Month, Total WOs, Completed, Incomplete, Completion Rate
- Added loading skeleton and empty state

### 4. ReportsSafetyPage (~line 12691)
- **Before**: Hardcoded incident types and monthly safety data
- **After**: Fetches work orders, assets, and maintenance requests from 3 APIs
- Identifies safety risks:
  - Critical/Emergency priority WOs → "Critical WOs"
  - Urgent priority WOs → "Urgent WOs"
  - Assets with `condition === 'poor'` → "Poor Assets"
  - Assets with `status === 'out_of_service'` → "Out of Service"
  - Pending MRs older than 7 days → "Overdue MRs"
- Groups by year with risk score calculation
- Summary cards: Critical WOs, Urgent WOs, At-Risk Assets, Overdue MRs
- Bar chart shows safety risk breakdown (only non-zero categories shown)
- Year filter works with real data
- Added loading skeleton and empty state ("No safety concerns detected")

### 5. ReportsFinancialPage (~line 12830)
- **Before**: Only fetched work orders, showed material/labor cost cards
- **After**: Fetches work orders, assets, AND inventory from 3 APIs
- Enhanced summary cards:
  - Total Maintenance Cost (from WOs)
  - Asset Value (Current) (from assets)
  - Inventory Value (currentStock * unitCost)
  - Avg WO Cost
- NEW: Monthly Cost Trends bar chart (last 6 months of WO costs)
- NEW: Asset Value Distribution card (purchase cost vs current value, inventory value, total portfolio)
- Kept existing: Cost by WO Type progress bars, High-Cost WOs table
- Added scrollable table wrapper (max-h-96 overflow-y-auto)
- Loading skeleton shown before data loads

### 6. ReportsCustomPage (~line 12999)
- **Before**: Hardcoded list of fake report definitions with create dialog
- **After**: Fully functional report builder with real-time data
- Data source selector: Work Orders, Assets, Inventory, Maintenance Requests
- Metric selector: Count by Status, Cost Breakdown, Hours Analysis, Priority Distribution
- useEffect fetches data when source or metric changes
- Generates summary table with numbered rows showing real calculated values
- Per-source logic:
  - **Work Orders**: status counts, cost totals, hours analysis, priority distribution
  - **Assets**: status counts, purchase/current value, condition distribution
  - **Inventory**: category counts, total value with low stock count, stock units
  - **MRs**: status counts, priority distribution
- KPI cards show: Data Source, Metric, Total Records, Summary Rows
- Loading spinner in table while fetching, empty state when no data

## Code Quality:
- ESLint passes with only 2 pre-existing errors (unrelated to changes)
- Dev server compiles successfully
- All API calls use `api.get()` with proper safety checks (`Array.isArray(res.data)`)
- Date grouping uses simple string manipulation (YYYY-MM format)
- Loading states, empty states, and error handling on all pages
- Responsive layouts maintained
- No new icon imports needed (all icons already available)
- File: `src/app/page.tsx` (5 report functions + 1 import line modified)

---
Task ID: 4
Agent: Main
Task: Add Equipment History Report — full machine lifecycle report

Files Modified:
1. `/home/z/my-project/src/app/api/assets/[id]/history/route.ts` — NEW
2. `/home/z/my-project/src/components/modules/ReportPages.tsx` — Added EquipmentHistoryPage export + imports
3. `/home/z/my-project/src/components/EAMApp.tsx` — Lazy import, permission, title
4. `/home/z/my-project/src/components/shared/Sidebar.tsx` — Nav entry under Reports
5. `/home/z/my-project/src/types/index.ts` — Added 'equipment-history' to PageName union
6. `/home/z/my-project/worklog.md` — Appended work record

Summary:
- Built full Equipment History API endpoint returning asset details, summary KPIs, work orders, failure records, parts consumed, cost analytics (by type/month/trade), downtime by category, and TCO metrics
- Built EquipmentHistoryPage with 6 tabs: Overview, Work Orders, Failure Analysis, Parts & Materials, Cost Analysis, TCO
- Asset search with debounced autocomplete, KPI cards, Recharts charts (PieChart, BarChart, LineChart), filterable tables, CSV/PDF/Print export
- All files pass ESLint with zero new errors
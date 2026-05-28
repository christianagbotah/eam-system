# Task 3b: Refactor date/time inputs in QualityPages.tsx

## Work Log
- Read `src/components/ui/datetime-picker.tsx` to understand DatePicker API
- Read `src/components/modules/QualityPages.tsx` — identified 12 `<Input type="date">` instances across 5 quality page components (QualityInspectionsPage, QualityAuditsPage, QualityCapaPage, QualityCalibrationsPage)
- Added import: `import { DatePicker } from '@/components/ui/datetime-picker'` at line 12

### Minified Line Reformatting + DatePicker Replacement (3 lines)
Reformatted 3 minified single-line edit forms into properly indented multi-line JSX AND replaced date inputs within them:

1. **Line 134 (QualityInspectionsPage edit form)**: Reformatted into 14-line indented JSX. Replaced:
   - `<Input type="date">` "Scheduled Date" → `<DatePicker label="Scheduled Date" value={editForm.scheduledDate || undefined} onChange={v => setEditForm(f => ({ ...f, scheduledDate: v || '' }))} />`
   - `<Input type="date">` "Completed Date" → `<DatePicker label="Completed Date" value={editForm.completedDate || undefined} onChange={v => setEditForm(f => ({ ...f, completedDate: v || '' }))} />`

2. **Line 368 (QualityAuditsPage edit form)**: Reformatted into 16-line indented JSX. Replaced:
   - `<Input type="date">` "Scheduled Date" → `<DatePicker label="Scheduled Date" value={editForm.scheduledDate || undefined} onChange={v => setEditForm(f => ({ ...f, scheduledDate: v || '' }))} />`
   - `<Input type="date">` "Completed Date" → `<DatePicker label="Completed Date" value={editForm.completedDate || undefined} onChange={v => setEditForm(f => ({ ...f, completedDate: v || '' }))} />`

3. **Line 736 (QualityCapaPage edit form)**: Reformatted into 16-line indented JSX. Replaced:
   - `<Input type="date">` "Due Date" → `<DatePicker label="Due Date" value={editForm.dueDate || undefined} onChange={v => setEditForm(f => ({ ...f, dueDate: v || '' }))} />`

### Non-Minified DatePicker Replacement (5 forms, 9 date inputs)
4. **QualityInspectionsPage create form (line 145)**: "Scheduled Date" — `form.scheduledDate`
5. **QualityAuditsPage create form (line 378)**: "Scheduled Date *" — `form.scheduledDate`
6. **QualityCapaPage create form (line 751)**: "Due Date" — `form.dueDate`
7. **QualityCalibrationsPage create form (lines 956-957)**: "Calibration Date" + "Next Due Date" pair in grid — `form.calibrationDate`/`form.nextDueDate`
8. **QualityCalibrationsPage edit form (lines 988-989)**: "Calibration Date" + "Next Due Date" pair in grid — `editForm.calibrationDate`/`editForm.nextDueDate`

### Pattern Used
- Create forms: `value={form.field || undefined}` with `onChange={v => setForm(f => ({ ...f, field: v || '' }))}`
- Edit forms: `value={editForm.field || undefined}` with `onChange={v => setEditForm(f => ({ ...f, field: v || '' }))}`
- Removed all `<div className="space-y-2">` + `<Label>` wrappers (DatePicker renders its own via FieldWrapper)
- Preserved grid structures — only replaced innermost content

### Verification
- Confirmed 0 remaining `<Input type="date">` in the file via grep
- Confirmed 12 `<DatePicker>` instances in the file via grep
- Lint check: No new errors in QualityPages.tsx (all pre-existing)
- Dev server compiled successfully

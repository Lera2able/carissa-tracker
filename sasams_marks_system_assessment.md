# SASAMS marks system assessment

## Overall assessment

The uploaded `SASAMS_WEB_PORTAL_PACKAGE.zip` is a serious implementation package, not just a mockup. It contains:

- a Supabase schema for marks capture, approvals, audit logs, and sync tracking
- reference data for Grades R to 7 subjects, criteria, splits, activities, and task types
- prebuilt SQL views and calculation functions for teacher dashboards and HOD review
- starter HTML pages for teacher login, teacher marks grid, HOD approval, and admin sync status
- sync-back scripts intended to export approved marks back into SA-SAMS on the server PC

This is enough to design a strong SASAMS marks workflow for the teacher portal.

## What is inside

### Strong parts

- `sql/01_create_tables.sql`
  Creates the main data model:
  - `subjects_official`
  - `recording_sheet_templates`
  - `criterion_activities`
  - `teacher_subject_allocations`
  - `mark_batches`
  - `marks`
  - `marks_audit_log`
  - `sasams_sync_runs`

- `sql/04_views_teacher_dashboard.sql`
  Gives a ready-made teacher grid source:
  - `vw_teacher_marks_grid`
  - `vw_capture_completeness`
  - `vw_hod_pending_batches`

- `sql/05_functions_mark_calculations.sql`
  Gives reusable server-side calculations:
  - `fn_term_mark`
  - `fn_sba_year_mark`
  - `fn_validate_batch`

- `portal-ui-starter/teacher-dashboard-marks-grid.html`
  Shows the intended teacher experience:
  - select term
  - select class
  - select subject
  - capture marks in a learner-by-criterion grid
  - autosave
  - completeness indicator
  - submit for HOD review

- `sync-back-to-sasams/`
  Shows the intended long-term weekly workflow:
  - approved batches export from Supabase
  - import into SA-SAMS through a controlled server-side process

## Important observations

### 1. The package is useful, but it should not be dropped in as-is

It is a solid reference package, but it still needs adaptation before going into your live tracker.

### 2. The data volume is large enough for a real system

The extracted files show substantial reference data:

- `subjects_official_gr0_gr7.csv`: 1,992 rows
- `subjects_report_splits.csv`: 2,397 rows
- `subjects_settings_sba_weights.csv`: 1,992 rows
- `criteria_recording_sheets_2026.csv`: 21,297 rows
- `criteria_activities_subtasks.csv`: 14,574 rows
- `task_types_dictionary.csv`: 160 rows

That means the package covers much more than a toy demo and can drive dynamic marks screens.

### 3. Some docs and data counts do not match perfectly

The documentation mentions smaller or different row counts in a few places. That is not fatal, but it means we should treat the CSVs as the actual source, not the text descriptions.

### 4. A few files need cleanup or transformation during import

Some CSVs have clean headers and map well, but some do not:

- `subjects_official_gr0_gr7.csv` is usable
- `criteria_recording_sheets_2026.csv` is usable
- `criteria_activities_subtasks.csv` is usable
- `task_types_dictionary.csv` has generic headers like `F1`, `F2`, etc.
- `terms_dates_2025_2026.csv` has mixed spreadsheet-style headers and will need transformation

So the import layer should include controlled mapping and cleanup rather than manual copy-paste only.

### 5. The starter teacher UI contains a likely integration bug

In `portal-ui-starter/teacher-dashboard-marks-grid.html`, the subject selector uses `subjects_official(id,...)`, but the SQL schema uses `official_subject_id` as the stable key. That means we should not copy the starter file directly into production without reviewing the queries carefully.

### 6. The package assumes a separate Supabase-auth portal

The starter login is a standalone Supabase login flow. Your existing teacher portal already has its own teacher experience and tab structure, so the correct move is to integrate the SASAMS marks workflow into the current portal, not launch a separate parallel website.

## Best fit for your current portal

The current teacher portal already supports:

- teacher login
- class switching
- multiple teacher tabs
- class-based views and teacher actions

That makes this a good fit for **one new teacher tab** rather than a separate app.

## Recommended product shape

### Teacher portal

Add a new tab:

- `SASAMS Marks`

Inside that tab:

1. Use the teacher's current class from the existing portal header.
2. Add selectors for:
   - term
   - subject
   - optional report split if needed
3. Show a learner grid:
   - learners in rows
   - SASAMS criteria in columns
4. Each cell captures raw marks only.
5. Show calculated helpers in the UI:
   - max mark
   - percentage
   - weighting contribution
6. Add:
   - autosave
   - draft status
   - completeness %
   - submit for HOD review

### HOD workflow

This should not live only inside the teacher tab. It should have its own restricted view:

- review submitted batches
- run validation
- approve or reject
- return rejected batches to teacher with a note

### Admin workflow

Later, add an admin/HOD sync status view:

- last approved batches
- validation results
- sync history
- sync-ready status

## Recommended technical approach

### Do not build the first version around SA-SAMS sync

Phase 1 should focus on:

- teacher capture
- stored calculations
- HOD review
- class and subject completeness

The actual sync-back to SA-SAMS should come only after capture and approval are stable.

### Use the package as the data model, not as the full frontend

Reuse from the package:

- schema ideas
- criteria and subject reference data
- marks grid logic
- batch approval model
- validation functions

Do not reuse blindly:

- raw HTML pages as production UI
- direct Supabase anon-key frontend patterns
- manual CSV import assumptions

### Fit it to the current project security model

Because learner marks are sensitive, the safest path is:

- keep database writes and reads for marks behind controlled server endpoints where needed
- use the portal session and teacher allocation rules already present in the project
- avoid exposing broad marks tables directly to unrestricted client queries

## Proposed implementation phases

### Phase 1: assessment setup

- create the SASAMS reference tables in a safe way
- import and normalize the reference CSVs
- load one pilot grade and a few subjects first

### Phase 2: teacher marks tab

- add `SASAMS Marks` tab to the existing teacher portal
- wire term, subject, and class selectors
- render dynamic criteria columns from templates
- save raw marks

### Phase 3: HOD moderation

- add submit and review flow
- validate batch weights and missing marks
- approve or reject

### Phase 4: reporting

- term totals
- SBA totals
- capture completeness dashboards

### Phase 5: SA-SAMS sync

- only after the captured marks match expected term outputs
- export approved batches in SASAMS-compatible format
- test on a copy of the SA-SAMS database first

## My recommendation

The best version for Carissa is:

- integrate one new `SASAMS Marks` tab into the existing teacher portal
- pilot it for one grade or phase first
- use the uploaded package as the curriculum and weighting engine
- postpone sync-back to SA-SAMS until capture and HOD approval are proven

## Immediate next build target

Build the first version with:

- teacher class already selected from the portal
- term selector
- subject selector
- learner-by-criterion grid
- autosave
- completeness bar
- submit-to-HOD button

That will give teachers a practical mark management system without forcing the whole sync pipeline on day one.

## Suggested next step

Implement a narrow pilot:

- Grade 4 to 7 only at first, or
- one subject family first, such as Languages or Mathematics

That will let us validate the data mapping and UI behaviour before rolling SASAMS capture across all grades.

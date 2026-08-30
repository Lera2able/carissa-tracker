# SASAMS phase 1 load guide

This guide loads the minimum reference data needed to make the new `SASAMS Marks` tab usable in the teacher portal.

## Files to use

1. Run the schema first:
   - `supabase/sasams_marks_phase1_schema.sql`

2. Then import these cleaned CSV files:
   - `supabase/imports/carissa_sasams_subjects_import.csv`
   - `supabase/imports/carissa_sasams_criteria_import_2026.csv`

3. Optional verification file:
   - `supabase/imports/sasams_phase1_verification.sql`

## What these files contain

- `carissa_sasams_subjects_import.csv`
  - 644 subject rows
  - filtered to Grades R to 7 only
  - already mapped to the `carissa_sasams_subjects` table

- `carissa_sasams_criteria_import_2026.csv`
  - 5,441 criteria rows
  - filtered to academic year `2026`
  - filtered to Grades R to 7 only
  - calculated summary rows with `Type=SBAYEAR` were excluded on purpose
  - already mapped to the `carissa_sasams_criteria` table

## Import order

### Step 1

Open Supabase SQL Editor and run:

- `supabase/sasams_marks_phase1_schema.sql`

### Step 2

Open Supabase Table Editor and import:

- file: `carissa_sasams_subjects_import.csv`
- target table: `carissa_sasams_subjects`

### Step 3

Open Supabase Table Editor and import:

- file: `carissa_sasams_criteria_import_2026.csv`
- target table: `carissa_sasams_criteria`

## Recommended import settings

- use `UTF-8`
- keep the CSV header row
- do not auto-generate columns
- import into the existing table columns exactly as provided

## If you need to reload the data

Run this first in Supabase SQL Editor:

```sql
delete from public.carissa_sasams_marks;
delete from public.carissa_sasams_batches;
delete from public.carissa_sasams_criteria;
delete from public.carissa_sasams_subjects;
```

Then import the two CSV files again in the same order.

## What should work after this

Once the imports are done:

- teachers can open the new `SASAMS Marks` tab
- the `Subject` dropdown will populate based on the selected class grade
- the marks grid will load SASAMS criteria for the chosen term and subject
- autosave, completeness, and `Submit for HOD review` will work against the new tables

## What is still for a later phase

This phase does **not** include:

- SA-SAMS sync back into the `.mdb`
- HOD approval screens
- strict RLS policies for teacher subject allocations
- learner master data import from an external school system

Those can be added after the teacher capture flow is working cleanly.

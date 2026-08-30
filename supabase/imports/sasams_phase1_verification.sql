-- Run after importing the Phase 1 SASAMS CSV files.

select 'subjects_total' as check_name, count(*) as row_count
from public.carissa_sasams_subjects

union all

select 'criteria_total' as check_name, count(*) as row_count
from public.carissa_sasams_criteria

union all

select 'grade_r_to_7_subjects' as check_name, count(*) as row_count
from public.carissa_sasams_subjects
where grade_no between 0 and 7

union all

select 'year_2026_criteria' as check_name, count(*) as row_count
from public.carissa_sasams_criteria
where academic_year = 2026;


select
  grade_no,
  count(*) as subject_count
from public.carissa_sasams_subjects
group by grade_no
order by grade_no;


select
  academic_year,
  term_no,
  grade_no,
  count(*) as criteria_count
from public.carissa_sasams_criteria
group by academic_year, term_no, grade_no
order by academic_year, term_no, grade_no;


select
  c.academic_year,
  c.term_no,
  c.grade_no,
  c.official_subject_id,
  s.name_english as subject_name,
  count(*) as criteria_count
from public.carissa_sasams_criteria c
join public.carissa_sasams_subjects s
  on s.official_subject_id = c.official_subject_id
group by
  c.academic_year,
  c.term_no,
  c.grade_no,
  c.official_subject_id,
  s.name_english
order by
  c.academic_year,
  c.term_no,
  c.grade_no,
  s.name_english
limit 50;


select *
from public.carissa_sasams_criteria
where grade_no = 4
order by term_no, official_subject_id, sort_order
limit 25;

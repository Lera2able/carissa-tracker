-- Add the new trackable LearnWorld game to Carissa resources.
-- Run this in the Supabase SQL editor for the Carissa Tracker project.

insert into public.carissa_resources (
  title,
  url,
  type,
  subject,
  grade_range,
  description,
  uploaded_by
)
values (
  'Intermediate Word Builder',
  'https://tracker.carissaprimary.co.za/word-builder-intermediate.html',
  'link',
  'English HL',
  'Grade 4-7',
  'Trackable word-building and unscramble game for intermediate phase learners. Scores can be sent back to the learner portal and tracked by the teacher.',
  'TRAE'
)
on conflict do nothing;

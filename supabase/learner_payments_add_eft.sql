-- Enable EFT payments for eLearning donations (R50)
-- Run this ONCE in the Supabase SQL editor.
-- This updates the existing CHECK constraint so paid_to can be: office, lerato, or eft.

alter table public.carissa_learner_payments
  drop constraint if exists carissa_learner_payments_paid_to_check;

alter table public.carissa_learner_payments
  add constraint carissa_learner_payments_paid_to_check
  check (paid_to in ('office','lerato','eft'));


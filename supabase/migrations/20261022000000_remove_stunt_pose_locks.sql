-- Remove the retired admin-controlled stunt/pose locking feature.
ALTER TABLE public.stunts
  DROP COLUMN IF EXISTS is_locked;

-- Add is_locked column to stunts table to allow coaches/admins to temporarily lock/unlock stunts
ALTER TABLE stunts ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

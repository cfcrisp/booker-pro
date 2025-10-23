-- Migration: Add buffer_minutes and show_weekends to users table
-- Date: 2024-10-23
-- Description: Add buffer time setting for meetings (default 30 minutes) and weekend visibility setting

-- Add buffer_minutes column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 30;

-- Add show_weekends column to users table (default false - weekends hidden)
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_weekends BOOLEAN DEFAULT FALSE;

-- Update existing users to have the default buffer and weekend settings
UPDATE users SET buffer_minutes = 30 WHERE buffer_minutes IS NULL;
UPDATE users SET show_weekends = FALSE WHERE show_weekends IS NULL;


-- Add calendar start preference to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS calendar_start_today BOOLEAN DEFAULT FALSE;

-- Update existing users to default FALSE (start with Monday/Sunday)
UPDATE users SET calendar_start_today = FALSE WHERE calendar_start_today IS NULL;


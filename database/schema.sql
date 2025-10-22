-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- Nullable for Google Sign-In users
  name VARCHAR(255) NOT NULL,
  google_id VARCHAR(255) UNIQUE, -- Google user ID for Sign in with Google
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider)
);

-- Availability rules table
CREATE TABLE IF NOT EXISTS availability_rules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blocked times table
CREATE TABLE IF NOT EXISTS blocked_times (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id SERIAL PRIMARY KEY,
  coordinator_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meeting participants table
CREATE TABLE IF NOT EXISTS meeting_participants (
  id SERIAL PRIMARY KEY,
  meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(meeting_id, user_id)
);

-- Calendar access permissions table
CREATE TABLE IF NOT EXISTS calendar_permissions (
  id SERIAL PRIMARY KEY,
  grantor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grantee_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE,
  grantee_domain VARCHAR(255) NULL,
  permission_type VARCHAR(20) NOT NULL CHECK (permission_type IN ('once', 'user', 'domain')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_grantee CHECK (
    (grantee_id IS NOT NULL AND grantee_domain IS NULL) OR
    (grantee_id IS NULL AND grantee_domain IS NOT NULL)
  )
);

-- Permission requests table
CREATE TABLE IF NOT EXISTS permission_requests (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NULL,
  meeting_context TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  responded_at TIMESTAMP NULL,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_recipient CHECK (recipient_id IS NOT NULL OR recipient_email IS NOT NULL)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_availability_rules_user_id ON availability_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_times_user_id ON blocked_times(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_coordinator_id ON meetings(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_permissions_grantor ON calendar_permissions(grantor_id);
CREATE INDEX IF NOT EXISTS idx_calendar_permissions_grantee ON calendar_permissions(grantee_id);
CREATE INDEX IF NOT EXISTS idx_calendar_permissions_domain ON calendar_permissions(grantee_domain);
CREATE INDEX IF NOT EXISTS idx_permission_requests_requester ON permission_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_permission_requests_recipient ON permission_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_permission_requests_email ON permission_requests(recipient_email);
CREATE INDEX IF NOT EXISTS idx_permission_requests_status ON permission_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

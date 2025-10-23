-- Remove unused features and tables to simplify the codebase
-- This migration removes: availability requests, team onboarding, whitelists, 
-- domain stats, response tracking, and meetings

-- Drop tables (in order to respect foreign key constraints)
DROP TABLE IF EXISTS response_time_log CASCADE;
DROP TABLE IF EXISTS user_response_metrics CASCADE;
DROP TABLE IF EXISTS availability_responses CASCADE;
DROP TABLE IF EXISTS availability_request_recipients CASCADE;
DROP TABLE IF EXISTS availability_requests CASCADE;
DROP TABLE IF EXISTS team_onboarding_links CASCADE;
DROP TABLE IF EXISTS domain_stats CASCADE;
DROP TABLE IF EXISTS whitelists CASCADE;
DROP TABLE IF EXISTS meeting_participants CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;

-- Drop related indexes (if they still exist)
DROP INDEX IF EXISTS idx_availability_requests_coordinator;
DROP INDEX IF EXISTS idx_availability_requests_token;
DROP INDEX IF EXISTS idx_availability_request_recipients_request;
DROP INDEX IF EXISTS idx_availability_request_recipients_email;
DROP INDEX IF EXISTS idx_availability_request_recipients_token;
DROP INDEX IF EXISTS idx_availability_responses_request;
DROP INDEX IF EXISTS idx_availability_responses_user;
DROP INDEX IF EXISTS idx_team_onboarding_links_token;
DROP INDEX IF EXISTS idx_team_onboarding_links_domain;
DROP INDEX IF EXISTS idx_domain_stats_domain;
DROP INDEX IF EXISTS idx_whitelists_user;
DROP INDEX IF EXISTS idx_whitelists_whitelisted_user;
DROP INDEX IF EXISTS idx_whitelists_domain;
DROP INDEX IF EXISTS idx_user_response_metrics_user;
DROP INDEX IF EXISTS idx_user_response_metrics_score;
DROP INDEX IF EXISTS idx_response_time_log_request;
DROP INDEX IF EXISTS idx_response_time_log_user;
DROP INDEX IF EXISTS idx_meetings_coordinator_id;
DROP INDEX IF EXISTS idx_meeting_participants_meeting_id;
DROP INDEX IF EXISTS idx_meeting_participants_user_id;


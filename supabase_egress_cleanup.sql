-- ==============================================================================
-- SUPABASE EGRESS CLEANUP SCRIPT (TRANSACTION-SAFE)
-- ==============================================================================

-- 1. Purge heavy base64 data URLs from past chat history
UPDATE public.chat_messages 
SET media_url = NULL 
WHERE media_url LIKE 'data:%';

-- 2. Purge inline blobs from call recordings
UPDATE public.call_recordings
SET recording_url = NULL
WHERE recording_url LIKE 'data:%';

-- 3. Rebuild table statistics for PostgreSQL query planner
ANALYZE public.chat_messages;
ANALYZE public.submissions;
ANALYZE public.learners;
ANALYZE public.assessments;
ANALYZE public.call_recordings;

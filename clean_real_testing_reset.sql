-- ==============================================================================
-- GHANA JHS ASSESSMENT PORTAL: PURGE ALL COOKED & TEST DATA FOR REAL TESTING
-- Safe & Complete: Copy and execute this in your Supabase SQL Editor
-- Wipes all cooked/fake students, mock scores, chat logs, call recordings, and test alerts
-- ==============================================================================

-- 1. Wipe all test submissions & mock scores
TRUNCATE TABLE public.submissions CASCADE;

-- 2. Wipe all chat messages, voice notes & media logs
TRUNCATE TABLE public.chat_messages CASCADE;

-- 3. Wipe all call recordings
TRUNCATE TABLE public.call_recordings CASCADE;

-- 4. Wipe all notification reads & test broadcast notifications
TRUNCATE TABLE public.notification_reads CASCADE;
TRUNCATE TABLE public.notifications CASCADE;

-- 5. Delete all fake / test learners (preserves any admin or teacher user)
DELETE FROM public.learners 
WHERE role = 'learner' 
   OR student_id LIKE 'JHS26-%' 
   OR id::text LIKE 'demo-%' 
   OR id::text LIKE 'lrn-%';

-- 6. Reset all assessments to clean 'CLOSED' status (No active tests until you explicitly turn one ON)
UPDATE public.assessments 
SET status = 'CLOSED', 
    deadline = NULL, 
    unlock_time = NULL;

-- 7. (Optional) If any fake student auth records exist in auth.users, remove them:
-- Note: Replace or run only if test Google accounts or emails were created:
DELETE FROM auth.users 
WHERE email LIKE '%@ghana-edu.gov.gh' 
  AND email != 'computing.b9@gmail.com';

-- Verification query
SELECT 'learners' AS table_name, count(*) FROM public.learners
UNION ALL
SELECT 'submissions', count(*) FROM public.submissions
UNION ALL
SELECT 'active_assessments', count(*) FROM public.assessments WHERE status = 'AVAILABLE'
UNION ALL
SELECT 'notifications', count(*) FROM public.notifications;

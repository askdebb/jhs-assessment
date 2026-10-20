-- ==============================================================================
-- FIX ROW LEVEL SECURITY (RLS) POLICIES FOR JHS ASSESSMENT PORTAL
-- Run this in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
--
-- Why is this needed?
-- The previous RLS policies on 'learners' and 'assessments' specified 'TO authenticated'.
-- When accessing the dashboard or querying with the client anon key, PostgreSQL
-- evaluated the connection as 'anon' and silently returned 0 rows ([]).
-- This is why the table displayed "No Registered Learners Found" even though
-- records exist in the Supabase database.
-- ==============================================================================

-- 1. Learners Table Policies
DROP POLICY IF EXISTS "Learners can view all profiles for chat" ON public.learners;
DROP POLICY IF EXISTS "Allow public read access to learners" ON public.learners;
CREATE POLICY "Allow public read access to learners"
    ON public.learners FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.learners;
DROP POLICY IF EXISTS "Allow insert learners" ON public.learners;
CREATE POLICY "Allow insert learners"
    ON public.learners FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.learners;
DROP POLICY IF EXISTS "Allow update learners" ON public.learners;
CREATE POLICY "Allow update learners"
    ON public.learners FOR UPDATE
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete learners" ON public.learners;
CREATE POLICY "Allow delete learners"
    ON public.learners FOR DELETE
    USING (true);

-- 2. Assessments Table Policies
DROP POLICY IF EXISTS "Authenticated users can view assessments" ON public.assessments;
DROP POLICY IF EXISTS "Allow public read access to assessments" ON public.assessments;
CREATE POLICY "Allow public read access to assessments"
    ON public.assessments FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can insert and update assessments" ON public.assessments;
DROP POLICY IF EXISTS "Allow all for assessments" ON public.assessments;
CREATE POLICY "Allow all for assessments"
    ON public.assessments FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Submissions Table Policies
DROP POLICY IF EXISTS "Learners view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Allow public read access to submissions" ON public.submissions;
CREATE POLICY "Allow public read access to submissions"
    ON public.submissions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Learners insert own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Allow all for submissions" ON public.submissions;
CREATE POLICY "Allow all for submissions"
    ON public.submissions FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Verification Check
SELECT 'learners' AS table_name, count(*) AS total_count FROM public.learners
UNION ALL
SELECT 'assessments', count(*) FROM public.assessments
UNION ALL
SELECT 'submissions', count(*) FROM public.submissions;

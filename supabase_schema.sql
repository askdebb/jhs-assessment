-- ==============================================================================
-- JHS LEARNER & ADMIN ASSESSMENT PORTAL: COMPLETE DATABASE SCHEMA V3.0
-- Safe & Idempotent: Run this in your Supabase SQL Editor
-- Includes: Roles, Presence, Turn-in Rank, Broadcast Notifications & Media Chat
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Learners & Admin Users Table
CREATE TABLE IF NOT EXISTS public.learners (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id TEXT UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    date_of_birth DATE,
    class_level TEXT NOT NULL DEFAULT 'Basic 9A',
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'teacher', 'admin')),
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure newly added columns exist if table was already created
ALTER TABLE public.learners ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE public.learners ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.learners ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'teacher', 'admin'));
ALTER TABLE public.learners ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.learners ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 2b. Immutability: Prevent modification of date_of_birth by learners once account is created
CREATE OR REPLACE FUNCTION public.protect_learner_date_of_birth()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.date_of_birth IS NOT NULL AND NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
        -- Only administrators or teachers may correct learner DOB records
        IF NOT EXISTS (
            SELECT 1 FROM public.learners 
            WHERE id = auth.uid() AND role IN ('admin', 'teacher')
        ) THEN
            RAISE EXCEPTION 'Date of birth is locked and cannot be changed after initial account creation.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_learner_dob ON public.learners;
CREATE TRIGGER trg_protect_learner_dob
    BEFORE UPDATE ON public.learners
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_learner_date_of_birth();

-- 3. Assessments Table
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'Computing', -- Exclusively 'Computing' (Ghana NaCCA B7-B9 Curriculum)
    class_level TEXT NOT NULL DEFAULT 'Basic 9',
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('CAT', 'PROJECT_WORK', 'HOME_ASSIGNMENT', 'EXAM')),
    description TEXT,
    max_score NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    weight NUMERIC(5,2) NOT NULL DEFAULT 20.00, -- Term assessment percentage weight (sums to 100)
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'CLOSED', 'UPCOMING')),
    unlock_time TIMESTAMPTZ, -- Realtime countdown unlock timestamp set by administrator
    deadline TIMESTAMPTZ,
    time_limit_minutes INTEGER DEFAULT 15,
    assessment_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure newly added columns exist if table was already created
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS unlock_time TIMESTAMPTZ;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2) NOT NULL DEFAULT 20.00;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT 15;

-- 4. Submissions / Scores Table
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
    score NUMERIC(5,2),
    max_score NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    correct_count INTEGER,
    incorrect_count INTEGER,
    answers JSONB, -- Learner's responses without exposing solution keys
    submission_rank INTEGER,
    status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('PENDING', 'SUBMITTED', 'GRADED')),
    teacher_remarks TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(assessment_id, learner_id)
);

-- Ensure submission columns exist if submissions table was created earlier
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS submission_rank INTEGER;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS correct_count INTEGER;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS incorrect_count INTEGER;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS answers JSONB;

-- 5. In-App Notifications Table (Broadcast & Class Alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_class TEXT NOT NULL DEFAULT 'ALL',
    type TEXT NOT NULL DEFAULT 'ANNOUNCEMENT' CHECK (type IN ('ANNOUNCEMENT', 'DEADLINE', 'GRADE_ALERT', 'GENERAL')),
    sender_name TEXT NOT NULL DEFAULT 'School Administrator',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Notification Reads Table
CREATE TABLE IF NOT EXISTS public.notification_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(notification_id, user_id)
);

-- 7. Realtime 1-on-1 Chat Messages Table (Supports Text, Images & Audio Voice Notes)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.learners(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL DEFAULT 'learner',
    message TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'text',
    media_url TEXT,
    media_name TEXT,
    audio_duration TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure media and read/seen columns exist if chat_messages table was created earlier
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS media_name TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS audio_duration TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to JSONB;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 7b. Call Recordings Table (Automatic Background Recording & Google Drive Cloud Backup)
CREATE TABLE IF NOT EXISTS public.call_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id TEXT NOT NULL,
    call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
    caller_id UUID REFERENCES public.learners(id) ON DELETE SET NULL,
    caller_name TEXT NOT NULL,
    recipient_id UUID REFERENCES public.learners(id) ON DELETE SET NULL,
    recipient_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size TEXT,
    duration_seconds INTEGER DEFAULT 0,
    target_email TEXT NOT NULL DEFAULT 'computing.b9@gmail.com',
    drive_folder TEXT NOT NULL DEFAULT 'Ghana_JHS_Computing_Call_Recordings',
    user_folder TEXT, -- e.g. 'Kwame Mensah (Basic 9A)'
    user_folder_url TEXT,
    drive_sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (drive_sync_status IN ('synced', 'pending', 'saved_locally', 'error')),
    drive_web_link TEXT,
    recording_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Enable Row-Level Security
ALTER TABLE public.learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

-- 9. Row-Level Security Policies (Idempotent: Drop and Recreate)
DROP POLICY IF EXISTS "Learners can view all profiles for chat" ON public.learners;
CREATE POLICY "Learners can view all profiles for chat"
    ON public.learners FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.learners;
CREATE POLICY "Users can update their own profile"
    ON public.learners FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.learners;
CREATE POLICY "Users can insert their own profile"
    ON public.learners FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can view assessments" ON public.assessments;
CREATE POLICY "Authenticated users can view assessments"
    ON public.assessments FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can insert and update assessments" ON public.assessments;
CREATE POLICY "Admins can insert and update assessments"
    ON public.assessments FOR ALL
    USING (EXISTS (SELECT 1 FROM public.learners WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

DROP POLICY IF EXISTS "Learners view own submissions" ON public.submissions;
CREATE POLICY "Learners view own submissions"
    ON public.submissions FOR SELECT
    USING (auth.uid() = learner_id OR EXISTS (SELECT 1 FROM public.learners WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

DROP POLICY IF EXISTS "Learners insert own submissions" ON public.submissions;
CREATE POLICY "Learners insert own submissions"
    ON public.submissions FOR INSERT
    WITH CHECK (auth.uid() = learner_id);

DROP POLICY IF EXISTS "Anyone can view notifications" ON public.notifications;
CREATE POLICY "Anyone can view notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can send notifications" ON public.notifications;
CREATE POLICY "Admins can send notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.learners WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

DROP POLICY IF EXISTS "Users view own chats" ON public.chat_messages;
CREATE POLICY "Users view own chats"
    ON public.chat_messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR recipient_id IS NULL OR EXISTS (SELECT 1 FROM public.learners WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

DROP POLICY IF EXISTS "Users can send chats" ON public.chat_messages;
CREATE POLICY "Users can send chats"
    ON public.chat_messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can mark chats as read" ON public.chat_messages;
CREATE POLICY "Users can mark chats as read"
    ON public.chat_messages FOR UPDATE
    USING (auth.uid() = recipient_id OR recipient_id IS NULL OR EXISTS (SELECT 1 FROM public.learners WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

DROP POLICY IF EXISTS "Users can view call recordings" ON public.call_recordings;
DROP POLICY IF EXISTS "Admins can view call recordings" ON public.call_recordings;
CREATE POLICY "Admins can view call recordings"
    ON public.call_recordings FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.learners WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

DROP POLICY IF EXISTS "Users can insert call recordings" ON public.call_recordings;
CREATE POLICY "Users can insert call recordings"
    ON public.call_recordings FOR INSERT
    WITH CHECK (true);

-- 10. Enable Supabase Realtime Replication (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'call_recordings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.call_recordings;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'learners'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.learners;
    END IF;
END $$;

-- 11. Initial Assessment Tasks Seed (Ghana Standard Curriculum - Computing Focus)
-- Note: Mathematics assessments commented out to preserve Computing intelligence integrity
INSERT INTO public.assessments (title, subject, class_level, assessment_type, description, max_score, status, deadline, assessment_url)
VALUES
    ('Computing CAT 1 (Basic 9A)', 'Computing', 'Basic 9A', 'CAT', 'Continuous Assessment Test covering Input/Output Hardware, System Software, and Network Topologies.', 20.00, 'AVAILABLE', timezone('utc'::text, now() + interval '4 days'), NULL),
    ('Computing CAT 1 (Basic 9B)', 'Computing', 'Basic 9B', 'CAT', 'Continuous Assessment Test covering Computing Fundamentals for Basic 9B learners.', 20.00, 'AVAILABLE', timezone('utc'::text, now() + interval '4 days'), NULL),
    -- ('Mathematics CAT 1: Real Numbers', 'Mathematics', 'Basic 9', 'CAT', 'Fractions, Decimals, Ratios, and Percentage word problem evaluation.', 20.00, 'AVAILABLE', timezone('utc'::text, now() + interval '5 days'), NULL),
    ('Computing Practical Project 1: Visual Algorithm & Scratch', 'Computing', 'Basic 9', 'PROJECT_WORK', 'Hands-on project work documenting algorithm flowcharts, iterative loops, and Scratch sprite interactions.', 30.00, 'AVAILABLE', timezone('utc'::text, now() + interval '10 days'), NULL),
    ('Computing End of Term Examination', 'Computing', 'Basic 9', 'EXAM', 'Comprehensive terminal examination evaluating Ghanaian NaCCA B7-B9 Computing curriculum competencies.', 50.00, 'UPCOMING', timezone('utc'::text, now() + interval '14 days'), NULL)
ON CONFLICT DO NOTHING;

-- 12. Initial Broadcast Notifications Seed
INSERT INTO public.notifications (title, message, target_class, type, sender_name)
VALUES
    ('Continuous Assessment (CAT 1) Computing Open', 'Computing CAT 1 is now accessible for all Basic 9A & 9B learners. Complete before Friday 5:00 PM.', 'ALL', 'DEADLINE', 'Head of Computing Department'),
    ('Project Work Guidelines Published', 'Please review the scratch programming rubric before submitting your visual algorithm designs.', 'Basic 9A', 'ANNOUNCEMENT', 'Master Debrah (Admin)')
ON CONFLICT DO NOTHING;

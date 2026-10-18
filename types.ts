// ==============================================================================
// GHANA JHS CONTINUOUS ASSESSMENT & LEARNER PORTAL: TYPESCRIPT DEFINITIONS
// Covers Learner Registry, Assessments, Submissions, Question Bank, Realtime
// ==============================================================================

export type ClassLevel = "Basic 7" | "Basic 8" | "Basic 9" | "Basic 9A" | "Basic 9B";

export type Subject = "Computing";

export type AssessmentType = "CAT" | "QUIZ" | "PROJECT_WORK" | "EXAM" | "ASSIGNMENT";

export type AssessmentStatus = "AVAILABLE" | "CLOSED" | "SCHEDULED" | "GRADED";

export interface LearnerProfile {
  id: string;
  student_id?: string;
  full_name: string;
  email: string;
  gender: "Male" | "Female" | "Other";
  date_of_birth?: string;
  class_level: ClassLevel;
  role: "learner" | "admin" | "teacher";
  avatar_url?: string;
  onboarding_completed?: boolean;
  is_online?: boolean;
  last_seen?: string;
}

export interface QuestionOption {
  key: string;
  text: string;
}

export interface QuestionItem {
  id: string | number;
  question: string;
  type?: "multiple_choice" | "true_false" | "short_answer" | "essay";
  options?: string[] | QuestionOption[];
  correct_answer?: string | number;
  explanation?: string;
  points?: number;
  curriculum_strand?: string;
  sub_strand?: string;
}

export interface Assessment {
  id: string;
  title: string;
  subject: Subject;
  class_level: ClassLevel;
  type: AssessmentType;
  max_score: number;
  weight: number;
  status: "AVAILABLE" | "CLOSED";
  unlock_time?: string | null;
  deadline_time?: string | null;
  duration_minutes?: number;
  is_live_countdown?: boolean;
  pass_mark?: number;
  instructions?: string;
  questions_count?: number;
  created_at?: string;
  updated_at?: string;
  questions?: QuestionItem[];
}

export interface SubmissionAnswer {
  question_id: string | number;
  selected_option: string | number;
  is_correct?: boolean;
  points_awarded?: number;
}

export interface Submission {
  id: string;
  assessment_id: string;
  learner_id: string;
  score: number;
  max_score: number;
  percentage: number;
  status: "SUBMITTED" | "GRADED" | "IN_REVIEW";
  answers?: Record<string | number, string | number> | SubmissionAnswer[];
  tab_switch_count?: number;
  time_spent_seconds?: number;
  feedback?: string;
  submitted_at: string;
  graded_at?: string;
  submission_rank?: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "SUCCESS" | "URGENT";
  recipient_role?: "ALL" | "learner" | "admin";
  recipient_class?: "ALL" | ClassLevel;
  created_at: string;
  is_read?: boolean;
}

export interface ChatMessage {
  id: string;
  temp_id?: string;
  sender_id: string;
  recipient_id?: string;
  receiver_id?: string;
  sender_name?: string;
  sender_avatar?: string;
  sender_role?: "admin" | "learner";
  message: string;
  media_type?: "text" | "image" | "video" | "audio" | "file" | string;
  media_url?: string | null;
  media_name?: string | null;
  media_size?: string | null;
  audio_duration?: string;
  read?: boolean;
  is_read?: boolean;
  read_at?: string | null;
  reply_to?: {
    id: string;
    sender_name: string;
    message: string;
    media_type?: string;
  } | null;
  reactions?: Record<string, string[]> | any;
  is_edited?: boolean;
  edited_at?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_at: string;
}

export interface AppState {
  user: any | null;
  profile: LearnerProfile | null;
  isAdmin: boolean;
  activeView: "learner" | "admin";
  assessments: Assessment[];
  submissions: Submission[];
  activeAssessment: Assessment | null;
  activeQuizAnswers: Record<string | number, string | number>;
  activeQuizTimeRemaining: number;
  activeQuizTimerId: any | null;
  activeQuizTabSwitches: number;
  notifications: NotificationItem[];
  chatActiveUser: LearnerProfile | null;
  chatMessages: ChatMessage[];
  chatPollInterval: any | null;
}

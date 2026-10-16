import { createClient } from "@supabase/supabase-js";

// Default Supabase project URL and anon key
const DEFAULT_SUPABASE_URL = "https://vyecjlbknzwqexugtneg.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5ZWNqbGJrbnp3cWV4dWd0bmVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NjcwMDMsImV4cCI6MjEwNzU0MzAwM30.OAZaBxB0x4McklqAQ0PM78DncMUV2MODzG7mh8pkKuA";

// Designated admin email strictly required to access /admin and admin subpages
export const PRIMARY_ADMIN_EMAIL = "computing.b9@gmail.com";
export const ADMIN_EMAILS = [
  "computing.b9@gmail.com",
];

export function isUserAdmin(user, profile) {
  if (!user && !profile) return false;
  const email = (user?.email || profile?.email || "").toLowerCase().trim();
  return email === PRIMARY_ADMIN_EMAIL.toLowerCase();
}

// Retrieve config from Vite environment or fallback to defaults
export function getSupabaseConfig() {
  const envUrl = typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL;
  const envKey = typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY;

  const url = (envUrl && envUrl.trim() !== "") ? envUrl : (localStorage.getItem("jhs_supabase_url") || DEFAULT_SUPABASE_URL);
  const anonKey = (envKey && envKey.trim() !== "") ? envKey : (localStorage.getItem("jhs_supabase_anon_key") || DEFAULT_SUPABASE_ANON_KEY);

  return { url, anonKey };
}

export function saveSupabaseConfig(url, anonKey) {
  if (url) localStorage.setItem("jhs_supabase_url", url.trim());
  if (anonKey) localStorage.setItem("jhs_supabase_anon_key", anonKey.trim());
}

let supabaseInstance = null;

export function getSupabase() {
  const { url, anonKey } = getSupabaseConfig();
  if (!anonKey || anonKey === "your-anon-key-here") {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.warn("Failed to initialize Supabase client:", err);
      return null;
    }
  }
  return supabaseInstance;
}

// -------------------------------------------------------------
// Authentication API
// -------------------------------------------------------------
export async function signInWithGoogle() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("SUPABASE_ANON_KEY_MISSING");
  }

  const redirectUrl = window.location.origin + window.location.pathname;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem("jhs_active_learner");
  localStorage.removeItem("jhs_demo_session");
  localStorage.removeItem("jhs_view_mode");
}

export async function getSessionUser() {
  const supabase = getSupabase();
  if (!supabase) {
    if (isMockDataCleared()) return null;
    const demo = localStorage.getItem("jhs_demo_session");
    if (demo) {
      try {
        return JSON.parse(demo);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // Handle OAuth redirect returning with access_token & refresh_token in URL hash
  if (typeof window !== "undefined" && window.location.hash && window.location.hash.includes("access_token")) {
    try {
      const hashStr = window.location.hash.startsWith("#") ? window.location.hash.substring(1) : window.location.hash;
      const params = new URLSearchParams(hashStr);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error && data?.session?.user) {
          // Clean the ugly hash fragment from browser URL bar
          try {
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          } catch (e) {}
          return data.session.user;
        }
      }
    } catch (err) {
      console.warn("Could not set Supabase session from hash:", err);
    }
  }

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;
  return session.user;
}

export function onAuthChange(callback) {
  const supabase = getSupabase();
  if (supabase) {
    return supabase.auth.onAuthStateChange(callback);
  }
  return { data: { subscription: { unsubscribe: () => {} } } };
}

// -------------------------------------------------------------
// Learner Profile & Onboarding API
// -------------------------------------------------------------
export async function fetchLearnerProfile(userId) {
  if (userId?.startsWith("demo-") || !getSupabase()) {
    const local = localStorage.getItem("jhs_active_learner");
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return null;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("learners")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching learner profile:", error);
  }
  return data;
}

export async function updateLearnerProfile(profileData) {
  if (profileData.id?.startsWith("demo-") || !getSupabase()) {
    localStorage.setItem("jhs_active_learner", JSON.stringify(profileData));
    return profileData;
  }

  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("learners")
      .upsert(profileData, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.warn("Supabase upsert failed, saving locally:", error);
      localStorage.setItem("jhs_active_learner", JSON.stringify(profileData));
      return profileData;
    }
    localStorage.setItem("jhs_active_learner", JSON.stringify(data));
    return data;
  } catch (err) {
    console.warn("Fallback to local storage on profile error:", err);
    localStorage.setItem("jhs_active_learner", JSON.stringify(profileData));
    return profileData;
  }
}

// -------------------------------------------------------------
// Mock Data Clearance & Live Testing Helpers
// -------------------------------------------------------------
export function isMockDataCleared() {
  return localStorage.getItem("jhs_clear_mock_data") === "true";
}

export function clearAllMockData() {
  localStorage.removeItem("jhs_demo_session");
  localStorage.removeItem("jhs_active_learner");
  localStorage.removeItem("jhs_local_assessments");
  localStorage.removeItem("jhs_local_submissions");
  localStorage.removeItem("jhs_local_chats");
  localStorage.removeItem("jhs_local_notifications");
  localStorage.removeItem("jhs_all_learners");
  localStorage.removeItem("jhs_view_mode");
  localStorage.setItem("jhs_clear_mock_data", "true");
}

export function restoreMockData() {
  localStorage.removeItem("jhs_clear_mock_data");
}

// -------------------------------------------------------------
// Admin: Fetch All Registered Learners
// -------------------------------------------------------------
export async function fetchAllLearners() {
  const supabase = getSupabase();
  if (!supabase) {
    return isMockDataCleared() ? [] : getFallbackAllLearners();
  }

  const { data, error } = await supabase
    .from("learners")
    .select("*, submissions(count, score)")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Supabase fetchAllLearners error:", error);
    return isMockDataCleared() ? [] : getFallbackAllLearners();
  }

  // When live data testing or mock data cleared: return actual database records
  if (isMockDataCleared()) {
    return data || [];
  }
  return (data && data.length > 0) ? data : getFallbackAllLearners();
}

// -------------------------------------------------------------
// Assessments & Scores API
// -------------------------------------------------------------
export async function fetchAssessments() {
  const supabase = getSupabase();
  if (!supabase) {
    if (isMockDataCleared()) return [];
    return getFallbackAssessments().filter(a => a.subject !== "Mathematics" && !a.title.toLowerCase().includes("math"));
  }

  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .order("deadline", { ascending: true });

  if (error) {
    console.warn("Supabase fetchAssessments error:", error);
    if (isMockDataCleared()) return [];
    return getFallbackAssessments().filter(a => a.subject !== "Mathematics" && !a.title.toLowerCase().includes("math"));
  }

  const filtered = (data || []).filter(a => a.subject !== "Mathematics" && !a.title.toLowerCase().includes("math"));
  if (isMockDataCleared()) {
    return filtered;
  }
  return (filtered.length > 0) ? filtered : getFallbackAssessments().filter(a => a.subject !== "Mathematics" && !a.title.toLowerCase().includes("math"));
}

export async function fetchLearnerSubmissions(learnerId) {
  const supabase = getSupabase();
  if (!supabase) {
    if (isMockDataCleared()) return [];
    const all = getFallbackSubmissions();
    return all.filter((s) => s.learner_id === learnerId || !s.learner_id);
  }

  const { data, error } = await supabase
    .from("submissions")
    .select(`
      id,
      score,
      max_score,
      correct_count,
      incorrect_count,
      answers,
      submission_rank,
      status,
      submitted_at,
      teacher_remarks,
      assessments (
        id,
        title,
        subject,
        class_level,
        assessment_type,
        max_score,
        weight,
        deadline
      )
    `)
    .eq("learner_id", learnerId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.warn("Supabase fetchLearnerSubmissions error:", error);
    if (isMockDataCleared()) return [];
    const all = getFallbackSubmissions();
    return all.filter((s) => s.learner_id === learnerId || !s.learner_id);
  }

  if (isMockDataCleared()) {
    return data || [];
  }
  return (data && data.length > 0) ? data : (getFallbackSubmissions().filter((s) => s.learner_id === learnerId || !s.learner_id));
}

export async function fetchAllSubmissions() {
  const supabase = getSupabase();
  if (!supabase) {
    return isMockDataCleared() ? [] : getFallbackSubmissions();
  }

  const { data, error } = await supabase
    .from("submissions")
    .select("*, assessments(id, title, subject, class_level, max_score, weight, assessment_type), learners(id, full_name, class_level, student_id)")
    .order("submitted_at", { ascending: false });

  if (error) {
    console.warn("Supabase fetchAllSubmissions error:", error);
    return isMockDataCleared() ? [] : getFallbackSubmissions();
  }

  if (isMockDataCleared()) {
    return data || [];
  }
  return (data && data.length > 0) ? data : getFallbackSubmissions();
}

export async function saveAssessmentSubmission(payload) {
  // Always update local cache
  const localSubs = getFallbackSubmissions();
  const existingIdx = localSubs.findIndex(
    (s) => s.assessment_id === payload.assessment_id && s.learner_id === payload.learner_id
  );

  const newSub = {
    id: payload.id || (existingIdx >= 0 ? localSubs[existingIdx].id : "sub-" + Date.now()),
    ...payload,
    submitted_at: payload.submitted_at || new Date().toISOString(),
    status: "GRADED",
  };

  if (existingIdx >= 0) {
    localSubs[existingIdx] = { ...localSubs[existingIdx], ...newSub };
  } else {
    localSubs.unshift(newSub);
  }
  localStorage.setItem("jhs_local_submissions", JSON.stringify(localSubs));

  const supabase = getSupabase();
  if (supabase && payload.learner_id && !payload.learner_id.startsWith("demo-")) {
    try {
      const { data, error } = await supabase
        .from("submissions")
        .upsert(
          {
            assessment_id: payload.assessment_id,
            learner_id: payload.learner_id,
            score: payload.score,
            max_score: payload.max_score || 20,
            correct_count: payload.correct_count,
            incorrect_count: payload.incorrect_count,
            answers: payload.answers,
            submission_rank: payload.submission_rank,
            status: "GRADED",
            teacher_remarks: payload.teacher_remarks || "Completed online assessment via portal.",
            submitted_at: newSub.submitted_at,
          },
          { onConflict: "assessment_id,learner_id" }
        )
        .select()
        .single();

      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase submission upsert failed, retained in local storage:", e);
    }
  }

  return newSub;
}

export async function updateAssessment(asmtId, updates) {
  const localAsmts = getFallbackAssessments();
  const idx = localAsmts.findIndex((a) => a.id === asmtId);
  if (idx >= 0) {
    localAsmts[idx] = { ...localAsmts[idx], ...updates };
    localStorage.setItem("jhs_local_assessments", JSON.stringify(localAsmts));
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("assessments")
        .update(updates)
        .eq("id", asmtId)
        .select()
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase assessment update error, falling back to local:", e);
    }
  }

  return idx >= 0 ? localAsmts[idx] : null;
}

export async function createAssessment(asmtPayload) {
  const localAsmts = getFallbackAssessments();
  const newAsmt = {
    id: "asmt-" + Date.now(),
    weight: 20.00,
    status: "AVAILABLE",
    deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    ...asmtPayload,
  };
  localAsmts.push(newAsmt);
  localStorage.setItem("jhs_local_assessments", JSON.stringify(localAsmts));

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("assessments")
        .insert(asmtPayload)
        .select()
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase assessment insert error:", e);
    }
  }

  return newAsmt;
}

export async function deleteAssessment(asmtId) {
  const localAsmts = getFallbackAssessments();
  const filtered = localAsmts.filter((a) => a.id !== asmtId);
  localStorage.setItem("jhs_local_assessments", JSON.stringify(filtered));

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("assessments").delete().eq("id", asmtId);
    } catch (e) {
      console.warn("Supabase assessment delete error:", e);
    }
  }
  return true;
}

// -------------------------------------------------------------
// In-App Notifications API
// -------------------------------------------------------------
export async function fetchNotifications(classLevel = "ALL") {
  const supabase = getSupabase();
  if (!supabase) {
    return getFallbackNotifications();
  }

  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (classLevel && classLevel !== "ALL") {
    query = query.or(`target_class.eq.ALL,target_class.eq.${classLevel}`);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return getFallbackNotifications();
  }
  return data;
}

export async function sendNotification(notificationPayload) {
  const supabase = getSupabase();
  if (!supabase) {
    const localNotes = getFallbackNotifications();
    const newNote = {
      id: "note-" + Date.now(),
      ...notificationPayload,
      created_at: new Date().toISOString(),
    };
    localNotes.unshift(newNote);
    localStorage.setItem("jhs_local_notifications", JSON.stringify(localNotes));
    return newNote;
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert(notificationPayload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// -------------------------------------------------------------
// Realtime Chat API
// -------------------------------------------------------------
export async function fetchChatMessages(studentId) {
  const supabase = getSupabase();
  if (!supabase) {
    return getFallbackChatMessages();
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(50);

  if (error || !data || data.length === 0) {
    return getFallbackChatMessages();
  }
  return data;
}

export async function sendChatMessage(chatPayload) {
  const supabase = getSupabase();
  if (!supabase) {
    const localChats = getFallbackChatMessages();
    const newMsg = {
      id: "msg-" + Date.now(),
      ...chatPayload,
      created_at: new Date().toISOString(),
    };
    localChats.push(newMsg);
    localStorage.setItem("jhs_local_chats", JSON.stringify(localChats));
    return newMsg;
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert(chatPayload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markChatMessagesAsRead(viewerRole) {
  const supabase = getSupabase();
  if (!supabase) {
    const localChats = getFallbackChatMessages();
    let updated = false;
    localChats.forEach((msg) => {
      if (msg.sender_role !== viewerRole && !msg.read) {
        msg.read = true;
        msg.read_at = new Date().toISOString();
        updated = true;
      }
    });
    if (updated) {
      localStorage.setItem("jhs_local_chats", JSON.stringify(localChats));
    }
    return localChats;
  }

  const otherRole = viewerRole === "admin" ? "learner" : "admin";
  const { data, error } = await supabase
    .from("chat_messages")
    .update({ read: true, read_at: new Date().toISOString() })
    .eq("sender_role", otherRole)
    .eq("read", false)
    .select();

  return data;
}

// -------------------------------------------------------------
// Fallback Data for Immediate UI Demonstration & Offline Use
// -------------------------------------------------------------
export function getFallbackAssessments() {
  const local = localStorage.getItem("jhs_local_assessments");
  if (local) {
    try {
      const parsed = JSON.parse(local);
      // Strictly purge any legacy Creative Arts or Mathematics items so the portal is purely Computing
      const filtered = parsed.filter(a => (a.subject === "Computing" || !a.subject) && !a.title?.toLowerCase().includes("math") && !a.title?.toLowerCase().includes("creative") && !a.title?.toLowerCase().includes("art"));
      if (filtered.length !== parsed.length) {
        localStorage.setItem("jhs_local_assessments", JSON.stringify(filtered));
      }
      if (filtered.length > 0) return filtered;
    } catch (e) {}
  }

  // Pure Computing Ghanaian Curriculum Assessments (B7 - B9 Standard)
  return [
    {
      id: "asmt-001",
      title: "Computing CAT 1 (Basic 9A)",
      subject: "Computing",
      class_level: "Basic 9A",
      assessment_type: "CAT",
      description: "Continuous Assessment Test covering Input/Output Hardware, System Software, and Network Topologies.",
      max_score: 20,
      weight: 20.00,
      status: "AVAILABLE",
      unlock_time: null,
      deadline: new Date(Date.now() + 4 * 86400000).toISOString(),
      time_limit_minutes: 15,
      assessment_url: "https://forms.gle/GtgD8YFWaJiHM9eG8",
    },
    {
      id: "asmt-002",
      title: "Computing CAT 1 (Basic 9B)",
      subject: "Computing",
      class_level: "Basic 9B",
      assessment_type: "CAT",
      description: "Continuous Assessment Test covering Computing Fundamentals for Basic 9B learners.",
      max_score: 20,
      weight: 20.00,
      status: "AVAILABLE",
      unlock_time: null,
      deadline: new Date(Date.now() + 4 * 86400000).toISOString(),
      time_limit_minutes: 15,
      assessment_url: "https://forms.gle/TaDY59WHMsWYKGH7A",
    },
    {
      id: "asmt-005",
      title: "Computing CAT 2: Algorithms & Scratch",
      subject: "Computing",
      class_level: "Basic 9",
      assessment_type: "CAT",
      description: "Algorithm flowcharts, loops, conditional branching, and Scratch visual programming concepts.",
      max_score: 20,
      weight: 20.00,
      status: "AVAILABLE",
      unlock_time: null,
      deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
      time_limit_minutes: 15,
      assessment_url: "https://forms.gle/GtgD8YFWaJiHM9eG8",
    },
    {
      id: "asmt-008",
      title: "Computing Quick Quiz: Hardware & Cyber Safety",
      subject: "Computing",
      class_level: "Basic 9",
      assessment_type: "QUIZ",
      description: "Rapid-fire 10 questions testing CPU architecture, memory, cybersecurity, and networking protocols.",
      max_score: 20,
      weight: 15.00,
      status: "AVAILABLE",
      unlock_time: null,
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      time_limit_minutes: 10,
      assessment_url: "https://forms.gle/GtgD8YFWaJiHM9eG8",
    },
    {
      id: "asmt-007",
      title: "Computing Practical Project 1: Visual Algorithm & Scratch",
      subject: "Computing",
      class_level: "Basic 9",
      assessment_type: "PROJECT_WORK",
      description: "Hands-on project work documenting algorithm flowcharts, iterative loops, and Scratch sprite interactions.",
      max_score: 30,
      weight: 20.00,
      status: "AVAILABLE",
      unlock_time: null,
      deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      time_limit_minutes: 30,
      assessment_url: "https://forms.gle/GtgD8YFWaJiHM9eG8",
    },
    {
      id: "asmt-009",
      title: "Computing End of Term Examination",
      subject: "Computing",
      class_level: "Basic 9",
      assessment_type: "EXAM",
      description: "Comprehensive terminal examination evaluating Ghanaian NaCCA B7-B9 Computing curriculum competencies.",
      max_score: 50,
      weight: 25.00,
      status: "UPCOMING",
      unlock_time: new Date(Date.now() + 2 * 86400000).toISOString(),
      deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      time_limit_minutes: 45,
      assessment_url: "https://forms.gle/GtgD8YFWaJiHM9eG8",
    },
    /*
    // [MATHEMATICS ASSESSMENTS COMMENTED OUT AS REQUESTED]
    {
      id: "asmt-003",
      title: "Mathematics CAT 1: Real Numbers",
      subject: "Mathematics",
      ...
    },
    {
      id: "asmt-006",
      title: "Mathematics Project Work 1: Community Survey",
      subject: "Mathematics",
      ...
    }
    */
  ];
}

export function getFallbackSubmissions() {
  const local = localStorage.getItem("jhs_local_submissions");
  if (local) {
    try {
      const parsed = JSON.parse(local);
      // Strictly purge any non-Computing submissions (Creative Arts / Math)
      const filtered = parsed.filter(s => (s.assessments?.subject === "Computing" || !s.assessments?.subject) && !s.assessments?.title?.toLowerCase().includes("math") && !s.assessments?.title?.toLowerCase().includes("creative") && !s.assessments?.title?.toLowerCase().includes("art"));
      if (filtered.length !== parsed.length) {
        localStorage.setItem("jhs_local_submissions", JSON.stringify(filtered));
      }
      if (filtered.length > 0) return filtered;
    } catch (e) {}
  }
  return [
    {
      id: "sub-001",
      assessment_id: "asmt-005",
      learner_id: "demo-user-12345",
      score: 18.5,
      max_score: 20,
      correct_count: 9,
      incorrect_count: 1,
      status: "GRADED",
      submission_rank: 7,
      submitted_at: "2026-10-11T09:42:18Z",
      teacher_remarks: "Excellent grasp of control structures and flowchart conventions. Keep up the high standard!",
      assessments: {
        id: "asmt-005",
        title: "Computing CAT 2: Algorithms & Scratch",
        subject: "Computing",
        class_level: "Basic 9",
        assessment_type: "CAT",
        max_score: 20,
        weight: 20.00,
      },
    },
    /*
    // [MATHEMATICS SUBMISSION EXCLUDED]
    {
      id: "sub-002",
      assessment_id: "asmt-006",
      score: 36,
      assessments: { subject: "Mathematics" }
    }
    */
  ];
}

export function getFallbackNotifications() {
  const local = localStorage.getItem("jhs_local_notifications");
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }
  return [
    {
      id: "note-01",
      title: "Computing CAT 1 Reminder",
      message: "Continuous Assessment (CAT 1) for Basic 9 is now live. Please submit your answers before Friday 5:00 PM.",
      target_class: "ALL",
      type: "DEADLINE",
      sender_name: "Head of Computing Department",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: "note-02",
      title: "Project Work Flowchart Rubrics",
      message: "Please remember to test all Scratch loops and conditional branches before uploading your project submission link.",
      target_class: "Basic 9A",
      type: "ANNOUNCEMENT",
      sender_name: "Master Debrah (Admin)",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    },
    {
      id: "note-03",
      title: "Inter-School Computing & Robotics Challenge Prep",
      message: "Extra prep sessions for selected contestants will hold on Thursday at the computer laboratory.",
      target_class: "ALL",
      type: "GENERAL",
      sender_name: "Computing Academic Board",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
  ];
}

export function getFallbackChatMessages() {
  const local = localStorage.getItem("jhs_local_chats");
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }
  return [
    {
      id: "msg-01",
      sender_name: "Master Debrah (Admin)",
      sender_role: "admin",
      message: "Hello Kwame! Did you review the feedback on your Computing CAT 2 algorithm submission?",
      media_type: "text",
      read: true,
      read_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: "msg-02",
      sender_name: "Kwame Mensah Frimpong",
      sender_role: "learner",
      message: "Yes sir, I saw the 18.5/20! Here is the updated flowchart logic for the loop assignment.",
      media_type: "image",
      media_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
      media_name: "Basic9A_Algorithm_Flowchart.png",
      read: true,
      read_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: "msg-03",
      sender_name: "Master Debrah (Admin)",
      sender_role: "admin",
      message: "Excellent diagram Kwame! Listen to this brief voice note on optimizing step 4.",
      media_type: "audio",
      media_url: "https://cdn.freesound.org/previews/263/263133_2064400-lq.mp3",
      media_name: "Teacher_Audio_Feedback.mp3",
      audio_duration: "0:06",
      read: true,
      read_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
  ];
}

/**
 * Calculates current age in full years from date of birth.
 */
export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Checks whether today is the learner's birthday.
 */
export function isBirthdayToday(dateOfBirth) {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  return today.getDate() === dob.getDate() && today.getMonth() === dob.getMonth();
}

/**
 * Generates official dynamic Student ID in Ghana Basic Education format:
 * Format: JHS{YY}-{STREAM}-{001} (e.g. JHS26-B9A-001)
 * - Prefix: JHS + 2-digit dynamic year (e.g. JHS26 for 2026, JHS27 for 2027)
 * - Stream: 3-character class code (e.g. B9A, B9B, B8A, B8B, B7A, B7B)
 * - Sequence: 3-digit number starting at 001
 */
export function generateStudentId(classLevel = "Basic 9A", sequenceNumber = 1, date = new Date()) {
  const year2 = String(date.getFullYear()).slice(-2);
  const prefix = `JHS${year2}`;

  let streamCode = "B9A";
  if (classLevel) {
    const clean = String(classLevel).replace(/\s+/g, "").toUpperCase();
    if (clean.includes("9A") || clean.includes("3A")) streamCode = "B9A";
    else if (clean.includes("9B") || clean.includes("3B")) streamCode = "B9B";
    else if (clean.includes("8A") || clean.includes("2A")) streamCode = "B8A";
    else if (clean.includes("8B") || clean.includes("2B")) streamCode = "B8B";
    else if (clean.includes("7A") || clean.includes("1A")) streamCode = "B7A";
    else if (clean.includes("7B") || clean.includes("1B")) streamCode = "B7B";
    else streamCode = clean.slice(0, 3).padEnd(3, "A");
  }

  const seqStr = String(sequenceNumber).padStart(3, "0");
  return `${prefix}-${streamCode}-${seqStr}`;
}

export async function getNextStudentSequence(classLevel) {
  const supabase = getSupabase();
  if (!supabase) {
    const local = localStorage.getItem("jhs_all_learners");
    const learners = local ? JSON.parse(local) : getFallbackAllLearners();
    const countInClass = learners.filter((l) => l.class_level === classLevel).length;
    return countInClass + 1;
  }

  try {
    const { count, error } = await supabase
      .from("learners")
      .select("id", { count: "exact", head: true })
      .eq("class_level", classLevel)
      .eq("role", "learner");

    if (error || count == null) return 1;
    return count + 1;
  } catch (err) {
    return 1;
  }
}

export function getFallbackAllLearners() {
  return [
    {
      id: "lrn-001",
      student_id: "JHS26-B9A-001",
      full_name: "Kwame Mensah Frimpong",
      email: "kwame.mensah@ghana-edu.gov.gh",
      date_of_birth: "2011-10-14",
      class_level: "Basic 9A",
      gender: "Male",
      role: "learner",
      is_online: true,
      last_seen: new Date().toISOString(),
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      submissions: [{ score: 18.5 }, { score: 36 }],
    },
    {
      id: "lrn-002",
      student_id: "JHS26-B9A-002",
      full_name: "Akosua Adobea Ansah",
      email: "akosua.ansah@gmail.com",
      date_of_birth: "2011-08-22",
      class_level: "Basic 9A",
      gender: "Female",
      role: "learner",
      is_online: true,
      last_seen: new Date().toISOString(),
      avatar_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80",
      submissions: [{ score: 19.0 }],
    },
    {
      id: "lrn-003",
      student_id: "JHS26-B9B-001",
      full_name: "Kofi Owusu Boateng",
      email: "kofi.boateng@gmail.com",
      date_of_birth: "2011-02-14",
      class_level: "Basic 9B",
      gender: "Male",
      role: "learner",
      is_online: true,
      last_seen: new Date().toISOString(),
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      submissions: [{ score: 16.0 }],
    },
    {
      id: "lrn-004",
      student_id: "JHS26-B9B-002",
      full_name: "Abena Serwaa Prempeh",
      email: "abena.serwaa@gmail.com",
      date_of_birth: "2011-11-05",
      class_level: "Basic 9B",
      gender: "Female",
      role: "learner",
      is_online: false,
      last_seen: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      avatar_url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80",
      submissions: [{ score: 17.5 }],
    },
    {
      id: "lrn-005",
      student_id: "JHS26-B8A-001",
      full_name: "Emmanuel Nana Yaw",
      email: "emmanuel.yaw@gmail.com",
      date_of_birth: "2012-06-30",
      class_level: "Basic 8A",
      gender: "Male",
      role: "learner",
      is_online: false,
      last_seen: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
      submissions: [],
    },
  ];
}

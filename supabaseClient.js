import { createClient } from "@supabase/supabase-js";

// Default Supabase project URL (Anon key must be supplied via .env / VITE_SUPABASE_ANON_KEY or localStorage)
const DEFAULT_SUPABASE_URL = "https://vyecjlbknzwqexugtneg.supabase.co";

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
  const anonKey = (envKey && envKey.trim() !== "") ? envKey : (localStorage.getItem("jhs_supabase_anon_key") || "");

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

export function getAdminSupabase() {
  // In client-side SPA architecture, admin operations run securely through
  // the authenticated user session evaluated against PostgreSQL Row-Level Security (RLS) policies.
  // Service role keys should never be embedded or exposed in frontend client bundles.
  return getSupabase();
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
  // Pure live real data mode is active by default
  return localStorage.getItem("jhs_clear_mock_data") !== "false";
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
// Admin: Fetch All Registered Learners (Pure Real Database)
// -------------------------------------------------------------
export async function fetchAllLearners() {
  const supabase = getAdminSupabase() || getSupabase();
  if (!supabase) {
    return isMockDataCleared() ? [] : getFallbackAllLearners();
  }

  const { data, error } = await supabase
    .from("learners")
    .select("*, submissions(id, score, max_score, status, assessment_id, submitted_at)")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Supabase fetchAllLearners error:", error);
    return [];
  }

  const learners = data || [];
  const now = Date.now();

  // Auto-reconcile stale online status (e.g. closed browser without clean beforeunload)
  const staleLearners = learners.filter((l) => {
    if (!l.is_online) return false;
    if (!l.last_seen) return true;
    const diff = now - new Date(l.last_seen).getTime();
    return diff > 90000;
  });

  if (staleLearners.length > 0) {
    staleLearners.forEach((l) => {
      l.is_online = false;
    });

    const staleIds = staleLearners.map((l) => l.id);
    supabase
      .from("learners")
      .update({ is_online: false })
      .in("id", staleIds)
      .then(({ error: updateErr }) => {
        if (updateErr) console.warn("Could not reconcile stale online learners:", updateErr);
      })
      .catch((err) => console.warn("Reconcile error:", err));
  }

  return learners;
}

// -------------------------------------------------------------
// Assessments & Scores API (Pure Real Database - Pure Computing)
// -------------------------------------------------------------
export async function fetchAssessments() {
  const supabase = getAdminSupabase() || getSupabase();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .order("deadline", { ascending: true });

  if (error) {
    console.warn("Supabase fetchAssessments error:", error);
    return [];
  }

  return (data || []).filter(a => a.subject === "Computing" || !a.subject);
}

export async function fetchLearnerSubmissions(learnerId) {
  const supabase = getAdminSupabase() || getSupabase();
  if (!supabase || !learnerId) {
    return [];
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
    return [];
  }

  return data || [];
}

export async function fetchAllSubmissions() {
  const supabase = getAdminSupabase() || getSupabase();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("submissions")
    .select("*, assessments(id, title, subject, class_level, max_score, weight, assessment_type), learners(id, full_name, class_level, student_id)")
    .order("submitted_at", { ascending: false });

  if (error) {
    console.warn("Supabase fetchAllSubmissions error:", error);
    return [];
  }

  return data || [];
}

// -------------------------------------------------------------
// Real Learner Enrollment & Mark Recording Management
// -------------------------------------------------------------
export async function enrollLearner(learnerData) {
  const adminSupabase = getAdminSupabase();
  if (!adminSupabase) throw new Error("Supabase is not initialized");

  const email = (learnerData.email && learnerData.email.trim() !== "")
    ? learnerData.email.trim().toLowerCase()
    : `student.${(learnerData.student_id || ('id' + Date.now())).toLowerCase().replace(/[^a-z0-9]/g, '')}@ghana-edu.gov.gh`;

  const role = learnerData.role || "learner";
  const fullName = learnerData.full_name || "Unnamed User";

  // 1. Create auth user with service role
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: email,
    password: learnerData.password || "GhanaEdu@2026",
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: role,
    },
  });

  if (authError) {
    console.error("Auth admin createUser error:", authError);
    if (authError.message?.includes("already registered") || authError.code === "email_exists") {
      throw new Error(`A user with email "${email}" is already registered in the system.`);
    }
    throw authError;
  }

  const userId = authData?.user?.id;
  if (!userId) throw new Error("Could not create user account.");

  // Allow DB trigger on auth.users to execute
  await new Promise((r) => setTimeout(r, 200));

  const profilePayload = {
    id: userId,
    full_name: fullName,
    student_id: learnerData.student_id || generateStudentId(learnerData.class_level || "Basic 9A", 1),
    email: email,
    gender: learnerData.gender || "Male",
    class_level: learnerData.class_level || "Basic 9A",
    date_of_birth: learnerData.date_of_birth || null,
    role: role,
    onboarding_completed: true,
    is_online: false,
    avatar_url: learnerData.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: updatedData, error: updateErr } = await adminSupabase
    .from("learners")
    .upsert([profilePayload], { onConflict: "id" })
    .select()
    .single();

  if (updateErr) {
    console.warn("Learner upsert error, attempting update:", updateErr);
    const { data: fallbackData, error: fbErr } = await adminSupabase
      .from("learners")
      .update(profilePayload)
      .eq("id", userId)
      .select()
      .single();
    if (fbErr) throw fbErr;
    return fallbackData;
  }

  return updatedData;
}

export async function updateLearnerRecord(learnerId, updates) {
  if (!learnerId) throw new Error("Learner ID is required for update.");
  const adminSupabase = getAdminSupabase();
  const userSupabase = getSupabase();
  const supabase = adminSupabase || userSupabase;
  if (!supabase) throw new Error("Supabase is not initialized");

  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // If email was changed, update auth user as well
  if (updates.email && adminSupabase && !String(learnerId).startsWith("demo-")) {
    try {
      await adminSupabase.auth.admin.updateUserById(learnerId, {
        email: updates.email.trim().toLowerCase(),
      });
    } catch (e) {
      console.warn("Could not sync email to auth.users:", e);
    }
  }

  // Attempt update via user client first if available (to satisfy DOB trigger check), or fallback to admin client
  let resultData = null;
  let lastError = null;

  if (userSupabase) {
    try {
      const { data, error } = await userSupabase
        .from("learners")
        .update(payload)
        .eq("id", learnerId)
        .select()
        .single();
      if (!error && data) {
        resultData = data;
      } else {
        lastError = error;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!resultData && adminSupabase) {
    try {
      const { data, error } = await adminSupabase
        .from("learners")
        .update(payload)
        .eq("id", learnerId)
        .select()
        .single();
      if (!error && data) {
        resultData = data;
      } else {
        lastError = error;
      }
    } catch (err) {
      lastError = err;
    }
  }

  // If error is about DOB immutability, retry update without date_of_birth
  if (!resultData && lastError && (lastError.message?.includes("Date of birth is locked") || lastError.code === "P0001")) {
    console.warn("Retrying learner update without locked date_of_birth field...");
    const safePayload = { ...payload };
    delete safePayload.date_of_birth;

    const { data: safeData, error: safeErr } = await (adminSupabase || userSupabase)
      .from("learners")
      .update(safePayload)
      .eq("id", learnerId)
      .select()
      .single();

    if (safeErr) throw safeErr;
    return safeData;
  }

  if (lastError && !resultData) throw lastError;
  return resultData;
}

export async function deleteLearnerRecord(learnerId) {
  if (!learnerId) return;
  const adminSupabase = getAdminSupabase();
  const userSupabase = getSupabase();
  const supabase = adminSupabase || userSupabase;
  if (!supabase) return;

  // 1. Delete associated submissions to avoid foreign key issues
  try {
    await supabase.from("submissions").delete().eq("learner_id", learnerId);
  } catch (e) {
    console.warn("Could not cascade delete submissions:", e);
  }

  // 2. Delete associated chat messages
  try {
    await supabase.from("chat_messages").delete().eq("sender_id", learnerId);
    await supabase.from("chat_messages").delete().eq("recipient_id", learnerId);
  } catch (e) {
    console.warn("Could not cascade delete chat messages:", e);
  }

  // 3. Delete from learners table
  const { error: learnerDelErr } = await supabase.from("learners").delete().eq("id", learnerId);
  if (learnerDelErr) {
    console.warn("Learner record deletion error:", learnerDelErr);
  }

  // 4. Delete auth user credentials if admin client is available
  if (adminSupabase && !String(learnerId).startsWith("demo-")) {
    try {
      await adminSupabase.auth.admin.deleteUser(learnerId);
    } catch (authDelErr) {
      console.warn("Auth user deletion notice:", authDelErr);
    }
  }
}

export async function recordLearnerScore(payload) {
  const supabase = getAdminSupabase() || getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized");

  const max = parseFloat(payload.max_score) || 20;
  const score = parseFloat(payload.score) || 0;
  const subData = {
    assessment_id: payload.assessment_id,
    learner_id: payload.learner_id,
    score: score,
    max_score: max,
    status: "GRADED",
    teacher_remarks: payload.teacher_remarks || "Marked and recorded.",
    submitted_at: payload.submitted_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("submissions")
    .upsert([subData], { onConflict: "assessment_id,learner_id" })
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function batchEnrollLearners(learnersList) {
  const supabase = getAdminSupabase() || getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized");

  const records = learnersList.map((l, idx) => ({
    full_name: l.full_name,
    student_id: l.student_id || generateStudentId(l.class_level || "Basic 9A", idx + 1),
    email: l.email ? l.email.trim().toLowerCase() : null,
    gender: l.gender || "Male",
    class_level: l.class_level || "Basic 9A",
    date_of_birth: l.date_of_birth || null,
    role: "learner",
    onboarding_completed: true,
    is_online: false,
    avatar_url: l.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase.from("learners").insert(records).select();
  if (error) throw error;
  return data;
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

// Designated Admin Contact Card for student academic chat
export const ADMIN_CONTACT = {
  id: "dcf939ce-7723-44f2-afe8-ae77bfa8eaba",
  full_name: "Master Debrah (Admin)",
  email: "computing.b9@gmail.com",
  role: "admin",
  class_level: "Head of Computing",
  avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  is_online: true,
};

// -------------------------------------------------------------
// Realtime Chat API (User-to-User & User-with-Admin)
// -------------------------------------------------------------
export async function fetchChatMessages() {
  const supabase = getAdminSupabase() || getSupabase();
  if (!supabase) {
    const local = localStorage.getItem("jhs_local_chats");
    return local ? JSON.parse(local) : getFallbackChatMessages();
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error || !data) {
    console.warn("Could not fetch remote chat messages:", error);
    const local = localStorage.getItem("jhs_local_chats");
    return local ? JSON.parse(local) : getFallbackChatMessages();
  }

  // Merge with any local chats
  const local = localStorage.getItem("jhs_local_chats");
  let combined = [...data];
  if (local) {
    try {
      const parsed = JSON.parse(local);
      parsed.forEach((lm) => {
        if (!combined.some((rm) => rm.id === lm.id || (rm.created_at === lm.created_at && rm.message === lm.message))) {
          combined.push(lm);
        }
      });
    } catch (e) {}
  }

  return combined;
}

export const CHAT_REALTIME_CHANNEL_NAME = "realtime:jhs_assessment_chat";
let activeChatRealtimeChannel = null;
let chatRealtimeCallbacks = {
  onNewMessage: null,
  onMessageUpdate: null,
};

export function broadcastChatMessage(msg) {
  if (activeChatRealtimeChannel) {
    try {
      activeChatRealtimeChannel.send({
        type: "broadcast",
        event: "new_chat_message",
        payload: msg,
      });
    } catch (e) {
      console.warn("broadcastChatMessage error:", e);
    }
  }
}

export function broadcastMessageRead(viewerId, partnerId) {
  if (activeChatRealtimeChannel) {
    try {
      activeChatRealtimeChannel.send({
        type: "broadcast",
        event: "chat_message_read",
        payload: {
          viewerId,
          partnerId,
          read_at: new Date().toISOString(),
        },
      });
    } catch (e) {
      console.warn("broadcastMessageRead error:", e);
    }
  }
}

export async function sendChatMessage(chatPayload) {
  const supabase = getAdminSupabase() || getSupabase();
  const payloadToInsert = { ...chatPayload };

  const isValidUUID = (id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (!isValidUUID(payloadToInsert.sender_id)) {
    if (payloadToInsert.sender_role === "admin") {
      payloadToInsert.sender_id = "dcf939ce-7723-44f2-afe8-ae77bfa8eaba";
    } else {
      payloadToInsert.sender_id = "30d8e3f6-a5c4-47d2-af35-97cd81bbc0bf";
    }
  }

  if (payloadToInsert.recipient_id && !isValidUUID(payloadToInsert.recipient_id)) {
    payloadToInsert.recipient_id = null;
  }

  // Pre-generate unique ID & ISO timestamp for instant sub-30ms WebSocket dispatch
  const generatedId = "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
  const nowIso = new Date().toISOString();

  const immediateMsg = {
    id: generatedId,
    temp_id: generatedId,
    ...payloadToInsert,
    created_at: nowIso,
  };

  // 1. Save to local storage cache immediately
  const localChats = getFallbackChatMessages();
  localChats.push(immediateMsg);
  localStorage.setItem("jhs_local_chats", JSON.stringify(localChats));

  // 2. INSTANT WebSocket Broadcast to all active learners & admin across all tabs (< 25ms)
  broadcastChatMessage(immediateMsg);

  if (!supabase) {
    return immediateMsg;
  }

  // 3. Persist to Supabase Database
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert(payloadToInsert)
      .select()
      .single();

    if (error) {
      console.warn("Supabase sendChatMessage error:", error);
      return immediateMsg;
    }

    if (data) {
      return data;
    }
    return immediateMsg;
  } catch (err) {
    console.warn("sendChatMessage network error:", err);
    return immediateMsg;
  }
}

export async function markChatMessagesAsRead(viewerId, partnerId, viewerRole) {
  const supabase = getAdminSupabase() || getSupabase();
  const localChats = getFallbackChatMessages();
  let updated = false;

  localChats.forEach((msg) => {
    const matchesPartner = partnerId
      ? msg.sender_id === partnerId || (msg.sender_role === "admin" && partnerId === "dcf939ce-7723-44f2-afe8-ae77bfa8eaba")
      : true;
    if (matchesPartner && !msg.read) {
      msg.read = true;
      msg.read_at = new Date().toISOString();
      updated = true;
    }
  });

  if (updated) {
    localStorage.setItem("jhs_local_chats", JSON.stringify(localChats));
  }

  // Broadcast read receipt instantly over WebSocket
  broadcastMessageRead(viewerId, partnerId);

  if (!supabase) return localChats;

  try {
    if (partnerId) {
      await supabase
        .from("chat_messages")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("sender_id", partnerId)
        .eq("read", false);
    } else if (viewerRole) {
      const otherRole = viewerRole === "admin" ? "learner" : "admin";
      await supabase
        .from("chat_messages")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("sender_role", otherRole)
        .eq("read", false);
    }
  } catch (e) {
    console.warn("markChatMessagesAsRead error:", e);
  }

  return localChats;
}

export function subscribeToChatRealtime(onNewMessage, onMessageUpdate) {
  chatRealtimeCallbacks.onNewMessage = onNewMessage;
  chatRealtimeCallbacks.onMessageUpdate = onMessageUpdate;

  const supabase = getAdminSupabase() || getSupabase();
  if (!supabase) return () => {};

  if (activeChatRealtimeChannel) {
    return () => {};
  }

  const channel = supabase.channel(CHAT_REALTIME_CHANNEL_NAME, {
    config: {
      broadcast: { self: false },
    },
  });

  // 1. High-speed WebSocket Broadcast listener (< 25ms delivery)
  channel.on("broadcast", { event: "new_chat_message" }, (event) => {
    if (event.payload && chatRealtimeCallbacks.onNewMessage) {
      chatRealtimeCallbacks.onNewMessage(event.payload);
    }
  });

  channel.on("broadcast", { event: "chat_message_read" }, (event) => {
    if (event.payload && chatRealtimeCallbacks.onMessageUpdate) {
      chatRealtimeCallbacks.onMessageUpdate(event.payload);
    }
  });

  // 2. PostgreSQL CDC listener as backup guarantee
  channel.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "chat_messages" },
    (payload) => {
      if (payload.new && chatRealtimeCallbacks.onNewMessage) {
        chatRealtimeCallbacks.onNewMessage(payload.new);
      }
    }
  );

  channel.on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "chat_messages" },
    (payload) => {
      if (payload.new && chatRealtimeCallbacks.onMessageUpdate) {
        chatRealtimeCallbacks.onMessageUpdate(payload.new);
      }
    }
  );

  channel.subscribe((status) => {
    console.log("[Chat Realtime WebSocket Channel]", status);
  });

  activeChatRealtimeChannel = channel;

  return () => {
    try {
      channel.unsubscribe();
    } catch (e) {}
    if (activeChatRealtimeChannel === channel) {
      activeChatRealtimeChannel = null;
    }
  };
}

// -------------------------------------------------------------
// Live Presence & Realtime Metrics Subscriptions
// -------------------------------------------------------------
export function isLearnerOnline(l) {
  if (!l) return false;
  if (l.is_online === false || l.is_online === "false") return false;
  if (!l.last_seen) return false;
  const diff = Date.now() - new Date(l.last_seen).getTime();
  // Valid active presence window: 90 seconds (heartbeat interval is 25s)
  return diff >= 0 && diff < 90000;
}

export async function setUserOnlineStatus(userId, isOnline) {
  if (!userId || String(userId).startsWith("demo-")) return;
  const supabase = getAdminSupabase() || getSupabase();
  if (!supabase) return;

  try {
    await supabase
      .from("learners")
      .update({
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      })
      .eq("id", userId);
  } catch (err) {
    console.warn("Could not update online presence:", err);
  }
}

let activeLearnersPresenceChannel = null;

export function subscribeToLearnersRealtime(onLearnerUpdate) {
  const supabase = getAdminSupabase() || getSupabase();
  if (!supabase) return () => {};

  if (activeLearnersPresenceChannel) {
    try { activeLearnersPresenceChannel.unsubscribe(); } catch (e) {}
    activeLearnersPresenceChannel = null;
  }

  const channel = supabase
    .channel("realtime:learners_presence")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "learners" },
      (payload) => {
        if (payload.new && onLearnerUpdate) {
          onLearnerUpdate(payload.new);
        }
      }
    )
    .subscribe((status) => {
      console.log("Learners Presence Realtime status:", status);
    });

  activeLearnersPresenceChannel = channel;

  return () => {
    try { channel.unsubscribe(); } catch (e) {}
    if (activeLearnersPresenceChannel === channel) {
      activeLearnersPresenceChannel = null;
    }
  };
}

let activeAdminRealtimeChannel = null;

export function subscribeToAdminRealtime(onRealtimeUpdate) {
  const supabase = getAdminSupabase() || getSupabase();
  if (!supabase) return () => {};

  if (activeAdminRealtimeChannel) {
    try {
      activeAdminRealtimeChannel.unsubscribe();
    } catch (e) {}
    activeAdminRealtimeChannel = null;
  }

  const channelName = "admin-metrics-feed-" + Date.now();
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "learners" },
      (payload) => {
        onRealtimeUpdate({ source: "learners", payload });
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "submissions" },
      (payload) => {
        onRealtimeUpdate({ source: "submissions", payload });
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "assessments" },
      (payload) => {
        onRealtimeUpdate({ source: "assessments", payload });
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications" },
      (payload) => {
        onRealtimeUpdate({ source: "notifications", payload });
      }
    )
    .subscribe((status) => {
      console.log("Supabase Realtime Channel status:", status);
    });

  activeAdminRealtimeChannel = channel;

  return () => {
    try {
      channel.unsubscribe();
    } catch (e) {}
    if (activeAdminRealtimeChannel === channel) {
      activeAdminRealtimeChannel = null;
    }
  };
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
  const supabase = getAdminSupabase() || getSupabase();
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

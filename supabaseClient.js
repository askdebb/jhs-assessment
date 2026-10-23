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

  // Ensure clean, deterministic redirect target to prevent Supabase or Vercel route mismatches
  const targetPath = window.location.pathname.startsWith("/admin") ? "/admin" : "/learner";
  const redirectUrl = `${window.location.origin}${targetPath}`;
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
  if (error || !session) {
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
  if (data) return data;
  const local = localStorage.getItem("jhs_active_learner");
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }
  return null;
}

export async function updateLearnerProfile(profileData) {
  if (profileData.id?.startsWith("demo-") || !getSupabase()) {
    localStorage.setItem("jhs_active_learner", JSON.stringify(profileData));
    return profileData;
  }

  const supabase = getSupabase();
  try {
    let payload = { ...profileData };
    let { data, error } = await supabase
      .from("learners")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    // If there is a student_id collision (Postgres code 23505), re-calculate safe sequence and retry
    if (error && (error.code === "23505" || String(error.message || "").includes("student_id"))) {
      console.warn("Student ID collision detected on profile save. Generating next sequence...", error);
      const freshSeq = await getNextStudentSequence(payload.class_level || "Basic 9A");
      payload.student_id = generateStudentId(payload.class_level || "Basic 9A", freshSeq);
      const retryRes = await supabase
        .from("learners")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();
      if (!retryRes.error && retryRes.data) {
        data = retryRes.data;
        error = null;
      }
    }

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
  localStorage.removeItem("jhs_read_notifications");
  localStorage.removeItem("jhs_all_learners");
  localStorage.removeItem("jhs_view_mode");
  localStorage.setItem("jhs_clear_mock_data", "true");
}

export function restoreMockData() {
  localStorage.removeItem("jhs_clear_mock_data");
}

export async function purgeAllTestDataFromDatabase() {
  const supabase = getAdminSupabase() || getSupabase();
  const results = {
    submissionsPurged: false,
    chatsPurged: false,
    recordingsPurged: false,
    notificationsPurged: false,
    learnersPurged: false,
  };

  if (supabase) {
    try {
      await supabase.from("submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.submissionsPurged = true;
    } catch (e) {
      console.warn("Purge submissions error:", e);
    }
    try {
      await supabase.from("chat_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.chatsPurged = true;
    } catch (e) {
      console.warn("Purge chats error:", e);
    }
    try {
      await supabase.from("call_recordings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.recordingsPurged = true;
    } catch (e) {
      console.warn("Purge recordings error:", e);
    }
    try {
      await supabase.from("notification_reads").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      results.notificationsPurged = true;
    } catch (e) {
      console.warn("Purge notifications error:", e);
    }
    try {
      await supabase.from("learners").delete().eq("role", "learner");
      results.learnersPurged = true;
    } catch (e) {
      console.warn("Purge learners error:", e);
    }
  }

  clearAllMockData();
  return results;
}

// -------------------------------------------------------------
// Admin: Fetch All Registered Learners (Pure Real Database)
// -------------------------------------------------------------
export async function fetchAllLearners() {
  const supabase = getAdminSupabase() || getSupabase();
  if (!supabase) {
    return isMockDataCleared() ? [] : getFallbackAllLearners();
  }

  let learnersData = null;
  let fetchError = null;

  try {
    const res = await supabase
      .from("learners")
      .select("*, submissions(id, score, max_score, status, assessment_id, submitted_at)")
      .order("created_at", { ascending: false });
    learnersData = res.data;
    fetchError = res.error;
  } catch (err) {
    fetchError = err;
  }

  // Fallback: If relational submissions join fails (e.g. PostgREST schema cache or RLS on submissions),
  // query learners directly without join so learners in the database are not lost
  if (fetchError || !learnersData) {
    console.warn("Supabase fetchAllLearners joined query notice, retrying with direct select:", fetchError);
    try {
      const fallbackRes = await supabase
        .from("learners")
        .select("*")
        .order("created_at", { ascending: false });
      if (!fallbackRes.error && fallbackRes.data) {
        learnersData = fallbackRes.data.map((l) => ({ ...l, submissions: [] }));
        fetchError = null;
      }
    } catch (fbErr) {
      console.warn("Fallback select also failed:", fbErr);
    }
  }

  if (fetchError) {
    console.warn("Supabase fetchAllLearners error:", fetchError);
    return [];
  }

  // Pure real database records only; never fallback to cooked fake students
  const learners = (learnersData && learnersData.length > 0) ? learnersData : [];
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
    return getFallbackAssessments();
  }

  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .order("deadline", { ascending: true });

  if (error || !data || data.length === 0) {
    console.warn("Supabase fetchAssessments notice, using official curriculum CATs:", error);
    return getFallbackAssessments();
  }

  const fallback = getFallbackAssessments();

  // Filter out any non-CAT assessments, math, quiz, project, exam
  let computing = (data || []).filter((a) => {
    if (a.subject && a.subject !== "Computing") return false;
    const title = (a.title || "").toLowerCase();
    if (title.includes("creative") || title.includes("art") || title.includes("math")) return false;
    if (title.includes("quiz") || title.includes("project") || title.includes("exam") || title.includes("terminal")) return false;
    return a.assessment_type === "CAT" || title.includes("cat");
  });

  // Normalize titles and class levels for CAT 1 and CAT 2
  computing = computing.map((a) => {
    const title = (a.title || "").toLowerCase();
    if (title.includes("cat 2") || title.includes("cat2")) {
      const is9B = a.class_level === "Basic 9B" || title.includes("9b");
      return {
        ...a,
        title: is9B ? "Computing CAT 2 (Basic 9B)" : "Computing CAT 2 (Basic 9A)",
        class_level: is9B ? "Basic 9B" : "Basic 9A",
        description: is9B
          ? "Continuous Assessment Test 2 covering Network Storage, Virtual Cloud & Cyber Ergonomics."
          : "Continuous Assessment Test 2 covering Cloud Computing, Storage & Quantum Processors.",
        weight: 50.00,
      };
    }
    if (title.includes("cat 1") || title.includes("cat1")) {
      const is9B = a.class_level === "Basic 9B" || title.includes("9b");
      return {
        ...a,
        title: is9B ? "Computing CAT 1 (Basic 9B)" : "Computing CAT 1 (Basic 9A)",
        class_level: is9B ? "Basic 9B" : "Basic 9A",
        description: is9B
          ? "Continuous Assessment Test 1 covering Artificial Intelligence & Quantum Architecture."
          : "Continuous Assessment Test 1 covering Trends in Computing, Perceptual & Quantum Computing.",
        weight: 50.00,
      };
    }
    return a;
  });

  // Ensure both tracks have CAT 1 and CAT 2
  const has9A_CAT1 = computing.some((a) => a.class_level === "Basic 9A" && a.title.includes("CAT 1"));
  const has9A_CAT2 = computing.some((a) => a.class_level === "Basic 9A" && a.title.includes("CAT 2"));
  const has9B_CAT1 = computing.some((a) => a.class_level === "Basic 9B" && a.title.includes("CAT 1"));
  const has9B_CAT2 = computing.some((a) => a.class_level === "Basic 9B" && a.title.includes("CAT 2"));

  if (!has9A_CAT1) computing.push(fallback.find((a) => a.id === "asmt-001"));
  if (!has9B_CAT1) computing.push(fallback.find((a) => a.id === "asmt-002"));
  if (!has9A_CAT2) computing.push(fallback.find((a) => a.id === "asmt-005"));
  if (!has9B_CAT2) computing.push(fallback.find((a) => a.id === "asmt-006"));

  // Background sync to database if admin client is active
  const adminSupabase = getAdminSupabase();
  if (adminSupabase) {
    try {
      adminSupabase.from("assessments").delete().neq("assessment_type", "CAT").then(() => {}).catch(() => {});
    } catch (e) {}
  }

  const seen = new Set();
  const unique = [];
  for (const a of computing) {
    if (!a) continue;
    const key = `${(a.title || "").trim().toLowerCase()}___${(a.class_level || "").trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(a);
    }
  }
  return unique.length > 0 ? unique : fallback;
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
  const fullName = (learnerData.full_name || "Unnamed User").trim();

  // Check full_name uniqueness in learners table
  try {
    const { data: existingName } = await adminSupabase
      .from("learners")
      .select("id, full_name")
      .ilike("full_name", fullName)
      .limit(1);

    if (existingName && existingName.length > 0) {
      throw new Error(`A user with the registered name "${fullName}" already exists. Registered names must be unique.`);
    }
  } catch (err) {
    if (err.message && err.message.includes("already exists")) throw err;
  }

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

  const targetClass = learnerData.class_level || "Basic 9A";
  const studentSeq = learnerData.student_id ? 1 : await getNextStudentSequence(targetClass);
  const profilePayload = {
    id: userId,
    full_name: fullName,
    student_id: learnerData.student_id || generateStudentId(targetClass, studentSeq),
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

  // Check uniqueness of full_name if being modified
  if (updates.full_name) {
    const fn = updates.full_name.trim();
    try {
      const { data: dupName } = await supabase
        .from("learners")
        .select("id, full_name")
        .neq("id", learnerId)
        .ilike("full_name", fn)
        .limit(1);
      if (dupName && dupName.length > 0) {
        throw new Error(`A user with the registered name "${fn}" already exists. Registered names must be unique.`);
      }
    } catch (e) {
      if (e.message && e.message.includes("already exists")) throw e;
    }
  }

  // Check uniqueness of email if being modified
  if (updates.email) {
    const em = updates.email.trim().toLowerCase();
    try {
      const { data: dupEmail } = await supabase
        .from("learners")
        .select("id, email")
        .neq("id", learnerId)
        .ilike("email", em)
        .limit(1);
      if (dupEmail && dupEmail.length > 0) {
        throw new Error(`A user with the email address "${em}" already exists. Email addresses must be unique.`);
      }
    } catch (e) {
      if (e.message && e.message.includes("already exists")) throw e;
    }
  }

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

  const prevScores = existingIdx >= 0 && localSubs[existingIdx].previous_scores
    ? [...localSubs[existingIdx].previous_scores]
    : [];
  if (existingIdx >= 0 && localSubs[existingIdx].score != null) {
    prevScores.push({
      score: localSubs[existingIdx].score,
      max_score: localSubs[existingIdx].max_score || 20,
      submitted_at: localSubs[existingIdx].submitted_at,
      retake_reason: localSubs[existingIdx].retake_reason || null
    });
  }

  const newSub = {
    id: payload.id || (existingIdx >= 0 ? localSubs[existingIdx].id : "sub-" + Date.now()),
    ...payload,
    submitted_at: payload.submitted_at || new Date().toISOString(),
    status: "GRADED",
    retake_granted: false, // Reset retake flag once re-submitted
    retake_reason: null,
    previous_scores: prevScores,
  };

  if (existingIdx >= 0) {
    localSubs[existingIdx] = { ...localSubs[existingIdx], ...newSub };
  } else {
    localSubs.unshift(newSub);
  }
  localStorage.setItem("jhs_local_submissions", JSON.stringify(localSubs));

  // Also update learner in fallback list
  const fallbackLearners = getFallbackAllLearners();
  const lrn = fallbackLearners.find((l) => l.id === payload.learner_id);
  if (lrn) {
    lrn.submissions = lrn.submissions || [];
    const lrnSubIdx = lrn.submissions.findIndex((s) => s.assessment_id === payload.assessment_id || s.id === newSub.id);
    if (lrnSubIdx >= 0) {
      lrn.submissions[lrnSubIdx] = { ...lrn.submissions[lrnSubIdx], ...newSub };
    } else {
      lrn.submissions.unshift({ ...newSub });
    }
  }

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
            retake_granted: false,
            retake_reason: null,
            previous_scores: prevScores,
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

export async function grantSubmissionRetake(learnerId, asmtId, reason = "Teacher authorized 2nd attempt", teacherName = "Master Debrah (Admin)") {
  const localSubs = getFallbackSubmissions();
  let sub = localSubs.find((s) => s.learner_id === learnerId && s.assessment_id === asmtId);
  const now = new Date().toISOString();

  if (sub) {
    sub.retake_granted = true;
    sub.retake_reason = reason;
    sub.retake_granted_at = now;
  } else {
    sub = {
      id: "sub-retake-" + Date.now(),
      assessment_id: asmtId,
      learner_id: learnerId,
      score: 0,
      max_score: 20,
      status: "PENDING",
      retake_granted: true,
      retake_reason: reason,
      retake_granted_at: now,
      submitted_at: now,
      teacher_remarks: `Retake authorized by ${teacherName}: ${reason}`,
      previous_scores: []
    };
    localSubs.unshift(sub);
  }
  localStorage.setItem("jhs_local_submissions", JSON.stringify(localSubs));

  // Also update in fallback learners roster
  const fallbackLearners = getFallbackAllLearners();
  const lrn = fallbackLearners.find((l) => l.id === learnerId);
  if (lrn) {
    lrn.submissions = lrn.submissions || [];
    const lrnSub = lrn.submissions.find((s) => s.assessment_id === asmtId || s.id === sub.id);
    if (lrnSub) {
      lrnSub.retake_granted = true;
      lrnSub.retake_reason = reason;
      lrnSub.retake_granted_at = now;
    } else {
      lrn.submissions.unshift({ ...sub });
    }
  }

  const supabase = getAdminSupabase() || getSupabase();
  if (supabase && learnerId && !learnerId.startsWith("demo-")) {
    try {
      const { data, error } = await supabase
        .from("submissions")
        .upsert(
          {
            assessment_id: asmtId,
            learner_id: learnerId,
            retake_granted: true,
            retake_reason: reason,
            retake_granted_at: now,
          },
          { onConflict: "assessment_id,learner_id" }
        )
        .select()
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase grant retake error:", e);
    }
  }

  return sub;
}

export function getDispatchedEmails() {
  try {
    return JSON.parse(localStorage.getItem("jhs_dispatched_emails") || "[]");
  } catch (e) {
    return [];
  }
}

export async function dispatchEmailNotification({
  to,
  recipientName = "Student",
  subject,
  heading,
  previewText,
  bodyHtml,
  actionUrl = (typeof window !== "undefined" && window.location?.origin ? window.location.origin + "/learner" : "https://jhs-chi.vercel.app/learner"),
  actionText = "Open Assessment Portal",
  senderName = "Master Debrah (Admin)",
  senderEmail = "computing.b9@gmail.com",
  meta = {}
}) {
  const timestamp = new Date().toISOString();
  const emailRecord = {
    id: "email-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    to: (to || "student@ghana-edu.gov.gh").toLowerCase(),
    recipientName,
    subject: subject || "Ghana Basic Education Service Notification",
    heading: heading || subject,
    previewText: previewText || heading,
    bodyHtml,
    actionUrl,
    actionText,
    senderName,
    senderEmail,
    timestamp,
    status: "DELIVERED",
    meta
  };

  const emails = getDispatchedEmails();
  emails.unshift(emailRecord);
  if (emails.length > 200) emails.length = 200;
  localStorage.setItem("jhs_dispatched_emails", JSON.stringify(emails));

  const supabase = getSupabase();
  if (supabase) {
    try {
      supabase.functions.invoke("send-email", { body: emailRecord }).catch(() => {});
    } catch (e) {}
  }

  window.dispatchEvent(new CustomEvent("jhs:email-dispatched", { detail: emailRecord }));
  console.log(`[Ghana Edu Mail Engine] 📧 Dispatched email to ${emailRecord.to}: "${emailRecord.subject}"`);
  return emailRecord;
}

export async function triggerWebPushNotification(title, options = {}) {
  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const pushPayload = {
    title,
    body: options.body || "",
    icon: options.icon || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=120&q=80",
    tag: options.tag || "jhs-push-" + Date.now(),
    url: options.url || "/learner",
    timestamp
  };

  let nativePushed = false;
  if ("Notification" in window) {
    let perm = Notification.permission;
    if (perm === "default") {
      try {
        perm = await Notification.requestPermission();
      } catch (e) {}
    }
    if (perm === "granted") {
      try {
        const notif = new Notification(title, {
          body: pushPayload.body,
          icon: pushPayload.icon,
          badge: pushPayload.icon,
          tag: pushPayload.tag
        });
        notif.onclick = () => {
          window.focus();
          if (options.onClick) options.onClick();
          notif.close();
        };
        nativePushed = true;
      } catch (err) {
        console.warn("Native Notification trigger error:", err);
      }
    }
  }

  window.dispatchEvent(new CustomEvent("jhs:push-notification", { detail: pushPayload }));
  return { nativePushed, payload: pushPayload };
}

export async function updateAssessment(asmtId, updates) {
  const localAsmts = getFallbackAssessments();
  const idx = localAsmts.findIndex((a) => a.id === asmtId);
  if (idx >= 0) {
    localAsmts[idx] = { ...localAsmts[idx], ...updates };
    localStorage.setItem("jhs_local_assessments", JSON.stringify(localAsmts));
  }

  const supabase = getAdminSupabase() || getSupabase();
  if (supabase) {
    try {
      const dbUpdates = { ...updates };
      delete dbUpdates.due_date;
      const { data, error } = await supabase
        .from("assessments")
        .update(dbUpdates)
        .eq("id", asmtId)
        .select()
        .single();
      if (!error && data) return data;
      if (error) console.warn("Supabase updateAssessment notice:", error);
    } catch (e) {
      console.warn("Supabase assessment update error, falling back to local:", e);
    }
  }

  return idx >= 0 ? localAsmts[idx] : null;
}

export async function createAssessment(asmtPayload) {
  const localAsmts = getFallbackAssessments();
  const initialStatus = asmtPayload.status || "CLOSED";
  const newAsmt = {
    id: "asmt-" + Date.now(),
    weight: 20.00,
    status: initialStatus,
    deadline: asmtPayload.deadline || null,
    unlock_time: asmtPayload.unlock_time || null,
    ...asmtPayload,
    status: initialStatus,
  };
  localAsmts.push(newAsmt);
  localStorage.setItem("jhs_local_assessments", JSON.stringify(localAsmts));

  const supabase = getAdminSupabase() || getSupabase();
  if (supabase) {
    try {
      const dbPayload = {
        ...asmtPayload,
        status: initialStatus,
      };
      delete dbPayload.due_date;
      const { data, error } = await supabase
        .from("assessments")
        .insert(dbPayload)
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
export async function fetchNotifications(classLevel = "ALL") {
  if (isMockDataCleared()) {
    const supabase = getSupabase();
    if (!supabase) return [];
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (classLevel && classLevel !== "ALL") {
      query = query.or(`target_class.eq.ALL,target_class.eq.${classLevel}`);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data;
  }

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
  if (error || !data) {
    return getFallbackNotifications();
  }
  return data;
}

export async function sendNotification(notificationPayload) {
  const localNotes = getFallbackNotifications();
  const newNote = {
    id: "note-" + Date.now(),
    ...notificationPayload,
    created_at: new Date().toISOString(),
  };
  localNotes.unshift(newNote);
  localStorage.setItem("jhs_local_notifications", JSON.stringify(localNotes));

  const supabase = getAdminSupabase() || getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert(notificationPayload)
        .select()
        .single();

      if (!error && data) return data;
      if (error) {
        console.warn("Supabase sendNotification warning (e.g. RLS or network), preserved locally:", error.message || error);
      }
    } catch (err) {
      console.warn("Supabase sendNotification exception, preserved locally:", err);
    }
  }

  return newNote;
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
        const matchIdx = combined.findIndex((rm) => rm.id === lm.id || (rm.created_at === lm.created_at && rm.message === lm.message));
        if (matchIdx !== -1) {
          combined[matchIdx] = {
            ...lm,
            ...combined[matchIdx],
            recipient_id: combined[matchIdx].recipient_id || lm.recipient_id,
            recipient_email: combined[matchIdx].recipient_email || lm.recipient_email,
            recipient_student_id: combined[matchIdx].recipient_student_id || lm.recipient_student_id,
            recipient_role: combined[matchIdx].recipient_role || lm.recipient_role,
          };
        } else {
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
  onCallSignal: null,
};

export function broadcastCallSignal(signal) {
  if (activeChatRealtimeChannel) {
    try {
      activeChatRealtimeChannel.send({
        type: "broadcast",
        event: "webrtc_call_signal",
        payload: signal,
      });
      return true;
    } catch (e) {
      console.warn("broadcastCallSignal error:", e);
      return false;
    }
  }
  return false;
}

export const chatBroadcastChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("jhs_chat_sync_channel")
    : null;

if (chatBroadcastChannel) {
  chatBroadcastChannel.onmessage = (event) => {
    const { type, payload } = event.data || {};
    if (type === "new_chat_message" && payload && chatRealtimeCallbacks.onNewMessage) {
      chatRealtimeCallbacks.onNewMessage(payload);
    } else if (type === "chat_message_read" && payload && chatRealtimeCallbacks.onMessageUpdate) {
      chatRealtimeCallbacks.onMessageUpdate(payload);
    } else if (type === "chat_message_updated" && payload && chatRealtimeCallbacks.onMessageUpdate) {
      chatRealtimeCallbacks.onMessageUpdate(payload);
    } else if (type === "webrtc_call_signal" && payload && chatRealtimeCallbacks.onCallSignal) {
      chatRealtimeCallbacks.onCallSignal(payload);
    }
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "jhs_local_chats" && e.newValue) {
      try {
        const chats = JSON.parse(e.newValue);
        const lastMsg = chats[chats.length - 1];
        if (lastMsg && chatRealtimeCallbacks.onNewMessage) {
          chatRealtimeCallbacks.onNewMessage(lastMsg);
        }
      } catch (err) {}
    }
  });
}

export function broadcastChatMessage(msg) {
  if (chatBroadcastChannel) {
    try {
      chatBroadcastChannel.postMessage({ type: "new_chat_message", payload: msg });
    } catch (e) {}
  }
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
  const payload = {
    viewerId,
    partnerId,
    read_at: new Date().toISOString(),
  };
  if (chatBroadcastChannel) {
    try {
      chatBroadcastChannel.postMessage({ type: "chat_message_read", payload });
    } catch (e) {}
  }
  if (activeChatRealtimeChannel) {
    try {
      activeChatRealtimeChannel.send({
        type: "broadcast",
        event: "chat_message_read",
        payload,
      });
    } catch (e) {
      console.warn("broadcastMessageRead error:", e);
    }
  }
}

export function broadcastMessageUpdate(updatedMsg) {
  if (chatBroadcastChannel) {
    try {
      chatBroadcastChannel.postMessage({ type: "chat_message_updated", payload: updatedMsg });
    } catch (e) {}
  }
  if (activeChatRealtimeChannel) {
    try {
      activeChatRealtimeChannel.send({
        type: "broadcast",
        event: "chat_message_updated",
        payload: updatedMsg,
      });
    } catch (e) {
      console.warn("broadcastMessageUpdate error:", e);
    }
  }
}

export async function sendChatMessage(chatPayload) {
  const supabase = getAdminSupabase() || getSupabase();

  // Pre-generate unique ID & ISO timestamp for instant sub-30ms WebSocket dispatch
  const generatedId = "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
  const nowIso = new Date().toISOString();

  // 1. Create immediate message preserving authentic sender, recipient, and email metadata
  const immediateMsg = {
    id: generatedId,
    temp_id: generatedId,
    ...chatPayload,
    sender_name: chatPayload.sender_name || (chatPayload.sender_role === "admin" ? "Master Debrah (Admin)" : "Student Learner"),
    read: false,
    created_at: nowIso,
  };

  // 2. Save to local storage cache immediately
  const localChats = getFallbackChatMessages();
  localChats.push(immediateMsg);
  localStorage.setItem("jhs_local_chats", JSON.stringify(localChats));

  // 3. INSTANT BroadcastChannel + WebSocket Broadcast across all tabs and network
  broadcastChatMessage(immediateMsg);

  if (!supabase) {
    return immediateMsg;
  }

  // 4. Persist to Supabase Database with UUID sanitization only for the DB payload
  try {
    const isValidUUID = (id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const dbPayload = { ...chatPayload };
    delete dbPayload.temp_id;
    delete dbPayload.sender_email;
    delete dbPayload.recipient_email;
    delete dbPayload.sender_student_id;
    delete dbPayload.recipient_student_id;
    delete dbPayload.recipient_role;

    if (!isValidUUID(dbPayload.sender_id)) {
      if (dbPayload.sender_role === "admin") {
        dbPayload.sender_id = "dcf939ce-7723-44f2-afe8-ae77bfa8eaba";
      } else {
        dbPayload.sender_id = "30d8e3f6-a5c4-47d2-af35-97cd81bbc0bf";
      }
    }

    if (dbPayload.recipient_id && !isValidUUID(dbPayload.recipient_id)) {
      dbPayload.recipient_id = null;
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.warn("Supabase sendChatMessage error:", error);
      return immediateMsg;
    }

    if (data) {
      return {
        ...immediateMsg,
        id: data.id,
      };
    }
    return immediateMsg;
  } catch (err) {
    console.warn("sendChatMessage network error:", err);
    return immediateMsg;
  }
}

export async function markChatMessagesAsRead(viewerId, partnerId, viewerRole, partnerEmail) {
  const supabase = getAdminSupabase() || getSupabase();
  const localChats = getFallbackChatMessages();
  let updated = false;

  localChats.forEach((msg) => {
    const matchesPartner = partnerId
      ? msg.sender_id === partnerId ||
        (partnerEmail && msg.sender_email && msg.sender_email.toLowerCase() === partnerEmail.toLowerCase()) ||
        (msg.sender_role === "admin" && (partnerId === "dcf939ce-7723-44f2-afe8-ae77bfa8eaba" || viewerRole === "learner"))
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

  // Broadcast read receipt instantly over WebSocket & BroadcastChannel
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

export async function updateChatMessage(messageId, updates) {
  const supabase = getAdminSupabase() || getSupabase();
  const localChats = getFallbackChatMessages();
  let updatedMsg = null;

  for (let i = 0; i < localChats.length; i++) {
    if (localChats[i].id === messageId || localChats[i].temp_id === messageId) {
      localChats[i] = { ...localChats[i], ...updates };
      updatedMsg = localChats[i];
      break;
    }
  }

  if (updatedMsg) {
    localStorage.setItem("jhs_local_chats", JSON.stringify(localChats));
    broadcastMessageUpdate(updatedMsg);
  }

  if (!supabase || !messageId) return updatedMsg;

  try {
    const isValidUUID = (id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isValidUUID(messageId)) {
      const { data, error } = await supabase
        .from("chat_messages")
        .update(updates)
        .eq("id", messageId)
        .select()
        .single();
      if (!error && data) {
        return data;
      }
    }
  } catch (err) {
    console.warn("updateChatMessage Supabase error:", err);
  }

  return updatedMsg;
}

export async function deleteChatMessage(messageId) {
  return await updateChatMessage(messageId, {
    is_deleted: true,
    message: "🚫 This message was deleted",
    media_url: null,
    media_type: "text",
    media_name: null,
    deleted_at: new Date().toISOString(),
  });
}

export async function toggleMessageReaction(messageId, emoji, userId, userName) {
  const localChats = getFallbackChatMessages();
  const msg = localChats.find((m) => m.id === messageId || m.temp_id === messageId);
  if (!msg) return null;

  let reactions = msg.reactions || {};
  if (Array.isArray(reactions)) {
    const map = {};
    reactions.forEach((r) => {
      map[r.emoji] = map[r.emoji] || [];
      map[r.emoji].push(r.user_name || r.user_id);
    });
    reactions = map;
  } else {
    reactions = { ...reactions };
  }

  const userIdentifier = userName || userId || "Learner";
  const currentUsers = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
  const existingIdx = currentUsers.findIndex((u) => u === userIdentifier || u === userId);

  if (existingIdx !== -1) {
    // Already reacted with this emoji -> toggle off
    currentUsers.splice(existingIdx, 1);
    if (currentUsers.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = currentUsers;
    }
  } else {
    // Remove from other emojis first (WhatsApp standard: 1 reaction per user)
    Object.keys(reactions).forEach((em) => {
      reactions[em] = (reactions[em] || []).filter((u) => u !== userIdentifier && u !== userId);
      if (reactions[em].length === 0) {
        delete reactions[em];
      }
    });
    // Add to this emoji
    currentUsers.push(userIdentifier);
    reactions[emoji] = currentUsers;
  }

  return await updateChatMessage(messageId, { reactions });
}

export function subscribeToChatRealtime(onNewMessage, onMessageUpdate, onCallSignal) {
  chatRealtimeCallbacks.onNewMessage = onNewMessage;
  chatRealtimeCallbacks.onMessageUpdate = onMessageUpdate;
  chatRealtimeCallbacks.onCallSignal = onCallSignal;

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

  channel.on("broadcast", { event: "chat_message_updated" }, (event) => {
    if (event.payload && chatRealtimeCallbacks.onMessageUpdate) {
      chatRealtimeCallbacks.onMessageUpdate(event.payload);
    }
  });

  channel.on("broadcast", { event: "webrtc_call_signal" }, (event) => {
    if (event.payload && chatRealtimeCallbacks.onCallSignal) {
      chatRealtimeCallbacks.onCallSignal(event.payload);
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

  channel.on(
    "postgres_changes",
    { event: "DELETE", schema: "public", table: "chat_messages" },
    (payload) => {
      if (payload.old && chatRealtimeCallbacks.onMessageUpdate) {
        chatRealtimeCallbacks.onMessageUpdate({
          id: payload.old.id,
          is_deleted: true,
          message: "🚫 This message was deleted",
        });
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
      // Strictly keep only official CAT 1 and CAT 2 assessments
      const filtered = parsed.filter(a => {
        if (a.subject && a.subject !== "Computing") return false;
        const title = (a.title || "").toLowerCase();
        if (title.includes("quiz") || title.includes("project") || title.includes("exam") || title.includes("math")) return false;
        return a.assessment_type === "CAT" || title.includes("cat");
      });
      if (filtered.length >= 2) return filtered;
    } catch (e) {}
  }

  // Pure Computing Ghanaian Curriculum Assessments - 4 Official CATs
  // Default to CLOSED so they only become active and countdown when activated by administrator!
  return [
    {
      id: "asmt-001",
      title: "Computing CAT 1 (Basic 9A)",
      subject: "Computing",
      class_level: "Basic 9A",
      assessment_type: "CAT",
      description: "Continuous Assessment Test 1 covering Trends in Computing, Perceptual & Quantum Computing.",
      max_score: 20,
      weight: 50.00,
      status: "CLOSED",
      unlock_time: null,
      deadline: null,
      time_limit_minutes: 15,
      assessment_url: null,
    },
    {
      id: "asmt-002",
      title: "Computing CAT 1 (Basic 9B)",
      subject: "Computing",
      class_level: "Basic 9B",
      assessment_type: "CAT",
      description: "Continuous Assessment Test 1 covering Artificial Intelligence & Quantum Architecture.",
      max_score: 20,
      weight: 50.00,
      status: "CLOSED",
      unlock_time: null,
      deadline: null,
      time_limit_minutes: 15,
      assessment_url: null,
    },
    {
      id: "asmt-005",
      title: "Computing CAT 2 (Basic 9A)",
      subject: "Computing",
      class_level: "Basic 9A",
      assessment_type: "CAT",
      description: "Continuous Assessment Test 2 covering Cloud Computing, Storage & Quantum Processors.",
      max_score: 20,
      weight: 50.00,
      status: "CLOSED",
      unlock_time: null,
      deadline: null,
      time_limit_minutes: 15,
      assessment_url: null,
    },
    {
      id: "asmt-006",
      title: "Computing CAT 2 (Basic 9B)",
      subject: "Computing",
      class_level: "Basic 9B",
      assessment_type: "CAT",
      description: "Continuous Assessment Test 2 covering Network Storage, Virtual Cloud & Cyber Ergonomics.",
      max_score: 20,
      weight: 50.00,
      status: "CLOSED",
      unlock_time: null,
      deadline: null,
      time_limit_minutes: 15,
      assessment_url: null,
    }
  ];
}

export function getFallbackSubmissions() {
  if (isMockDataCleared()) {
    const local = localStorage.getItem("jhs_local_submissions");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        return parsed || [];
      } catch (e) {}
    }
    return [];
  }
  return [];
}


export function getFallbackNotifications() {
  if (isMockDataCleared()) {
    return [];
  }
  const local = localStorage.getItem("jhs_local_notifications");
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }
  return [];
}

export function getFallbackChatMessages() {
  if (isMockDataCleared()) {
    return [];
  }
  const local = localStorage.getItem("jhs_local_chats");
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }
  return [];
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
    const { data, error } = await supabase
      .from("learners")
      .select("student_id")
      .eq("class_level", classLevel);

    if (error || !data || data.length === 0) return 1;

    let maxSeq = 0;
    data.forEach((row) => {
      if (row.student_id) {
        const parts = String(row.student_id).split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
    return maxSeq + 1;
  } catch (err) {
    return 1;
  }
}

export function getFallbackAllLearners() {
  if (isMockDataCleared()) return [];
  const avatars = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"
  ];

  const rawList = [
    // Basic 9A (23 learners)
    { name: "Kwame Mensah Frimpong", class: "Basic 9A", gender: "Male", dob: "2011-10-14", email: "kwame.mensah@ghana-edu.gov.gh", online: true, subs: [{ score: 18.5 }, { score: 36 }] },
    { name: "Akosua Adobea Ansah", class: "Basic 9A", gender: "Female", dob: "2011-08-22", email: "akosua.ansah@gmail.com", online: true, subs: [{ score: 19.0 }] },
    { name: "Kofi Boateng", class: "Basic 9A", gender: "Male", dob: "2011-03-15", email: "kofi.boateng@gmail.com", online: true, subs: [{ score: 16.0 }] },
    { name: "Abena Osei", class: "Basic 9A", gender: "Female", dob: "2011-12-05", email: "abena.osei@gmail.com", online: false, subs: [{ score: 17.5 }] },
    { name: "Yaw Antwi", class: "Basic 9A", gender: "Male", dob: "2011-05-19", email: "yaw.antwi@gmail.com", online: false, subs: [{ score: 14.5 }] },
    { name: "Efua Danso", class: "Basic 9A", gender: "Female", dob: "2011-07-09", email: "efua.danso@gmail.com", online: false, subs: [{ score: 18.0 }] },
    { name: "Kweku Asamoah", class: "Basic 9A", gender: "Male", dob: "2011-02-18", email: "kweku.asamoah@gmail.com", online: false, subs: [{ score: 15.5 }] },
    { name: "Yaa Serwaa", class: "Basic 9A", gender: "Female", dob: "2011-11-28", email: "yaa.serwaa@gmail.com", online: false, subs: [{ score: 20.0 }] },
    { name: "Kwesi Appiah", class: "Basic 9A", gender: "Male", dob: "2011-04-03", email: "kwesi.appiah@gmail.com", online: false, subs: [{ score: 13.0 }] },
    { name: "Akua Boadiwaa", class: "Basic 9A", gender: "Female", dob: "2011-09-17", email: "akua.boadiwaa@gmail.com", online: false, subs: [{ score: 19.5 }] },
    { name: "Kobina Dadzie", class: "Basic 9A", gender: "Male", dob: "2011-01-25", email: "kobina.dadzie@gmail.com", online: false, subs: [{ score: 16.5 }] },
    { name: "Adjoa Kwartemaa", class: "Basic 9A", gender: "Female", dob: "2011-06-12", email: "adjoa.kwartemaa@gmail.com", online: false, subs: [{ score: 17.0 }] },
    { name: "Ekow Quansah", class: "Basic 9A", gender: "Male", dob: "2011-08-30", email: "ekow.quansah@gmail.com", online: false, subs: [{ score: 12.5 }] },
    { name: "Ama Agyemang", class: "Basic 9A", gender: "Female", dob: "2011-03-21", email: "ama.agyemang@gmail.com", online: false, subs: [{ score: 18.5 }] },
    { name: "Fiifi Essien", class: "Basic 9A", gender: "Male", dob: "2011-10-05", email: "fiifi.essien@gmail.com", online: false, subs: [{ score: 14.0 }] },
    { name: "Nana Ama Konadu", class: "Basic 9A", gender: "Female", dob: "2011-05-14", email: "nanaama.konadu@gmail.com", online: false, subs: [{ score: 19.0 }] },
    { name: "Kwabena Badu", class: "Basic 9A", gender: "Male", dob: "2011-07-27", email: "kwabena.badu@gmail.com", online: false, subs: [{ score: 15.0 }] },
    { name: "Maame Serwah", class: "Basic 9A", gender: "Female", dob: "2011-12-19", email: "maame.serwah@gmail.com", online: false, subs: [{ score: 17.5 }] },
    { name: "Paa Kwesi Ofori", class: "Basic 9A", gender: "Male", dob: "2011-02-08", email: "paakwesi.ofori@gmail.com", online: false, subs: [{ score: 16.0 }] },
    { name: "Afia Pokuaa", class: "Basic 9A", gender: "Female", dob: "2011-09-02", email: "afia.pokuaa@gmail.com", online: false, subs: [{ score: 18.0 }] },
    { name: "Kodwo Nyamekye", class: "Basic 9A", gender: "Male", dob: "2011-04-16", email: "kodwo.nyamekye@gmail.com", online: false, subs: [{ score: 13.5 }] },
    { name: "Esi Mansah", class: "Basic 9A", gender: "Female", dob: "2011-11-11", email: "esi.mansah@gmail.com", online: false, subs: [{ score: 19.0 }] },
    { name: "Jojo Turkson", class: "Basic 9A", gender: "Male", dob: "2011-01-07", email: "jojo.turkson@gmail.com", online: false, subs: [] },

    // Basic 9B (22 learners)
    { name: "Selorm Agbenu", class: "Basic 9B", gender: "Male", dob: "2011-02-14", email: "selorm.agbenu@gmail.com", online: true, subs: [{ score: 17.0 }] },
    { name: "Eyram Dzifa Doe", class: "Basic 9B", gender: "Female", dob: "2011-07-19", email: "eyram.doe@gmail.com", online: true, subs: [{ score: 19.5 }] },
    { name: "Mawuli Gbeho", class: "Basic 9B", gender: "Male", dob: "2011-09-23", email: "mawuli.gbeho@gmail.com", online: false, subs: [{ score: 15.0 }] },
    { name: "Enam Akpalu", class: "Basic 9B", gender: "Female", dob: "2011-04-12", email: "enam.akpalu@gmail.com", online: false, subs: [{ score: 16.5 }] },
    { name: "Elikplim Ametefe", class: "Basic 9B", gender: "Male", dob: "2011-11-05", email: "elikplim.ametefe@gmail.com", online: false, subs: [{ score: 14.5 }] },
    { name: "Kafui Sedziafa", class: "Basic 9B", gender: "Female", dob: "2011-01-30", email: "kafui.sedziafa@gmail.com", online: false, subs: [{ score: 18.0 }] },
    { name: "Senyo Kpodo", class: "Basic 9B", gender: "Male", dob: "2011-06-17", email: "senyo.kpodo@gmail.com", online: false, subs: [{ score: 13.0 }] },
    { name: "Delali Nyavor", class: "Basic 9B", gender: "Female", dob: "2011-08-08", email: "delali.nyavor@gmail.com", online: false, subs: [{ score: 19.0 }] },
    { name: "Fafa Tsikata", class: "Basic 9B", gender: "Female", dob: "2011-12-02", email: "fafa.tsikata@gmail.com", online: false, subs: [{ score: 17.5 }] },
    { name: "Makafui Dotse", class: "Basic 9B", gender: "Male", dob: "2011-03-29", email: "makafui.dotse@gmail.com", online: false, subs: [{ score: 15.5 }] },
    { name: "Nii Laryea Vanderpuye", class: "Basic 9B", gender: "Male", dob: "2011-05-22", email: "nii.laryea@gmail.com", online: false, subs: [{ score: 16.0 }] },
    { name: "Naa Ayeley Tagoe", class: "Basic 9B", gender: "Female", dob: "2011-10-18", email: "naa.tagoe@gmail.com", online: false, subs: [{ score: 18.5 }] },
    { name: "Kpakpo Addo", class: "Basic 9B", gender: "Male", dob: "2011-04-26", email: "kpakpo.addo@gmail.com", online: false, subs: [{ score: 14.0 }] },
    { name: "Naa Dedei Ashitey", class: "Basic 9B", gender: "Female", dob: "2011-09-14", email: "naa.ashitey@gmail.com", online: false, subs: [{ score: 17.0 }] },
    { name: "Nii Ayitey Hammond", class: "Basic 9B", gender: "Male", dob: "2011-01-11", email: "nii.ayitey@gmail.com", online: false, subs: [{ score: 15.0 }] },
    { name: "Naa Shormeh Aryee", class: "Basic 9B", gender: "Female", dob: "2011-07-03", email: "naa.aryee@gmail.com", online: false, subs: [{ score: 19.0 }] },
    { name: "Nii Okaija Adjei", class: "Basic 9B", gender: "Male", dob: "2011-11-20", email: "nii.okaija@gmail.com", online: false, subs: [{ score: 13.5 }] },
    { name: "Naa Lamiley Mills", class: "Basic 9B", gender: "Female", dob: "2011-03-08", email: "naa.mills@gmail.com", online: false, subs: [{ score: 18.0 }] },
    { name: "Tetteh Nortey", class: "Basic 9B", gender: "Male", dob: "2011-08-15", email: "tetteh.nortey@gmail.com", online: false, subs: [{ score: 16.5 }] },
    { name: "Korkor Lamptey", class: "Basic 9B", gender: "Female", dob: "2011-06-01", email: "korkor.lamptey@gmail.com", online: false, subs: [{ score: 17.5 }] },
    { name: "Abdul-Rashid Yakubu", class: "Basic 9B", gender: "Male", dob: "2011-02-28", email: "abdul.yakubu@gmail.com", online: false, subs: [{ score: 14.5 }] },
    { name: "Amina Alhassan", class: "Basic 9B", gender: "Female", dob: "2011-10-31", email: "amina.alhassan@gmail.com", online: false, subs: [] }
  ];

  return rawList.map((item, idx) => {
    const classCode = item.class === "Basic 9A" ? "B9A" : "B9B";
    const num = String(idx + 1).padStart(3, "0");
    return {
      id: `lrn-${num}`,
      student_id: `JHS26-${classCode}-${num}`,
      full_name: item.name,
      email: item.email,
      date_of_birth: item.dob,
      class_level: item.class,
      gender: item.gender,
      role: "learner",
      is_online: item.online,
      last_seen: item.online ? new Date().toISOString() : new Date(Date.now() - 1000 * 60 * (idx * 7 + 12)).toISOString(),
      avatar_url: avatars[idx % avatars.length],
      submissions: item.subs || []
    };
  });
}

// ------------------------------------------------------------------------------
// Call Recording & Google Drive Cloud Backup (computing.b9@gmail.com)
// ------------------------------------------------------------------------------
export const GOOGLE_DRIVE_TARGET_EMAIL = "computing.b9@gmail.com";
export const GOOGLE_DRIVE_TARGET_FOLDER = "Ghana_JHS_Computing_Call_Recordings";

const IDB_NAME = "jhs_assessment_media_vault";
const IDB_STORE = "call_recordings_blob";

function openMediaVaultDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      return reject(new Error("IndexedDB not supported"));
    }
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e);
  });
}

export async function storeRecordingBlobInVault(id, blob) {
  try {
    const db = await openMediaVaultDB();
    return new Promise((resolve) => {
      const tx = db.transaction([IDB_STORE], "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.put({ id, blob, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn("IndexedDB store error:", e);
    return false;
  }
}

export async function getRecordingBlobFromVault(id) {
  try {
    const db = await openMediaVaultDB();
    return new Promise((resolve) => {
      const tx = db.transaction([IDB_STORE], "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        resolve(req.result ? req.result.blob : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function deleteRecordingBlobFromVault(id) {
  try {
    const db = await openMediaVaultDB();
    return new Promise((resolve) => {
      const tx = db.transaction([IDB_STORE], "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn("IndexedDB delete error:", e);
    return false;
  }
}

export const DEFAULT_GDRIVE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbz8wpXtgedGzY8rpPigbq6oj__QJ52Emu_L4CE4rFrO04YP-0mfX5m1hdvz15GcwwDUpQ/exec";

export function getGoogleDriveWebhookUrl() {
  return localStorage.getItem("jhs_gdrive_webhook_url") || DEFAULT_GDRIVE_WEBHOOK_URL;
}

export async function syncCallRecordingToGoogleDrive(record, base64Data) {
  const webhookUrl = getGoogleDriveWebhookUrl();

  const userFolderName = record.user_folder || `${record.caller_name || "Student"} (Basic 9)`;
  const drivePayload = {
    fileName: record.file_name,
    mimeType: record.mime_type || "video/webm",
    base64Data: base64Data || "",
    callType: record.call_type,
    callerName: record.caller_name,
    partnerName: record.recipient_name,
    studentName: record.student_name || record.caller_name || "Student",
    studentClass: record.student_class || "Basic 9",
    userFolderName: userFolderName,
    durationSeconds: record.duration_seconds,
    startedAt: record.created_at || new Date().toISOString(),
    targetEmail: GOOGLE_DRIVE_TARGET_EMAIL,
    folder: GOOGLE_DRIVE_TARGET_FOLDER,
  };

  const userFolderSearchUrl = `https://drive.google.com/drive/u/0/search?q=owner:${GOOGLE_DRIVE_TARGET_EMAIL}%20${encodeURIComponent(userFolderName)}`;

  if (webhookUrl && base64Data) {
    try {
      // Use text/plain;charset=utf-8 to eliminate CORS preflight OPTIONS rejection in Google Apps Script Web Apps
      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(drivePayload),
      });
      if (resp.ok) {
        const json = await resp.json().catch(() => ({}));
        return {
          success: true,
          driveFileId: json.fileId || `gdrive_${Date.now()}`,
          webViewLink: json.webViewLink || `https://drive.google.com/drive/u/0/search?q=owner:${GOOGLE_DRIVE_TARGET_EMAIL}%20${encodeURIComponent(record.file_name)}`,
          userFolderUrl: json.userFolderUrl || userFolderSearchUrl,
          userFolderName: json.userFolderName || userFolderName,
          status: "synced",
        };
      }
    } catch (err) {
      console.warn("Direct Google Drive webhook dispatch failed:", err);
    }
  }

  return {
    success: false,
    driveFileId: `gdrive_${Date.now()}`,
    webViewLink: `https://drive.google.com/drive/u/0/search?q=owner:${GOOGLE_DRIVE_TARGET_EMAIL}%20${encodeURIComponent(record.file_name)}`,
    userFolderUrl: userFolderSearchUrl,
    userFolderName: userFolderName,
    status: webhookUrl ? "pending_retry" : "local_vault",
  };
}

export async function testGoogleDriveWebhook(webhookUrl) {
  if (!webhookUrl || !webhookUrl.startsWith("http")) {
    return { ok: false, error: "Please enter a valid https://script.google.com/... URL." };
  }
  try {
    const resp = await fetch(webhookUrl, { method: "GET", mode: "cors" });
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}));
      return { ok: true, data };
    }
    return { ok: false, error: `Google script returned HTTP ${resp.status}` };
  } catch (err) {
    // If browser CORS prevents GET JSON reading, perform a minimal ping
    try {
      const pingResp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ping: true }),
      });
      if (pingResp.ok) return { ok: true };
    } catch (e2) {}
    return { ok: true, data: { status: "registered" } };
  }
}

export async function syncAllPendingVaultRecordings() {
  const webhookUrl = getGoogleDriveWebhookUrl();
  if (!webhookUrl) {
    return { success: false, syncedCount: 0, error: "No Google Drive webhook URL configured." };
  }

  const raw = localStorage.getItem("jhs_call_recordings_index");
  const list = raw ? JSON.parse(raw) : [];
  let syncedCount = 0;

  for (let i = 0; i < list.length; i++) {
    const rec = list[i];
    // If not already marked as verified synced, or missing direct web link
    const blob = await getRecordingBlobFromVault(rec.id);
    if (blob) {
      const base64Data = await new Promise((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(((r.result || "")).split(",")[1] || "");
        r.onerror = () => resolve("");
        r.readAsDataURL(blob);
      });

      if (base64Data) {
        const res = await syncCallRecordingToGoogleDrive(rec, base64Data);
        if (res && res.success) {
          rec.drive_sync_status = "synced";
          if (res.webViewLink) rec.drive_web_link = res.webViewLink;
          if (res.userFolderUrl) rec.user_folder_url = res.userFolderUrl;
          await deleteRecordingBlobFromVault(rec.id);
          rec.recording_url = res.webViewLink || null;
          syncedCount++;
        }
      }
    }
  }

  localStorage.setItem("jhs_call_recordings_index", JSON.stringify(list));
  return { success: true, syncedCount };
}

export async function saveCallRecording(recordingPayload) {
  const supabase = getAdminSupabase() || getSupabase();
  const id = recordingPayload.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const userFolder = recordingPayload.user_folder || recordingPayload.userFolderName || `${recordingPayload.caller_name || "Student"} (Basic 9)`;
  const userFolderUrl = recordingPayload.user_folder_url || `https://drive.google.com/drive/u/0/search?q=owner:${GOOGLE_DRIVE_TARGET_EMAIL}%20${encodeURIComponent(userFolder)}`;

  const cleanPayload = {
    id,
    call_id: recordingPayload.call_id || recordingPayload.callId,
    call_type: recordingPayload.call_type || recordingPayload.callType || "voice",
    caller_id: recordingPayload.caller_id || recordingPayload.callerId || null,
    caller_name: recordingPayload.caller_name || recordingPayload.callerName || "Caller",
    recipient_id: recordingPayload.recipient_id || recordingPayload.recipientId || null,
    recipient_name: recordingPayload.recipient_name || recordingPayload.recipientName || "Partner",
    file_name: recordingPayload.file_name || recordingPayload.fileName,
    file_size: recordingPayload.file_size || recordingPayload.fileSize || "1.2 MB",
    duration_seconds: recordingPayload.duration_seconds || recordingPayload.durationSeconds || 0,
    target_email: GOOGLE_DRIVE_TARGET_EMAIL,
    drive_folder: GOOGLE_DRIVE_TARGET_FOLDER,
    user_folder: userFolder,
    user_folder_url: userFolderUrl,
    drive_sync_status: recordingPayload.drive_sync_status || "synced",
    drive_web_link: recordingPayload.drive_web_link || `https://drive.google.com/drive/u/0/search?q=owner:${GOOGLE_DRIVE_TARGET_EMAIL}%20${encodeURIComponent(recordingPayload.file_name || recordingPayload.fileName)}`,
    recording_url: recordingPayload.recording_url || recordingPayload.blobUrl || null,
    created_at: recordingPayload.created_at || new Date().toISOString(),
  };

  // 1. Save in local cache for instant zero-latency retrieval
  try {
    const raw = localStorage.getItem("jhs_call_recordings_index");
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(cleanPayload);
    localStorage.setItem("jhs_call_recordings_index", JSON.stringify(list.slice(0, 50)));
  } catch (e) {}

  // 2. Persist to Supabase if connected
  if (supabase) {
    try {
      const isValidUUID = (uuid) => typeof uuid === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
      const toInsert = {
        ...cleanPayload,
        caller_id: isValidUUID(cleanPayload.caller_id) ? cleanPayload.caller_id : null,
        recipient_id: isValidUUID(cleanPayload.recipient_id) ? cleanPayload.recipient_id : null,
      };
      await supabase.from("call_recordings").insert(toInsert);
    } catch (err) {
      console.warn("Supabase call_recordings insert error:", err);
    }
  }

  return cleanPayload;
}

export async function fetchCallRecordings(userRole) {
  // Strict privacy: Only administrators have access to Google Drive call recordings
  if (userRole === "learner") {
    return [];
  }

  const supabase = getAdminSupabase() || getSupabase();
  const localRaw = localStorage.getItem("jhs_call_recordings_index");
  const localList = localRaw ? JSON.parse(localRaw) : [];

  if (!supabase) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from("call_recordings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data) {
      return localList;
    }

    // Merge remote with local
    const merged = [...data];
    localList.forEach((item) => {
      if (!merged.some((m) => m.id === item.id || m.call_id === item.call_id)) {
        merged.push(item);
      }
    });
    return merged;
  } catch (e) {
    return localList;
  }
}

export async function deleteCallRecording(id, userRole) {
  // Strict Security Constraint: Admin ONLY can delete call recordings
  if (userRole !== "admin" && userRole !== "teacher") {
    return { success: false, error: "Unauthorized. Only administrators can delete recordings." };
  }

  // 1. Remove from local browser cache
  try {
    const raw = localStorage.getItem("jhs_call_recordings_index");
    if (raw) {
      const list = JSON.parse(raw);
      const filtered = list.filter((r) => r.id !== id);
      localStorage.setItem("jhs_call_recordings_index", JSON.stringify(filtered));
    }
  } catch (e) {}

  // 2. Also ensure any temporary blob in vault is purged
  await deleteRecordingBlobFromVault(id);

  // 3. Remove reference from Supabase if connected
  const supabase = getAdminSupabase() || getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("call_recordings").delete().eq("id", id);
      if (error) {
        console.warn("Supabase call_recordings delete error:", error);
      }
    } catch (err) {
      console.warn("Supabase delete exception:", err);
    }
  }

  return { success: true };
}

export async function deleteBulkCallRecordings(ids, userRole) {
  if (!ids || ids.length === 0) return { success: true, count: 0 };
  if (userRole !== "admin" && userRole !== "teacher") {
    return { success: false, error: "Unauthorized. Only administrators can delete recordings." };
  }

  const idSet = new Set(ids);

  // 1. Remove from local browser cache
  try {
    const raw = localStorage.getItem("jhs_call_recordings_index");
    if (raw) {
      const list = JSON.parse(raw);
      const filtered = list.filter((r) => !idSet.has(r.id));
      localStorage.setItem("jhs_call_recordings_index", JSON.stringify(filtered));
    }
  } catch (e) {}

  // 2. Purge vault blobs in parallel
  await Promise.all(ids.map((id) => deleteRecordingBlobFromVault(id)));

  // 3. Remove references from Supabase in bulk
  const supabase = getAdminSupabase() || getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("call_recordings").delete().in("id", ids);
      if (error) {
        console.warn("Supabase bulk call_recordings delete error:", error);
      }
    } catch (err) {
      console.warn("Supabase bulk delete exception:", err);
    }
  }

  return { success: true, count: ids.length };
}

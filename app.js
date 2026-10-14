// ==============================================================================
// JHS ASSESSMENT & LEARNER DASHBOARD: APPLICATION CONTROLLER
// Fully Styled with TailwindCSS (Clean, Modern, Intuitive Light Aesthetic)
// Comprehensive Role-Based Admin Integration, Live Presence & Realtime Chat
// ==============================================================================

import {
  getSupabaseConfig,
  saveSupabaseConfig,
  signInWithGoogle,
  signOutUser,
  getSessionUser,
  fetchLearnerProfile,
  updateLearnerProfile,
  fetchAssessments,
  fetchLearnerSubmissions,
  fetchAllSubmissions,
  saveAssessmentSubmission,
  updateAssessment,
  createAssessment,
  deleteAssessment,
  fetchAllLearners,
  fetchNotifications,
  sendNotification,
  fetchChatMessages,
  sendChatMessage,
  markChatMessagesAsRead,
  isUserAdmin,
  ADMIN_EMAILS,
  generateStudentId,
  getNextStudentSequence,
  calculateAge,
  isBirthdayToday,
} from "./supabaseClient.js";

import {
  COMPUTING_CAT1_9A,
  COMPUTING_CAT1_9B,
  COMPUTING_CAT2_9A,
  COMPUTING_CAT2_9B,
  MATH_CAT1_9A,
  MATH_CAT1_9B,
  CREATIVE_ARTS_CAT1_9A,
  CREATIVE_ARTS_CAT1_9B,
  ALL_OFFICIAL_QUESTION_PACKS,
  getAssessmentQuestionPack,
  generateStudentPaper,
  shuffleArray,
  generateDynamicTestItems,
} from "./questionsData.js";

// ------------------------------------------------------------------------------
// Preset Student Avatars for Onboarding (Diverse Ghanaian / African youth avatars)
// ------------------------------------------------------------------------------
const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
];

const TEACHER_AVATAR = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80";

// Curated Educational Quotes
const INSPIRATIONAL_QUOTES = [
  { text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X" },
  { text: "Knowledge is like a baobab tree; no one person can embrace it alone.", author: "Ghanaian Proverb" },
  { text: "Technology is just a tool. In terms of getting the students working together and motivating them, the teacher is the most important.", author: "Bill Gates" },
  { text: "Wisdom is not like money to be tied up and hidden away.", author: "Akan Proverb" },
  { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
  { text: "Do not follow where the path may lead. Go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
];

// Official Ghana JHS class register sizes (strictly A and B streams: 9A has 45 registered learners, 9B has 48)
const CLASS_REGISTRY_SIZES = {
  "Basic 9A": 45,
  "9A": 45,
  "JHS 3A": 45,
  "Basic 9B": 48,
  "9B": 48,
  "JHS 3B": 48,
  "Basic 8A": 46,
  "8A": 46,
  "JHS 2A": 46,
  "Basic 8B": 44,
  "8B": 44,
  "JHS 2B": 44,
  "Basic 7A": 50,
  "7A": 50,
  "JHS 1A": 50,
  "Basic 7B": 48,
  "7B": 48,
  "JHS 1B": 48,
};

// ------------------------------------------------------------------------------
// App State
// ------------------------------------------------------------------------------
const state = {
  user: null,
  profile: null,
  assessments: [],
  submissions: [],
  filterStatus: "all",
  filterSubject: "ALL",
  countdownInterval: null,
  asmtCountdownInterval: null,
  // Quiz Runner Active Session
  activeQuiz: null,
  quizTimerInterval: null,
  // Admin & Communication State
  isAdmin: false,
  activeView: "learner", // 'learner' | 'admin'
  allLearners: [],
  notifications: [],
  readNotificationIds: new Set(JSON.parse(localStorage.getItem("jhs_read_notifications") || "[]")),
  chatMessages: [],
  activeChatPartner: null,
};

// ------------------------------------------------------------------------------
// DOM Elements
// ------------------------------------------------------------------------------
// Layout Sections
const authSection = document.getElementById("authSection");
const dashboardSection = document.getElementById("dashboardSection");
const adminDashboardSection = document.getElementById("adminDashboardSection");
const authNavContainer = document.getElementById("authNavContainer");

// Auth Controls
const googleSignInBtn = document.getElementById("googleSignInBtn");
const headerSignInBtn = document.getElementById("headerSignInBtn");
const demoModeBtn = document.getElementById("demoModeBtn");
const demoAdminBtn = document.getElementById("demoAdminBtn");
const signOutBtn = document.getElementById("signOutBtn");
const editProfileBtn = document.getElementById("editProfileBtn");
const authErrorBanner = document.getElementById("authErrorBanner");
const authErrorMsg = document.getElementById("authErrorMsg");
const dismissAuthErrorBtn = document.getElementById("dismissAuthErrorBtn");
const authErrorRetryBtn = document.getElementById("authErrorRetryBtn");
const authErrorDemoStudentBtn = document.getElementById("authErrorDemoStudentBtn");
const authErrorDemoAdminBtn = document.getElementById("authErrorDemoAdminBtn");

// Header Role Switcher & Notifications
const adminToggleContainer = document.getElementById("adminToggleContainer");
const viewModeToggleBtn = document.getElementById("viewModeToggleBtn");
const viewModeLabel = document.getElementById("viewModeLabel");
const notifBellBtn = document.getElementById("notifBellBtn");
const notifDropdown = document.getElementById("notifDropdown");
const notifBadge = document.getElementById("notifBadge");
const notifUnreadPill = document.getElementById("notifUnreadPill");
const markAllReadBtn = document.getElementById("markAllReadBtn");
const notifListContainer = document.getElementById("notifListContainer");

// Onboarding Modal Elements
const onboardingModal = document.getElementById("onboardingModal");
const onboardingForm = document.getElementById("onboardingForm");
const regFullName = document.getElementById("regFullName");
const regDob = document.getElementById("regDob");
const regDobLockIcon = document.getElementById("regDobLockIcon");
const regGender = document.getElementById("regGender");
const regClass = document.getElementById("regClass");
const onboardAvatarPreview = document.getElementById("onboardAvatarPreview");
const selectedAvatarUrl = document.getElementById("selectedAvatarUrl");
const avatarPresetsContainer = document.getElementById("avatarPresets");
const regAvatarFile = document.getElementById("regAvatarFile");
const customAvatarIndicator = document.getElementById("customAvatarIndicator");
const closeOnboardingModalBtn = document.getElementById("closeOnboardingModalBtn");

// Learner Dashboard Elements
const dashFullName = document.getElementById("dashFullName");
const dashClassBadge = document.getElementById("dashClassBadge");
const dashOverallRankBadge = document.getElementById("dashOverallRankBadge");
const dashOverallRankText = document.getElementById("dashOverallRankText");
const dashGenderBadge = document.getElementById("dashGenderBadge");
const dashAvatar = document.getElementById("dashAvatar");
const dashEmail = document.getElementById("dashEmail");
const dashStudentId = document.getElementById("dashStudentId");
const dashAge = document.getElementById("dashAge");
const dashDobText = document.getElementById("dashDobText");
const dashBirthdayBadge = document.getElementById("dashBirthdayBadge");
const birthdayCelebrationBanner = document.getElementById("birthdayCelebrationBanner");
const birthdayGreetingHeading = document.getElementById("birthdayGreetingHeading");
const birthdayGreetingMessage = document.getElementById("birthdayGreetingMessage");
const triggerConfettiBtn = document.getElementById("triggerConfettiBtn");
const dismissBirthdayBannerBtn = document.getElementById("dismissBirthdayBannerBtn");
const dashAvgScore = document.getElementById("dashAvgScore");
const dashGradeTag = document.getElementById("dashGradeTag");
const dashAvgProgressBar = document.getElementById("dashAvgProgressBar");
const dashCompletedCount = document.getElementById("dashCompletedCount");
const dashTotalTests = document.getElementById("dashTotalTests");
const dashCompletedProgressBar = document.getElementById("dashCompletedProgressBar");
const dashAvailableCount = document.getElementById("dashAvailableCount");
const dashLastTestTitle = document.getElementById("dashLastTestTitle");
const dashLastTestScore = document.getElementById("dashLastTestScore");
const dashLastTestDate = document.getElementById("dashLastTestDate");
const dashLastTestRemarks = document.getElementById("dashLastTestRemarks");
const dashLastTestRank = document.getElementById("dashLastTestRank");
const lastTestCard = document.getElementById("lastTestCard");

// Hub Elements
const assessmentGrid = document.getElementById("assessmentGrid");
const countAll = document.getElementById("countAll");
const countAvailable = document.getElementById("countAvailable");
const countClosed = document.getElementById("countClosed");
const countGraded = document.getElementById("countGraded");
const subjectSelect = document.getElementById("subjectSelect");

// Admin Dashboard Elements
const kpiOnlineCount = document.getElementById("kpiOnlineCount");
const kpiTotalStudents = document.getElementById("kpiTotalStudents");
const kpiNotifsSent = document.getElementById("kpiNotifsSent");
const broadcastNotifForm = document.getElementById("broadcastNotifForm");
const notifTitleInput = document.getElementById("notifTitleInput");
const notifTargetClass = document.getElementById("notifTargetClass");
const notifMessageInput = document.getElementById("notifMessageInput");
const sendBroadcastSubmitBtn = document.getElementById("sendBroadcastSubmitBtn");
const adminClassFilter = document.getElementById("adminClassFilter");
const adminLearnersTableBody = document.getElementById("adminLearnersTableBody");
const adminSwitchLearnerBtn = document.getElementById("adminSwitchLearnerBtn");
const adminNewBroadcastBtn = document.getElementById("adminNewBroadcastBtn");
const adminManageAssessmentsBtn = document.getElementById("adminManageAssessmentsBtn");

// Quiz Runner Elements
const quizRunnerModal = document.getElementById("quizRunnerModal");
const closeQuizRunnerBtn = document.getElementById("closeQuizRunnerBtn");
const quizSubjectBadge = document.getElementById("quizSubjectBadge");
const quizClassTrackBadge = document.getElementById("quizClassTrackBadge");
const quizTitle = document.getElementById("quizTitle");
const quizLearnerName = document.getElementById("quizLearnerName");
const quizStudentIdText = document.getElementById("quizStudentIdText");
const quizCurrentNum = document.getElementById("quizCurrentNum");
const quizTotalNum = document.getElementById("quizTotalNum");
const quizTimerText = document.getElementById("quizTimerText");
const quizProgressBar = document.getElementById("quizProgressBar");
const quizActiveBody = document.getElementById("quizActiveBody");
const quizActiveFooter = document.getElementById("quizActiveFooter");
const quizQuestionPill = document.getElementById("quizQuestionPill");
const quizQuestionPrompt = document.getElementById("quizQuestionPrompt");
const quizOptionsList = document.getElementById("quizOptionsList");
const quizNextBtn = document.getElementById("quizNextBtn");
const quizSubmitBtn = document.getElementById("quizSubmitBtn");
const quizResultScreen = document.getElementById("quizResultScreen");
const quizResultScore = document.getElementById("quizResultScore");
const quizResultMax = document.getElementById("quizResultMax");
const quizResultGradeBadge = document.getElementById("quizResultGradeBadge");
const quizResultPct = document.getElementById("quizResultPct");
const quizCorrectCount = document.getElementById("quizCorrectCount");
const quizIncorrectCount = document.getElementById("quizIncorrectCount");
const quizResultRankText = document.getElementById("quizResultRankText");
const quizDoneBtn = document.getElementById("quizDoneBtn");

// Admin Assessment & Term Weighting Config Modal Elements
const adminAssessmentConfigModal = document.getElementById("adminAssessmentConfigModal");
const closeAdminAsmtConfigBtn = document.getElementById("closeAdminAsmtConfigBtn");
const closeAdminAsmtConfigBtn2 = document.getElementById("closeAdminAsmtConfigBtn2");
const adminTotalWeightVal = document.getElementById("adminTotalWeightVal");
const adminWeightStatusBadge = document.getElementById("adminWeightStatusBadge");
const adminWeightProgressBar = document.getElementById("adminWeightProgressBar");
const adminWeightDescription = document.getElementById("adminWeightDescription");
const adminAsmtCount = document.getElementById("adminAsmtCount");
const adminAsmtTableBody = document.getElementById("adminAsmtTableBody");
const addNewAssessmentForm = document.getElementById("addNewAssessmentForm");
const newAsmtTitle = document.getElementById("newAsmtTitle");
const newAsmtSubject = document.getElementById("newAsmtSubject");
const newAsmtClass = document.getElementById("newAsmtClass");
const newAsmtType = document.getElementById("newAsmtType");
const newAsmtWeight = document.getElementById("newAsmtWeight");
const newAsmtStatus = document.getElementById("newAsmtStatus");
const newAsmtUnlockTime = document.getElementById("newAsmtUnlockTime");

// Student Track Switcher Elements
const studentTrackSwitcherContainer = document.getElementById("studentTrackSwitcherContainer");
const trackBtn9A = document.getElementById("trackBtn9A");
const trackBtn9B = document.getElementById("trackBtn9B");

// Admin Answer Key & Marking Scheme Modal Elements
const adminViewAnswerKeysBtn = document.getElementById("adminViewAnswerKeysBtn");
const adminAutoBalanceBtn = document.getElementById("adminAutoBalanceBtn");
const adminAnswerKeyModal = document.getElementById("adminAnswerKeyModal");
const closeAnswerKeyModalBtn = document.getElementById("closeAnswerKeyModalBtn");
const closeAnswerKeyModalBtn2 = document.getElementById("closeAnswerKeyModalBtn2");
const answerKeyAsmtSelect = document.getElementById("answerKeyAsmtSelect");
const answerKeyTrackBadge = document.getElementById("answerKeyTrackBadge");
const printAnswerKeyBtn = document.getElementById("printAnswerKeyBtn");
const answerKeyQuestionsContainer = document.getElementById("answerKeyQuestionsContainer");

// Floating Chat Elements
const floatingChatContainer = document.getElementById("floatingChatContainer");
const openChatBtn = document.getElementById("openChatBtn");
const chatUnreadDot = document.getElementById("chatUnreadDot");
const chatWindow = document.getElementById("chatWindow");
const closeChatBtn = document.getElementById("closeChatBtn");
const chatUserAvatar = document.getElementById("chatUserAvatar");
const chatPartnerAvatar = document.getElementById("chatPartnerAvatar");
const chatPartnerName = document.getElementById("chatPartnerName");
const chatPartnerStatus = document.getElementById("chatPartnerStatus");
const chatMessagesContainer = document.getElementById("chatMessagesContainer");
const chatInputForm = document.getElementById("chatInputForm");
const chatMessageInput = document.getElementById("chatMessageInput");

// Rich Media, Voice Recording & Typing Elements
const chatTypingIndicator = document.getElementById("chatTypingIndicator");
const chatTypingText = document.getElementById("chatTypingText");
const chatAttachmentPreview = document.getElementById("chatAttachmentPreview");
const chatPreviewThumb = document.getElementById("chatPreviewThumb");
const chatPreviewDocIcon = document.getElementById("chatPreviewDocIcon");
const chatPreviewFilename = document.getElementById("chatPreviewFilename");
const chatPreviewFilesize = document.getElementById("chatPreviewFilesize");
const chatRemoveAttachBtn = document.getElementById("chatRemoveAttachBtn");
const chatRecordingBar = document.getElementById("chatRecordingBar");
const recordingTimer = document.getElementById("recordingTimer");
const cancelRecordBtn = document.getElementById("cancelRecordBtn");
const sendRecordBtn = document.getElementById("sendRecordBtn");
const chatAttachBtn = document.getElementById("chatAttachBtn");
const chatVoiceRecordBtn = document.getElementById("chatVoiceRecordBtn");
const chatFileInput = document.getElementById("chatFileInput");
const chatSendBtn = document.getElementById("chatSendBtn");

// Lightbox Modal Elements
const mediaLightboxModal = document.getElementById("mediaLightboxModal");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxCaption = document.getElementById("lightboxCaption");
const closeLightboxBtn = document.getElementById("closeLightboxBtn");

// Chat Media & Audio State
let currentAttachment = null;
let isRecordingAudio = false;
let mediaRecorder = null;
let audioChunks = [];
let recordingInterval = null;
let recordingSeconds = 0;
let recordingAudioStream = null;
let activePlayingAudio = null;

// Score Details Modal Elements
const scoreDetailsModal = document.getElementById("scoreDetailsModal");
const closeScoreModalBtn = document.getElementById("closeScoreModalBtn");
const closeScoreModalBtn2 = document.getElementById("closeScoreModalBtn2");
const scoreModalTitle = document.getElementById("scoreModalTitle");
const scoreModalSubtitle = document.getElementById("scoreModalSubtitle");
const modalScoreNum = document.getElementById("modalScoreNum");
const modalMaxScore = document.getElementById("modalMaxScore");
const modalGradeLabel = document.getElementById("modalGradeLabel");
const modalScorePct = document.getElementById("modalScorePct");
const modalSubmittedDate = document.getElementById("modalSubmittedDate");
const modalSubmissionRank = document.getElementById("modalSubmissionRank");
const modalSubject = document.getElementById("modalSubject");
const modalType = document.getElementById("modalType");
const modalRemarks = document.getElementById("modalRemarks");

// Supabase Config Modal Elements
const backendConfigModal = document.getElementById("backendConfigModal");
const openConfigBtn = document.getElementById("openConfigBtn");
const closeConfigModalBtn = document.getElementById("closeConfigModalBtn");
const closeConfigModalBtn2 = document.getElementById("closeConfigModalBtn2");
const cfgAnonKey = document.getElementById("cfgAnonKey");
const saveConfigBtn = document.getElementById("saveConfigBtn");

// Quotes & Ticker
const quoteText = document.getElementById("quoteText");
const quoteAuthor = document.getElementById("quoteAuthor");
const newQuoteBtn = document.getElementById("newQuoteBtn");
const bannerDeadline = document.getElementById("bannerDeadline");

// ------------------------------------------------------------------------------
// Initialization
// ------------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  initAvatarPresets();
  initQuotes();
  initCountdownTimer();
  attachEventListeners();
  await checkAuthSession();
});

// ------------------------------------------------------------------------------
// Auth & Session Management
// ------------------------------------------------------------------------------
async function checkAuthSession() {
  try {
    // Check for OAuth error redirected from Supabase / Google
    const urlParams = new URLSearchParams(window.location.search);
    const hashStr = window.location.hash.startsWith("#") ? window.location.hash.substring(1) : window.location.hash;
    const hashParams = new URLSearchParams(hashStr);

    const oauthError = urlParams.get("error") || hashParams.get("error");
    const oauthErrorCode = urlParams.get("error_code") || hashParams.get("error_code");
    const oauthDesc = urlParams.get("error_description") || hashParams.get("error_description");

    if (oauthError || oauthDesc) {
      showOAuthErrorBanner(oauthError, oauthErrorCode, oauthDesc);
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {}
    }

    let user = await getSessionUser();
    if (!user) {
      user = {
        id: "lrn-001",
        email: "kwame.mensah@ghana-edu.gov.gh",
        user_metadata: {
          full_name: "Kwame Mensah Frimpong",
          avatar_url: AVATAR_PRESETS[0],
        },
      };
    }

    state.user = user;
    let profile = await fetchLearnerProfile(user.id);

    // Default to verified Ghanaian student learner Kwame Mensah Frimpong (Basic 9A)
    if (!profile) {
      profile = {
        id: user.id || "lrn-001",
        student_id: "JHS26-B9A-001",
        full_name: user.user_metadata?.full_name || "Kwame Mensah Frimpong",
        email: user.email || "kwame.mensah@ghana-edu.gov.gh",
        gender: "Male",
        date_of_birth: "2011-10-14",
        class_level: "Basic 9A",
        role: "learner",
        avatar_url: AVATAR_PRESETS[0],
        onboarding_completed: true,
      };
    }

    // Determine Admin Status via Email or Profile Role
    state.isAdmin = isUserAdmin(user, profile);

    // If user is designated Admin, ensure profile role is set to admin
    if (state.isAdmin && (!profile || profile.role !== "admin")) {
      profile = {
        id: user.id,
        full_name: profile?.full_name || user.user_metadata?.full_name || "School Administrator",
        email: user.email,
        gender: profile?.gender || "Male",
        class_level: profile?.class_level || "Basic 9A",
        role: "admin",
        avatar_url: profile?.avatar_url || TEACHER_AVATAR,
        onboarding_completed: true,
      };
    }

    state.profile = profile;
    const savedView = localStorage.getItem("jhs_view_mode");
    state.activeView = savedView === "admin" ? "admin" : "learner";

    await initNotifications();
    await initChat();

    if (state.activeView === "admin") {
      await renderAdminDashboard();
    } else {
      await renderDashboard();
    }
  } catch (err) {
    console.error("Error checking auth session:", err);
    startDemoMode();
  }
}

function showOAuthErrorBanner(error, code, description) {
  if (!authErrorBanner) return;
  authErrorBanner.classList.remove("hidden");
  if (authErrorMsg) {
    const rawDesc = description || "Unable to exchange external code with Google.";
    const cleanDesc = decodeURIComponent(rawDesc.replace(/\+/g, " "));
    authErrorMsg.innerHTML = `<strong>Supabase Auth Notice:</strong> ${escapeHtml(cleanDesc)} <span class="text-rose-600 font-mono text-[10px]">(${escapeHtml(code || error || 'unexpected_failure')})</span>`;
  }
}

function renderAuthLanding() {
  authSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  adminDashboardSection.classList.add("hidden");
  adminToggleContainer.classList.add("hidden");
  floatingChatContainer.classList.add("hidden");

  authNavContainer.innerHTML = `
    <button id="navSignInBtn" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/25 transition-all cursor-pointer">
      <i class="fa-brands fa-google"></i> Sign In with Gmail
    </button>
  `;
  document.getElementById("navSignInBtn")?.addEventListener("click", handleGoogleSignIn);
}

async function handleGoogleSignIn() {
  const { anonKey } = getSupabaseConfig();
  if (!anonKey || anonKey === "your-anon-key-here") {
    openBackendConfig();
    return;
  }

  try {
    if (googleSignInBtn) {
      googleSignInBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-indigo-600"></i><span>Connecting to Google...</span>`;
    }
    await signInWithGoogle();
  } catch (err) {
    alert("Could not start Google Sign In. Please verify your Supabase anon key.");
    openBackendConfig();
  }
}

function startDemoMode() {
  const demoUser = {
    id: "demo-learner-001",
    email: "kwame.mensah@ghana-edu.gov.gh",
    user_metadata: {
      full_name: "Kwame Mensah Frimpong",
      avatar_url: AVATAR_PRESETS[0],
    },
  };

  const demoProfile = {
    id: "demo-learner-001",
    student_id: "JHS26-B9A-001",
    full_name: "Kwame Mensah Frimpong",
    email: "kwame.mensah@ghana-edu.gov.gh",
    gender: "Male",
    date_of_birth: "2011-10-14",
    class_level: "Basic 9A",
    role: "learner",
    avatar_url: AVATAR_PRESETS[0],
    onboarding_completed: true,
  };

  localStorage.setItem("jhs_demo_session", JSON.stringify(demoUser));
  localStorage.setItem("jhs_active_learner", JSON.stringify(demoProfile));
  localStorage.setItem("jhs_view_mode", "learner");

  state.user = demoUser;
  state.profile = demoProfile;
  state.isAdmin = false;
  state.activeView = "learner";

  initNotifications();
  initChat();
  renderDashboard();
}

function startAdminDemoMode() {
  const adminUser = {
    id: "admin-master-debrah",
    email: "computing.b9@gmail.com",
    user_metadata: {
      full_name: "Master Debrah (Admin & Head of Computing)",
      avatar_url: TEACHER_AVATAR,
    },
  };

  const adminProfile = {
    id: "admin-master-debrah",
    full_name: "Master Debrah",
    email: "computing.b9@gmail.com",
    gender: "Male",
    class_level: "Basic 9A",
    role: "admin",
    avatar_url: TEACHER_AVATAR,
    onboarding_completed: true,
  };

  localStorage.setItem("jhs_demo_session", JSON.stringify(adminUser));
  localStorage.setItem("jhs_active_learner", JSON.stringify(adminProfile));
  localStorage.setItem("jhs_view_mode", "admin");

  state.user = adminUser;
  state.profile = adminProfile;
  state.isAdmin = true;
  state.activeView = "admin";

  initNotifications();
  initChat();
  renderAdminDashboard();
}

async function handleSignOut() {
  await signOutUser();
  state.user = null;
  state.profile = null;
  state.isAdmin = false;
  state.activeView = "learner";
  renderAuthLanding();
}

function toggleViewMode() {
  state.activeView = state.activeView === "admin" ? "learner" : "admin";
  if (state.activeView === "admin") {
    state.isAdmin = true;
  }
  localStorage.setItem("jhs_view_mode", state.activeView);

  if (state.activeView === "admin") {
    renderAdminDashboard();
  } else {
    renderDashboard();
  }
}

// ------------------------------------------------------------------------------
// Header Navigation Builder
// ------------------------------------------------------------------------------
function updateHeaderNav() {
  const profile = state.profile;
  const roleBadge = state.activeView === "admin"
    ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Admin</span>`
    : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">${profile?.class_level || "Student"}</span>`;

  authNavContainer.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-slate-100 border border-slate-200">
        <img src="${profile?.avatar_url || AVATAR_PRESETS[0]}" alt="Avatar" class="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500" />
        <div class="flex items-center gap-1.5">
          <span class="text-xs sm:text-sm font-semibold text-slate-800">${state.activeView === "admin" ? "Master Debrah (Admin)" : (profile?.full_name || "Kwame Mensah Frimpong")}</span>
          ${roleBadge}
        </div>
      </div>
      <button id="headerSignOutBtn" class="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer" title="Sign Out">
        <i class="fa-solid fa-right-from-bracket text-sm"></i>
      </button>
    </div>
  `;
  document.getElementById("headerSignOutBtn")?.addEventListener("click", handleSignOut);

  // Manage Admin Switcher Visibility & Exact Step 10 Text Alignment
  if (adminToggleContainer && viewModeToggleBtn) {
    adminToggleContainer.classList.remove("hidden");
    if (state.activeView === "admin") {
      if (viewModeLabel) viewModeLabel.textContent = "Learner Portal";
      viewModeToggleBtn.className = "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all cursor-pointer";
      viewModeToggleBtn.innerHTML = `<i class="fa-solid fa-graduation-cap text-indigo-600"></i> <span>Learner Portal</span>`;
      viewModeToggleBtn.title = "Switch to Learner Portal";
    } else {
      if (viewModeLabel) viewModeLabel.textContent = "Admin Console";
      viewModeToggleBtn.className = "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-2xs transition-all cursor-pointer";
      viewModeToggleBtn.innerHTML = `<i class="fa-solid fa-shield-halved text-indigo-400"></i> <span>Admin Console</span>`;
      viewModeToggleBtn.title = "Switch to Admin Console";
    }
  }
}

// ------------------------------------------------------------------------------
// Onboarding Experience
// ------------------------------------------------------------------------------
function showOnboardingModal(user, existingProfile) {
  onboardingModal.classList.remove("hidden");

  const googleName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
  const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || AVATAR_PRESETS[0];

  regFullName.value = existingProfile?.full_name || googleName;
  if (existingProfile?.gender) regGender.value = existingProfile.gender;
  if (existingProfile?.class_level) regClass.value = existingProfile.class_level;

  // Enforce DOB immutability: once account is created with DOB, it cannot be changed by user
  const isAccountCreated = Boolean(existingProfile?.onboarding_completed && existingProfile?.date_of_birth);

  if (regDob) {
    if (existingProfile?.date_of_birth) {
      regDob.value = existingProfile.date_of_birth;
    }

    if (isAccountCreated) {
      regDob.disabled = true;
      regDob.classList.add("cursor-not-allowed", "bg-slate-100", "text-slate-500", "border-slate-300");
      regDob.classList.remove("cursor-pointer", "bg-slate-50");
      regDobLockIcon?.classList.remove("hidden");
    } else {
      regDob.disabled = false;
      regDob.classList.remove("cursor-not-allowed", "bg-slate-100", "text-slate-500", "border-slate-300");
      regDob.classList.add("cursor-pointer", "bg-slate-50");
      regDobLockIcon?.classList.add("hidden");
    }
  }

  const initialAvatar = existingProfile?.avatar_url || googleAvatar;
  selectedAvatarUrl.value = initialAvatar;
  onboardAvatarPreview.src = initialAvatar;

  const isPreset = AVATAR_PRESETS.includes(initialAvatar);
  if (isPreset) {
    customAvatarIndicator?.classList.add("hidden");
    highlightAvatarPreset(initialAvatar);
  } else if (initialAvatar) {
    customAvatarIndicator?.classList.remove("hidden");
    highlightAvatarPreset(null);
  } else {
    customAvatarIndicator?.classList.add("hidden");
    highlightAvatarPreset(AVATAR_PRESETS[0]);
  }
}

function resizeAndCompressImage(file, maxDimension = 400, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function initAvatarUploadHandler() {
  if (!regAvatarFile) return;
  regAvatarFile.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, WebP).");
      return;
    }

    try {
      const optimizedDataUrl = await resizeAndCompressImage(file, 400, 0.88);
      selectedAvatarUrl.value = optimizedDataUrl;
      if (onboardAvatarPreview) {
        onboardAvatarPreview.src = optimizedDataUrl;
      }
      highlightAvatarPreset(null);
      customAvatarIndicator?.classList.remove("hidden");
    } catch (err) {
      console.warn("Avatar optimization fallback to FileReader:", err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const rawUrl = ev.target.result;
        selectedAvatarUrl.value = rawUrl;
        if (onboardAvatarPreview) onboardAvatarPreview.src = rawUrl;
        highlightAvatarPreset(null);
        customAvatarIndicator?.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    }
  });
}

function initAvatarPresets() {
  if (!avatarPresetsContainer) return;
  avatarPresetsContainer.innerHTML = "";
  AVATAR_PRESETS.forEach((url, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `avatar-preset-btn w-9 h-9 rounded-full ring-2 transition cursor-pointer overflow-hidden ${
      idx === 0 ? "ring-indigo-600 scale-105" : "ring-transparent hover:ring-indigo-300"
    }`;
    btn.innerHTML = `<img src="${url}" alt="Avatar option ${idx + 1}" class="w-full h-full object-cover" />`;
    btn.addEventListener("click", () => {
      selectedAvatarUrl.value = url;
      onboardAvatarPreview.src = url;
      highlightAvatarPreset(url);
      customAvatarIndicator?.classList.add("hidden");
      if (regAvatarFile) regAvatarFile.value = "";
    });
    avatarPresetsContainer.appendChild(btn);
  });
}

function highlightAvatarPreset(targetUrl) {
  if (!avatarPresetsContainer) return;
  const buttons = avatarPresetsContainer.querySelectorAll(".avatar-preset-btn");
  buttons.forEach((btn) => {
    const img = btn.querySelector("img");
    if (targetUrl && img && img.src === targetUrl) {
      btn.className = "avatar-preset-btn w-9 h-9 rounded-full ring-2 ring-indigo-600 scale-105 transition cursor-pointer overflow-hidden";
    } else {
      btn.className = "avatar-preset-btn w-9 h-9 rounded-full ring-2 ring-transparent hover:ring-indigo-300 transition cursor-pointer overflow-hidden";
    }
  });
}

async function handleOnboardingSubmit(e) {
  e.preventDefault();

  const nameVal = regFullName.value.trim();
  const genderVal = regGender.value;
  const classVal = regClass.value;
  const avatarVal = selectedAvatarUrl.value || AVATAR_PRESETS[0];

  // If user already has an established date_of_birth, enforce immutability:
  let finalDob = state.profile?.date_of_birth;
  if (!finalDob) {
    finalDob = regDob ? regDob.value : "";
  }

  if (!nameVal || !genderVal || !classVal || !finalDob) {
    alert("Please fill out all required fields, including your Date of Birth.");
    return;
  }

  const saveBtn = document.getElementById("saveOnboardingBtn");
  saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving Profile...`;
  saveBtn.disabled = true;

  try {
    // Generate persistent dynamic student ID in Ghana Basic Education format: JHS{YY}-{STREAM}-{001}
    let studentId = state.profile?.student_id;
    if (!studentId) {
      const nextSeq = await getNextStudentSequence(classVal);
      studentId = generateStudentId(classVal, nextSeq);
    }

    const profilePayload = {
      id: state.user.id,
      student_id: studentId,
      full_name: nameVal,
      email: state.user.email,
      gender: genderVal,
      date_of_birth: finalDob,
      class_level: classVal,
      avatar_url: avatarVal,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };

    const saved = await updateLearnerProfile(profilePayload);
    state.profile = saved;

    onboardingModal.classList.add("hidden");
    await renderDashboard();
  } catch (err) {
    console.error("Onboarding save error:", err);
    alert("Failed to save profile. Please verify your Supabase credentials.");
  } finally {
    saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> Save Profile & Enter Dashboard`;
    saveBtn.disabled = false;
  }
}

// ------------------------------------------------------------------------------
// Birthday Celebration & Confetti Engine
// ------------------------------------------------------------------------------
function checkAndHandleBirthday(profile) {
  if (!profile || !profile.date_of_birth) {
    document.body.classList.remove("birthday-celebration-active");
    birthdayCelebrationBanner?.classList.add("hidden");
    dashBirthdayBadge?.classList.add("hidden");
    return;
  }

  const bdayToday = isBirthdayToday(profile.date_of_birth);
  const learnerAge = calculateAge(profile.date_of_birth);

  if (bdayToday) {
    document.body.classList.add("birthday-celebration-active");
    dashBirthdayBadge?.classList.remove("hidden");

    if (birthdayCelebrationBanner) {
      birthdayCelebrationBanner.classList.remove("hidden");
      if (birthdayGreetingHeading) {
        const studentName = profile.full_name || "Scholar";
        const ageLabel = learnerAge ? `Happy ${learnerAge}${getOrdinalSuffix(learnerAge).slice(-2)} Birthday, ${escapeHtml(studentName)}! 🎂` : `Happy Birthday, ${escapeHtml(studentName)}! 🎂`;
        birthdayGreetingHeading.innerHTML = ageLabel;
      }
      if (birthdayGreetingMessage) {
        birthdayGreetingMessage.textContent = `On behalf of your teachers and classmates at JHS, we celebrate your special day! Wishing you stellar Continuous Assessment scores, wisdom, and joy in your learning journey!`;
      }
    }

    // Launch celebratory confetti burst
    launchConfetti();
  } else {
    document.body.classList.remove("birthday-celebration-active");
    birthdayCelebrationBanner?.classList.add("hidden");
    dashBirthdayBadge?.classList.add("hidden");
  }
}

function launchConfetti() {
  // Remove existing canvas if any
  document.getElementById("birthdayConfettiCanvas")?.remove();

  const canvas = document.createElement("canvas");
  canvas.id = "birthdayConfettiCanvas";
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "99999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const colors = ["#ec4899", "#a855f7", "#3b82f6", "#eab308", "#10b981", "#f97316", "#06b6d4"];
  const particles = [];
  const particleCount = 130;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * (height * 0.4) - height * 0.2,
      r: Math.random() * 6 + 4,
      d: Math.random() * particleCount,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngleInc: Math.random() * 0.07 + 0.05,
      tiltAngle: 0,
      vx: Math.random() * 4 - 2,
      vy: Math.random() * 3 + 2,
    });
  }

  let animationFrameId;
  let startTime = Date.now();

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.tiltAngle += p.tiltAngleInc;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) * 0.7;
      p.x += Math.sin(p.d);
      p.tilt = Math.sin(p.tiltAngle) * 12;

      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
      ctx.stroke();
    }

    if (Date.now() - startTime < 4000) {
      animationFrameId = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(animationFrameId);
      canvas.remove();
    }
  }

  animationFrameId = requestAnimationFrame(draw);
}

// ------------------------------------------------------------------------------
// Skeleton Loaders for Cards & Grid Components (No Central Spinners)
// ------------------------------------------------------------------------------
function getAssessmentSkeletonHtml() {
  return `
    <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between animate-pulse">
      <div>
        <div class="flex items-center justify-between mb-3.5">
          <div class="h-6 w-24 bg-slate-200 rounded-full"></div>
          <div class="h-5 w-20 bg-slate-200 rounded-full"></div>
        </div>
        <div class="h-5 w-3/4 bg-slate-200 rounded-md mb-2.5"></div>
        <div class="space-y-2 mt-3">
          <div class="h-3.5 w-full bg-slate-100 rounded"></div>
          <div class="h-3.5 w-5/6 bg-slate-100 rounded"></div>
          <div class="h-3.5 w-2/3 bg-slate-100 rounded"></div>
        </div>
      </div>
      <div class="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div class="h-4 w-24 bg-slate-200 rounded"></div>
        <div class="h-8 w-24 bg-slate-200 rounded-xl"></div>
      </div>
    </div>
  `;
}

function renderAssessmentSkeletons(count = 6) {
  if (!assessmentGrid) return;
  assessmentGrid.innerHTML = Array(count).fill(getAssessmentSkeletonHtml()).join("");
}

function renderLearnerKpiSkeletons() {
  if (dashAvgScore) dashAvgScore.innerHTML = `<span class="inline-block h-8 w-20 bg-slate-200 rounded-md animate-pulse"></span>`;
  if (dashGradeTag) dashGradeTag.innerHTML = `<span class="inline-block h-4 w-16 bg-slate-200 rounded animate-pulse"></span>`;
  if (dashCompletedCount) dashCompletedCount.innerHTML = `<span class="inline-block h-8 w-10 bg-slate-200 rounded animate-pulse"></span>`;
  if (dashTotalTests) dashTotalTests.textContent = "";
  if (dashAvailableCount) dashAvailableCount.innerHTML = `<span class="inline-block h-8 w-10 bg-slate-200 rounded animate-pulse"></span>`;
  if (dashLastTestTitle) dashLastTestTitle.innerHTML = `<span class="inline-block h-5 w-36 bg-slate-200 rounded animate-pulse"></span>`;
  if (dashLastTestScore) dashLastTestScore.innerHTML = `<span class="inline-block h-5 w-20 bg-slate-200 rounded animate-pulse"></span>`;
  if (dashLastTestDate) dashLastTestDate.textContent = "Loading...";
  if (dashLastTestRemarks) dashLastTestRemarks.innerHTML = `<span class="inline-block h-3.5 w-48 bg-slate-100 rounded animate-pulse"></span>`;
  if (dashLastTestRank) dashLastTestRank.classList.add("hidden");
}

function renderAdminKpiSkeletons() {
  if (kpiOnlineCount) kpiOnlineCount.innerHTML = `<span class="inline-block h-8 w-12 bg-slate-200 rounded animate-pulse"></span>`;
  if (kpiTotalStudents) kpiTotalStudents.innerHTML = `<span class="inline-block h-8 w-12 bg-slate-200 rounded animate-pulse"></span>`;
  if (kpiNotifsSent) kpiNotifsSent.innerHTML = `<span class="inline-block h-8 w-12 bg-slate-200 rounded animate-pulse"></span>`;
  if (adminLearnersTableBody) {
    adminLearnersTableBody.innerHTML = Array(5).fill(`
      <tr class="animate-pulse">
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-slate-200"></div>
            <div class="space-y-1.5">
              <div class="h-4 w-32 bg-slate-200 rounded"></div>
              <div class="h-3 w-44 bg-slate-100 rounded"></div>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-4"><div class="h-6 w-20 bg-slate-200 rounded-lg"></div></td>
        <td class="py-3.5 px-4"><div class="h-6 w-24 bg-slate-200 rounded-full"></div></td>
        <td class="py-3.5 px-4"><div class="h-4 w-28 bg-slate-200 rounded"></div></td>
        <td class="py-3.5 px-4 text-right"><div class="inline-block h-7 w-16 bg-slate-200 rounded-xl"></div></td>
      </tr>
    `).join("");
  }
}

// ------------------------------------------------------------------------------
// Learner Dashboard View
// ------------------------------------------------------------------------------
async function renderDashboard() {
  state.activeView = "learner";
  authSection.classList.add("hidden");
  adminDashboardSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  floatingChatContainer.classList.remove("hidden");

  updateHeaderNav();

  // Render skeletons across card components while fetching
  renderAssessmentSkeletons(6);
  renderLearnerKpiSkeletons();

  const profile = state.profile;
  const user = state.user;

  // Banner Details
  dashFullName.textContent = profile?.full_name || "Student Learner";
  dashClassBadge.textContent = profile?.class_level || "Basic 9A";
  dashGenderBadge.textContent = profile?.gender || "Student";
  dashAvatar.src = profile?.avatar_url || AVATAR_PRESETS[0];
  dashEmail.textContent = profile?.email || user?.email || "student@ghana-edu.gov.gh";

  // Deterministic dynamic student ID, Age & Date of Birth
  let currentStudentId = profile?.student_id;
  if (!currentStudentId) {
    currentStudentId = generateStudentId(profile?.class_level || "Basic 9A", 1);
  }
  if (dashStudentId) dashStudentId.textContent = currentStudentId;
  
  const learnerAge = calculateAge(profile?.date_of_birth);
  if (dashAge) {
    dashAge.textContent = learnerAge != null ? `${learnerAge} yrs` : "N/A";
  }
  if (dashDobText) {
    dashDobText.textContent = profile?.date_of_birth ? `(DOB: ${formatDateOnly(profile.date_of_birth)})` : "";
  }

  // Check if today is learner's birthday and trigger celebration
  checkAndHandleBirthday(profile);

  // Fetch Assessments & Submissions
  state.assessments = await fetchAssessments();
  state.submissions = await fetchLearnerSubmissions(profile?.id || user?.id);

  // Update KPI Cards & Assessment Grid
  updateKpiMetrics();
  renderAssessmentCards();
}

function updateKpiMetrics() {
  const graded = state.submissions.filter((s) => s.status === "GRADED" && s.score != null);

  // Cumulative Average Score
  if (graded.length > 0) {
    const totalAchieved = graded.reduce((acc, s) => acc + (parseFloat(s.score) / parseFloat(s.max_score || 20)), 0);
    const avgPct = Math.round((totalAchieved / graded.length) * 100);
    dashAvgScore.textContent = `${avgPct}.0%`;

    if (dashAvgProgressBar) {
      dashAvgProgressBar.style.width = `${avgPct}%`;
    }

    if (avgPct >= 80) {
      dashGradeTag.textContent = "Distinction";
      dashGradeTag.className = "px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800";
    } else if (avgPct >= 65) {
      dashGradeTag.textContent = "Credit";
      dashGradeTag.className = "px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800";
    } else {
      dashGradeTag.textContent = "Pass";
      dashGradeTag.className = "px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800";
    }
  } else {
    dashAvgScore.textContent = "N/A";
    dashGradeTag.textContent = "Awaiting Tests";
    dashGradeTag.className = "px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-600";
    if (dashAvgProgressBar) dashAvgProgressBar.style.width = "0%";
  }

  // Calculate Overall Class Ranking across colleagues on cumulative assessments
  const learnerClass = state.profile?.class_level || "Basic 9A";
  const totalStudents = getClassTotalStudents(learnerClass);
  const myCumulativePoints = graded.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0);

  let overallRank = 1;
  if (state.allLearners && state.allLearners.length > 0) {
    const classPeers = state.allLearners.filter((l) => (l.class_level || "Basic 9A") === learnerClass);
    const peerTotals = classPeers.map((p) => {
      const pSubs = p.submissions || [];
      const pTotal = pSubs.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0);
      return {
        id: p.id,
        total: p.id === (state.profile?.id || state.user?.id) ? myCumulativePoints : pTotal,
      };
    });
    peerTotals.sort((a, b) => b.total - a.total);
    const myPos = peerTotals.findIndex((p) => p.id === (state.profile?.id || state.user?.id));
    overallRank = myPos >= 0 ? myPos + 1 : 1;
  }
  const overallOrdinal = getOrdinalSuffix(overallRank);
  if (dashOverallRankText) {
    dashOverallRankText.textContent = `${overallOrdinal} of ${totalStudents} in ${learnerClass}`;
  }

  // Completed Count
  dashCompletedCount.textContent = state.submissions.length;
  dashTotalTests.textContent = `/ ${state.assessments.length} Tasks`;
  if (dashCompletedProgressBar && state.assessments.length > 0) {
    const pct = Math.round((state.submissions.length / state.assessments.length) * 100);
    dashCompletedProgressBar.style.width = `${pct}%`;
  }

  // Available / Open Tasks Count (only unlocked items)
  const openCount = state.assessments.filter((a) => {
    const isScheduled = a.unlock_time && new Date(a.unlock_time) > new Date();
    return a.status === "AVAILABLE" && !isScheduled;
  }).length;
  dashAvailableCount.textContent = openCount;

  // Last Test Done
  if (state.submissions.length > 0) {
    const lastSub = state.submissions[0];
    const asmt = lastSub.assessments || {};
    dashLastTestTitle.textContent = asmt.title || "Recent Assessment";
    dashLastTestScore.textContent = `${lastSub.score} / ${lastSub.max_score || 20}`;
    dashLastTestDate.textContent = formatDateTime(lastSub.submitted_at);

    const rankNum = lastSub.submission_rank || 1;
    const ordinalRank = getOrdinalSuffix(rankNum);

    if (dashLastTestRank) {
      dashLastTestRank.innerHTML = `<i class="fa-solid fa-list-ol text-amber-600"></i> ${ordinalRank} of ${totalStudents} in ${learnerClass}`;
      dashLastTestRank.classList.remove("hidden");
    }

    dashLastTestRemarks.textContent = lastSub.teacher_remarks ? `"${lastSub.teacher_remarks}"` : "Score recorded in school registry.";
    lastTestCard.onclick = () => openScoreDetailsModal(lastSub);
  } else {
    dashLastTestTitle.textContent = "No Tests Submitted Yet";
    dashLastTestScore.textContent = "0 / 0";
    dashLastTestDate.textContent = "Pending";
    if (dashLastTestRank) dashLastTestRank.classList.add("hidden");
    dashLastTestRemarks.textContent = "Take an available CAT below to record your first score.";
    lastTestCard.onclick = null;
  }

  // Update Hub Filter Counts
  countAll.textContent = state.assessments.length;
  countAvailable.textContent = openCount;
  countClosed.textContent = state.assessments.filter((a) => a.status === "CLOSED" || (a.unlock_time && new Date(a.unlock_time) > new Date())).length;
  countGraded.textContent = graded.length;
}

// ------------------------------------------------------------------------------
// Assessment Grid & Filter Rendering
// ------------------------------------------------------------------------------
function renderAssessmentCards() {
  const { assessments, submissions, filterStatus, filterSubject } = state;
  const learnerClass = state.profile?.class_level || "Basic 9A";

  const subMap = new Map();
  submissions.forEach((s) => subMap.set(s.assessment_id, s));

  // Filter with strict lane / track separation between Basic 9A and Basic 9B
  let filtered = assessments.filter((asmt) => {
    // 9A and 9B are in their separate lane or track and shouldn't be mixed!
    if (asmt.class_level === "Basic 9A" && learnerClass !== "Basic 9A") return false;
    if (asmt.class_level === "Basic 9B" && learnerClass !== "Basic 9B") return false;

    if (filterSubject !== "ALL" && asmt.subject !== filterSubject) {
      return false;
    }
    const sub = subMap.get(asmt.id);
    const isScheduled = asmt.unlock_time && new Date(asmt.unlock_time) > new Date();
    const isAvailable = asmt.status === "AVAILABLE" && !isScheduled;

    if (filterStatus === "AVAILABLE") return isAvailable;
    if (filterStatus === "CLOSED") return asmt.status === "CLOSED" || isScheduled;
    if (filterStatus === "GRADED") return sub && sub.status === "GRADED";
    return true;
  });

  if (filtered.length === 0) {
    assessmentGrid.innerHTML = `
      <div class="col-span-full text-center py-12 text-slate-400">
        <i class="fa-regular fa-folder-open text-3xl mb-2 block"></i>
        <p class="font-medium">No assessments matching the current filter in ${learnerClass}.</p>
      </div>
    `;
    return;
  }

  assessmentGrid.innerHTML = filtered.map((asmt) => {
    const sub = subMap.get(asmt.id);
    const isScheduled = asmt.unlock_time && new Date(asmt.unlock_time) > new Date();
    const isAvailable = asmt.status === "AVAILABLE" && !isScheduled;
    const hasScore = sub && sub.status === "GRADED";

    // Subject styles
    let subjectClass = "bg-blue-50 text-blue-700 border-blue-200";
    let subjectIcon = "fa-laptop-code";
    if (asmt.subject === "Mathematics") {
      subjectClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
      subjectIcon = "fa-calculator";
    } else if (asmt.subject === "Creative Arts") {
      subjectClass = "bg-amber-50 text-amber-700 border-amber-200";
      subjectIcon = "fa-palette";
    }

    // Status Pill
    let statusBadge = "";
    if (hasScore) {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <i class="fa-solid fa-lock text-indigo-500"></i> Graded &amp; Locked
        </span>
      `;
    } else if (isScheduled) {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Scheduled
        </span>
      `;
    } else if (isAvailable) {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Available
        </span>
      `;
    } else {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
          <i class="fa-solid fa-lock text-slate-400"></i> Closed by Admin
        </span>
      `;
    }

    // Countdown Box for Scheduled Tests
    let countdownBox = "";
    if (isScheduled && !hasScore) {
      countdownBox = `
        <div class="bg-amber-50/90 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs font-bold text-amber-900 mb-4 shadow-2xs">
          <span class="flex items-center gap-1.5 text-amber-700"><i class="fa-solid fa-clock animate-spin text-amber-600"></i> Live Countdown:</span>
          <span class="asmt-live-countdown font-mono text-sm text-amber-950 font-extrabold" data-unlock-time="${asmt.unlock_time}">--:--:--</span>
        </div>
      `;
    }

    // Action Button
    let actionBtn = "";
    if (hasScore) {
      actionBtn = `
        <button class="view-score-btn w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5" data-sub-id="${sub.id}">
          <i class="fa-solid fa-file-lines text-indigo-600"></i> View Score &amp; Feedback
        </button>
      `;
    } else if (isScheduled) {
      actionBtn = `
        <button disabled class="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-clock text-slate-400"></i> Locked until scheduled release
        </button>
      `;
    } else if (isAvailable) {
      actionBtn = `
        <button class="start-quiz-btn w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5" data-asmt-id="${asmt.id}">
          <i class="fa-solid fa-play"></i> Start Assessment (CAT)
        </button>
      `;
    } else {
      actionBtn = `
        <button disabled class="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-lock text-slate-400"></i> Locked by Administrator
        </button>
      `;
    }

    const cardClassTotal = getClassTotalStudents(learnerClass);
    const cardRankNum = sub?.submission_rank || 1;
    const cardOrdinal = getOrdinalSuffix(cardRankNum);

    return `
      <div class="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all">
        <div>
          <!-- Header -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${subjectClass}">
              <i class="fa-solid ${subjectIcon}"></i> ${asmt.subject}
            </span>
            ${statusBadge}
          </div>

          <h4 class="font-bold text-base text-slate-900 mb-1 leading-snug">${asmt.title}</h4>
          <p class="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
            ${asmt.description || "Continuous assessment task under Ghana JHS curriculum."}
          </p>

          ${countdownBox}

          <!-- Details Grid -->
          <div class="space-y-1.5 py-3 border-y border-slate-100 text-xs text-slate-600 mb-4">
            <div class="flex justify-between">
              <span class="text-slate-400">Class Track:</span>
              <span class="font-semibold text-slate-700">${asmt.class_level || "Basic 9"}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Term Weight:</span>
              <span class="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">${asmt.weight ? parseFloat(asmt.weight) : 20}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Max Score:</span>
              <span class="font-semibold text-slate-700">${asmt.max_score} marks</span>
            </div>
            ${
              hasScore
                ? `
              <div class="flex justify-between">
                <span class="text-slate-400">Turned In:</span>
                <span class="font-semibold text-slate-700">${formatDateTime(sub.submitted_at)}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Class Task Position:</span>
                <span class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <i class="fa-solid fa-list-ol text-amber-600"></i> ${cardOrdinal} of ${cardClassTotal} in ${learnerClass}
                </span>
              </div>
            `
                : `
              <div class="flex justify-between">
                <span class="text-slate-400">Deadline:</span>
                <span class="font-semibold text-slate-700">${formatDeadline(asmt.deadline)}</span>
              </div>
            `
            }
          </div>

          ${
            hasScore
              ? `
              <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between text-xs font-bold text-emerald-800 mb-4">
                <span class="flex items-center gap-1.5"><i class="fa-solid fa-trophy text-emerald-600"></i> Your Score:</span>
                <span class="text-sm font-extrabold text-emerald-700">${sub.score} / ${asmt.max_score}</span>
              </div>
            `
              : ""
          }
        </div>

        <div class="pt-2">
          ${actionBtn}
        </div>
      </div>
    `;
  }).join("");

  // Start live countdown updater for any scheduled assessments
  startAssessmentLiveCountdowns();

  // Attach Start Quiz button handlers
  document.querySelectorAll(".start-quiz-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      startAssessmentQuiz(asmtId);
    });
  });

  // Attach View Score button handlers
  document.querySelectorAll(".view-score-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const subId = btn.getAttribute("data-sub-id");
      const sub = state.submissions.find((s) => s.id === subId);
      if (sub) openScoreDetailsModal(sub);
    });
  });
}

// ------------------------------------------------------------------------------
// Live Countdown Engine for Scheduled Assessments
// ------------------------------------------------------------------------------
function startAssessmentLiveCountdowns() {
  if (state.asmtCountdownInterval) {
    clearInterval(state.asmtCountdownInterval);
  }

  function updateTimers() {
    const timerEls = document.querySelectorAll(".asmt-live-countdown");
    if (timerEls.length === 0) return;

    let hasUnlockedAny = false;
    timerEls.forEach((el) => {
      const unlockTimeStr = el.getAttribute("data-unlock-time");
      if (!unlockTimeStr) return;
      const targetTime = new Date(unlockTimeStr).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        el.textContent = "Unlocking now...";
        hasUnlockedAny = true;
      } else {
        const totalSec = Math.floor(diff / 1000);
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;

        if (days > 0) {
          el.textContent = `${days}d ${String(hours).padStart(2, "0")}h : ${String(mins).padStart(2, "0")}m : ${String(secs).padStart(2, "0")}s`;
        } else {
          el.textContent = `${String(hours).padStart(2, "0")}h : ${String(mins).padStart(2, "0")}m : ${String(secs).padStart(2, "0")}s`;
        }
      }
    });

    if (hasUnlockedAny) {
      setTimeout(async () => {
        state.assessments = await fetchAssessments();
        renderAssessmentCards();
        updateKpiMetrics();
      }, 1500);
    }
  }

  updateTimers();
  state.asmtCountdownInterval = setInterval(updateTimers, 1000);
}

// ------------------------------------------------------------------------------
// In-Portal Secure Assessment / Quiz Runner (Anti-Cheat & Blind Progression)
// ------------------------------------------------------------------------------
function startAssessmentQuiz(asmtId) {
  const asmt = state.assessments.find((a) => a.id === asmtId);
  if (!asmt) return;

  const existingSub = state.submissions.find((s) => s.assessment_id === asmtId && s.status === "GRADED");
  if (existingSub) {
    alert("You have already completed and submitted this assessment. Re-takes are locked to maintain assessment integrity.");
    return;
  }

  const isScheduled = asmt.unlock_time && new Date(asmt.unlock_time) > new Date();
  if (asmt.status === "CLOSED" || isScheduled) {
    alert("This assessment is currently locked by the administrator.");
    return;
  }

  const learnerClass = state.profile?.class_level || "Basic 9A";
  const questionPack = getAssessmentQuestionPack(asmtId, learnerClass, asmt.title);
  // Anti-cheat intelligence: randomize both question order AND option order for each student paper
  const studentPaper = generateStudentPaper(questionPack);

  state.activeQuiz = {
    asmtId: asmtId,
    asmtTitle: asmt.title,
    asmtSubject: asmt.subject,
    asmtMaxScore: asmt.max_score || 20,
    classLevel: learnerClass,
    paper: studentPaper,
    currentIndex: 0,
    answers: {},
    isSubmitting: false,
    remainingSeconds: (asmt.time_limit_minutes || 15) * 60,
  };

  if (quizSubjectBadge) quizSubjectBadge.textContent = asmt.subject;
  if (quizClassTrackBadge) quizClassTrackBadge.textContent = `${learnerClass} Track`;
  if (quizTitle) quizTitle.textContent = asmt.title;
  if (quizLearnerName) quizLearnerName.textContent = state.profile?.full_name || "Student Learner";
  if (quizStudentIdText) quizStudentIdText.textContent = state.profile?.student_id || generateStudentId(learnerClass, 1);
  if (quizTotalNum) quizTotalNum.textContent = studentPaper.length;

  if (quizActiveBody) quizActiveBody.classList.remove("hidden");
  if (quizActiveFooter) quizActiveFooter.classList.remove("hidden");
  if (quizResultScreen) quizResultScreen.classList.add("hidden");

  renderQuizQuestion();
  startQuizSessionTimer();
  quizRunnerModal?.classList.remove("hidden");
}

function renderQuizQuestion() {
  const quiz = state.activeQuiz;
  if (!quiz || !quiz.paper) return;

  const currentQ = quiz.paper[quiz.currentIndex];
  const currentNum = quiz.currentIndex + 1;
  const totalQuestions = quiz.paper.length;

  if (quizCurrentNum) quizCurrentNum.textContent = currentNum;
  if (quizQuestionPill) quizQuestionPill.textContent = `Question ${currentNum}`;
  if (quizQuestionPrompt) quizQuestionPrompt.textContent = currentQ.prompt;

  if (quizProgressBar) {
    const pct = Math.round((currentNum / totalQuestions) * 100);
    quizProgressBar.style.width = `${pct}%`;
  }

  const selectedAnswer = quiz.answers[currentQ.id];
  const optionLetters = ["A", "B", "C", "D", "E"];

  if (quizOptionsList) {
    quizOptionsList.innerHTML = currentQ.options.map((optText, idx) => {
      const isSelected = selectedAnswer === optText;
      const letter = optionLetters[idx] || (idx + 1);

      return `
        <button
          type="button"
          class="quiz-option-btn w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
            isSelected
              ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800 font-medium'
          }"
          data-option="${escapeHtml(optText)}"
        >
          <div class="flex items-center gap-3">
            <span class="quiz-letter-badge w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }">
              ${letter}
            </span>
            <span class="text-sm leading-relaxed">${escapeHtml(optText)}</span>
          </div>
          <div class="quiz-radio-outer w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
          }">
            <span class="quiz-radio-inner">${isSelected ? '<span class="w-2 h-2 rounded-full bg-white block"></span>' : ''}</span>
          </div>
        </button>
      `;
    }).join("");

    quizOptionsList.querySelectorAll(".quiz-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const optionVal = btn.getAttribute("data-option");
        quiz.answers[currentQ.id] = optionVal;

        // Visual selection indicator without revealing right/wrong answers
        quizOptionsList.querySelectorAll(".quiz-option-btn").forEach((b) => {
          const isThis = b.getAttribute("data-option") === optionVal;
          b.className = `quiz-option-btn w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
            isThis
              ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800 font-medium'
          }`;
          const badge = b.querySelector(".quiz-letter-badge");
          if (badge) {
            badge.className = `quiz-letter-badge w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
              isThis ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }`;
          }
          const radioOuter = b.querySelector(".quiz-radio-outer");
          if (radioOuter) {
            radioOuter.className = `quiz-radio-outer w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              isThis ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
            }`;
          }
          const radioInner = b.querySelector(".quiz-radio-inner");
          if (radioInner) {
            radioInner.innerHTML = isThis ? '<span class="w-2 h-2 rounded-full bg-white block"></span>' : '';
          }
        });

        // Anti-leak blind progression: smoothly auto-advance after 300ms without showing right/wrong
        setTimeout(() => {
          if (quiz.currentIndex < quiz.paper.length - 1) {
            quiz.currentIndex++;
            renderQuizQuestion();
          } else {
            handleQuizSubmit();
          }
        }, 320);
      });
    });
  }

  const isLast = quiz.currentIndex === totalQuestions - 1;
  if (isLast) {
    quizNextBtn?.classList.add("hidden");
    quizSubmitBtn?.classList.remove("hidden");
  } else {
    quizNextBtn?.classList.remove("hidden");
    quizSubmitBtn?.classList.add("hidden");
  }
}

function handleQuizNext() {
  const quiz = state.activeQuiz;
  if (!quiz) return;

  const currentQ = quiz.paper[quiz.currentIndex];
  if (!quiz.answers[currentQ.id]) {
    alert("Please select an answer to proceed.");
    return;
  }

  if (quiz.currentIndex < quiz.paper.length - 1) {
    quiz.currentIndex++;
    renderQuizQuestion();
  }
}

async function handleQuizSubmit() {
  const quiz = state.activeQuiz;
  if (!quiz) return;
  if (quiz.isSubmitting) return;

  const currentQ = quiz.paper[quiz.currentIndex];
  if (!quiz.answers[currentQ.id]) {
    alert("Please select your answer to complete the assessment.");
    return;
  }

  quiz.isSubmitting = true;

  if (state.quizTimerInterval) {
    clearInterval(state.quizTimerInterval);
    state.quizTimerInterval = null;
  }

  // Evaluate marks securely in-portal against verified marking scheme
  let correctCount = 0;
  quiz.paper.forEach((q) => {
    const studentChoice = quiz.answers[q.id];
    if (studentChoice && q.correctAnswer && studentChoice.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
      correctCount++;
    }
  });

  const totalQuestions = quiz.paper.length;
  const incorrectCount = totalQuestions - correctCount;
  const maxScore = quiz.asmtMaxScore || 20;
  // Compute marks scaled to max_score (e.g., 2 marks per question out of 10 items = 20)
  const score = (correctCount / totalQuestions) * maxScore;
  const pct = Math.round((score / maxScore) * 100);

  const learnerClass = state.profile?.class_level || "Basic 9A";
  const existingSubs = (state.submissions || []).filter((s) => s.assessment_id === quiz.asmtId);
  const rankNum = existingSubs.length + 1;
  const ordinalRank = getOrdinalSuffix(rankNum);

  const learnerId = state.profile?.id || state.user?.id || "lrn-001";
  await saveAssessmentSubmission({
    assessment_id: quiz.asmtId,
    learner_id: learnerId,
    score: score,
    max_score: maxScore,
    correct_count: correctCount,
    incorrect_count: incorrectCount,
    answers: quiz.answers,
    submission_rank: rankNum,
    teacher_remarks: `Scored ${score.toFixed(1)}/${maxScore} (${pct}%) on ${quiz.asmtTitle}. Completed with ${correctCount} correct and ${incorrectCount} incorrect.`,
  });

  state.submissions = await fetchLearnerSubmissions(learnerId);

  // Results Screen: displays summary score, correct/incorrect count, and rank WITHOUT revealing the exact answers
  if (quizActiveBody) quizActiveBody.classList.add("hidden");
  if (quizActiveFooter) quizActiveFooter.classList.add("hidden");
  if (quizResultScreen) quizResultScreen.classList.remove("hidden");

  if (quizResultScore) quizResultScore.textContent = score.toFixed(1);
  if (quizResultMax) quizResultMax.textContent = `/ ${maxScore}`;
  if (quizResultPct) quizResultPct.textContent = `${pct}.0%`;
  if (quizCorrectCount) quizCorrectCount.textContent = correctCount;
  if (quizIncorrectCount) quizIncorrectCount.textContent = incorrectCount;
  if (quizResultRankText) quizResultRankText.textContent = `Turn-in Order: ${ordinalRank} in ${learnerClass}`;

  if (quizResultGradeBadge) {
    if (pct >= 80) {
      quizResultGradeBadge.textContent = "Distinction";
      quizResultGradeBadge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800";
    } else if (pct >= 65) {
      quizResultGradeBadge.textContent = "Credit";
      quizResultGradeBadge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800";
    } else {
      quizResultGradeBadge.textContent = "Pass";
      quizResultGradeBadge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800";
    }
  }

  // Immediately lock this card so student cannot start it again
  renderAssessmentCards();
  updateKpiMetrics();
}

function startQuizSessionTimer() {
  if (state.quizTimerInterval) {
    clearInterval(state.quizTimerInterval);
  }

  function updateTimer() {
    if (!state.activeQuiz) return;
    state.activeQuiz.remainingSeconds--;

    if (state.activeQuiz.remainingSeconds <= 0) {
      state.activeQuiz.remainingSeconds = 0;
      clearInterval(state.quizTimerInterval);
      state.quizTimerInterval = null;
      alert("Time has elapsed! Submitting assessment answers.");
      handleQuizSubmit();
      return;
    }

    const mins = Math.floor(state.activeQuiz.remainingSeconds / 60);
    const secs = state.activeQuiz.remainingSeconds % 60;
    if (quizTimerText) {
      quizTimerText.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
  }

  updateTimer();
  state.quizTimerInterval = setInterval(updateTimer, 1000);
}

function closeQuizRunner() {
  if (state.quizTimerInterval) {
    clearInterval(state.quizTimerInterval);
    state.quizTimerInterval = null;
  }
  state.activeQuiz = null;
  quizRunnerModal?.classList.add("hidden");

  updateKpiMetrics();
  renderAssessmentCards();
}

// ------------------------------------------------------------------------------
// Student Track Switcher (Basic 9A & Basic 9B Separate Lanes)
// ------------------------------------------------------------------------------
async function switchStudentTrack(targetClass) {
  if (targetClass === "Basic 9A") {
    state.user = {
      id: "lrn-001",
      email: "kwame.mensah@ghana-edu.gov.gh",
      user_metadata: {
        full_name: "Kwame Mensah Frimpong",
        avatar_url: AVATAR_PRESETS[0],
      },
    };
    state.profile = {
      id: "lrn-001",
      student_id: "JHS26-B9A-001",
      full_name: "Kwame Mensah Frimpong",
      email: "kwame.mensah@ghana-edu.gov.gh",
      gender: "Male",
      date_of_birth: "2011-10-14",
      class_level: "Basic 9A",
      role: "learner",
      avatar_url: AVATAR_PRESETS[0],
      onboarding_completed: true,
    };

    if (trackBtn9A) {
      trackBtn9A.className = "px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer bg-white text-indigo-700 shadow-xs";
    }
    if (trackBtn9B) {
      trackBtn9B.className = "px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer text-slate-600 hover:text-slate-900";
    }
  } else {
    state.user = {
      id: "lrn-003",
      email: "kofi.boateng@ghana-edu.gov.gh",
      user_metadata: {
        full_name: "Kofi Owusu Boateng",
        avatar_url: AVATAR_PRESETS[1],
      },
    };
    state.profile = {
      id: "lrn-003",
      student_id: "JHS26-B9B-001",
      full_name: "Kofi Owusu Boateng",
      email: "kofi.boateng@ghana-edu.gov.gh",
      gender: "Male",
      date_of_birth: "2011-06-22",
      class_level: "Basic 9B",
      role: "learner",
      avatar_url: AVATAR_PRESETS[1],
      onboarding_completed: true,
    };

    if (trackBtn9B) {
      trackBtn9B.className = "px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer bg-white text-indigo-700 shadow-xs";
    }
    if (trackBtn9A) {
      trackBtn9A.className = "px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer text-slate-600 hover:text-slate-900";
    }
  }

  localStorage.setItem("jhs_demo_session", JSON.stringify(state.user));
  localStorage.setItem("jhs_active_learner", JSON.stringify(state.profile));

  state.submissions = await fetchLearnerSubmissions(state.profile.id);
  await renderDashboard();
}

// ------------------------------------------------------------------------------
// Admin Marking Scheme & Answer Keys Inspector
// ------------------------------------------------------------------------------
async function openAnswerKeyModal(asmtId = null) {
  if (!state.assessments || state.assessments.length === 0) {
    state.assessments = await fetchAssessments();
  }
  if (!answerKeyAsmtSelect) return;

  const asmts = state.assessments || [];
  answerKeyAsmtSelect.innerHTML = asmts.map((a) => {
    return `<option value="${a.id}">${escapeHtml(a.title)} (${escapeHtml(a.class_level || 'Basic 9')} - ${escapeHtml(a.subject)})</option>`;
  }).join("");

  const selectedId = asmtId || (asmts.length > 0 ? asmts[0].id : null);
  if (selectedId) {
    answerKeyAsmtSelect.value = selectedId;
    renderAnswerKeyPack(selectedId);
  } else {
    if (answerKeyQuestionsContainer) {
      answerKeyQuestionsContainer.innerHTML = `<div class="text-center py-12 text-slate-400">No assessments available.</div>`;
    }
  }

  adminAnswerKeyModal?.classList.remove("hidden");
}

function renderAnswerKeyPack(asmtId) {
  if (!answerKeyQuestionsContainer) return;
  const asmt = (state.assessments || []).find((a) => a.id === asmtId);
  const classLevel = asmt?.class_level || "Basic 9A";

  if (answerKeyTrackBadge) {
    answerKeyTrackBadge.textContent = `${classLevel} Track`;
  }

  const questionPack = getAssessmentQuestionPack(asmtId, classLevel, asmt?.title);
  if (!questionPack || questionPack.length === 0) {
    answerKeyQuestionsContainer.innerHTML = `
      <div class="text-center py-12 text-slate-400">
        <i class="fa-solid fa-triangle-exclamation text-3xl mb-2 text-amber-500 block"></i>
        No marking scheme registered for this assessment item.
      </div>
    `;
    return;
  }

  const optionLetters = ["A", "B", "C", "D", "E"];
  answerKeyQuestionsContainer.innerHTML = questionPack.map((q, idx) => {
    return `
      <div class="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              Q${idx + 1}
            </span>
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">${escapeHtml(q.topic || asmt?.subject || 'Curriculum')}</span>
          </div>
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">2 Marks</span>
        </div>

        <p class="text-sm font-semibold text-slate-900 leading-relaxed">${escapeHtml(q.prompt)}</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          ${q.options.map((opt, optIdx) => {
            const isCorrect = q.correctAnswer && opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
            return `
              <div class="p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                isCorrect
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950 font-bold'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700'
              }">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                    isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }">
                    ${optionLetters[optIdx] || optIdx + 1}
                  </span>
                  <span>${escapeHtml(opt)}</span>
                </div>
                ${isCorrect ? '<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><i class="fa-solid fa-circle-check"></i> Verified Correct</span>' : ''}
              </div>
            `;
          }).join("")}
        </div>

        ${
          q.explanation
            ? `
          <div class="mt-2 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 leading-relaxed">
            <span class="font-bold flex items-center gap-1 text-indigo-900 mb-0.5">
              <i class="fa-solid fa-lightbulb text-amber-500"></i> Marking Rubric &amp; Solution Note:
            </span>
            ${escapeHtml(q.explanation)}
          </div>
        `
            : ""
        }
      </div>
    `;
  }).join("");
}

// ------------------------------------------------------------------------------
// Admin Assessment & Term Weighting Configuration Controller
// ------------------------------------------------------------------------------
async function openAdminAssessmentManager() {
  if (!state.assessments || state.assessments.length === 0) {
    state.assessments = await fetchAssessments();
  }
  renderAdminAssessmentConfigTable();
  adminAssessmentConfigModal?.classList.remove("hidden");
}

function updateAdminTotalWeightDisplay() {
  const inputs = document.querySelectorAll(".asmt-weight-input");
  let totalWeight = 0;
  inputs.forEach((inp) => {
    const asmtId = inp.getAttribute("data-asmt-id");
    const asmt = (state.assessments || []).find((a) => a.id === asmtId);
    if (asmt && asmt.class_level !== "Basic 9B") {
      totalWeight += parseFloat(inp.value) || 0;
    }
  });

  if (adminTotalWeightVal) adminTotalWeightVal.textContent = `${totalWeight.toFixed(2)}%`;
  
  if (adminWeightProgressBar) {
    const clampedPct = Math.min(100, Math.round(totalWeight));
    adminWeightProgressBar.style.width = `${clampedPct}%`;
    if (Math.round(totalWeight) === 100) {
      adminWeightProgressBar.className = "h-full bg-emerald-400 rounded-full transition-all duration-300";
    } else {
      adminWeightProgressBar.className = "h-full bg-amber-400 rounded-full transition-all duration-300";
    }
  }

  if (adminWeightStatusBadge) {
    if (Math.round(totalWeight) === 100) {
      adminWeightStatusBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30";
      adminWeightStatusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Balanced (100.00%)`;
    } else {
      adminWeightStatusBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30";
      adminWeightStatusBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Calibrate (${totalWeight.toFixed(1)}% / 100%)`;
    }
  }
}

async function autoBalanceAssessmentWeights() {
  const asmts = state.assessments || [];
  if (asmts.length === 0) return;

  const trackAsmts = asmts.filter((a) => a.class_level !== "Basic 9B");
  const count = trackAsmts.length;
  if (count === 0) return;

  const baseWeight = Math.floor(100 / count);
  const remainder = 100 - (baseWeight * count);

  if (adminAutoBalanceBtn) {
    adminAutoBalanceBtn.disabled = true;
    adminAutoBalanceBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Balancing...`;
  }

  for (let i = 0; i < count; i++) {
    const asmt = trackAsmts[i];
    const newWeight = i === 0 ? baseWeight + remainder : baseWeight;
    await updateAssessment(asmt.id, { weight: newWeight });

    const baseTitle = asmt.title.replace(" (Basic 9A)", "").replace(" 9A", "");
    const parallel9B = asmts.find((a) => a.class_level === "Basic 9B" && a.title.includes(baseTitle));
    if (parallel9B) {
      await updateAssessment(parallel9B.id, { weight: newWeight });
    }
  }

  state.assessments = await fetchAssessments();
  renderAdminAssessmentConfigTable();
  renderAssessmentCards();
  updateKpiMetrics();

  if (adminAutoBalanceBtn) {
    adminAutoBalanceBtn.disabled = false;
    adminAutoBalanceBtn.innerHTML = `<i class="fa-solid fa-scale-balanced"></i> Auto-Balance to 100%`;
  }
}

function renderAdminAssessmentConfigTable() {
  if (!adminAsmtTableBody) return;

  const asmts = state.assessments || [];
  if (adminAsmtCount) adminAsmtCount.textContent = asmts.length;

  const trackAsmts = asmts.filter((a) => a.class_level !== "Basic 9B");
  const totalWeight = trackAsmts.reduce((sum, a) => sum + (parseFloat(a.weight) || 20), 0);
  if (adminTotalWeightVal) adminTotalWeightVal.textContent = `${totalWeight.toFixed(2)}%`;
  
  if (adminWeightProgressBar) {
    const clampedPct = Math.min(100, Math.round(totalWeight));
    adminWeightProgressBar.style.width = `${clampedPct}%`;
    if (Math.round(totalWeight) === 100) {
      adminWeightProgressBar.className = "h-full bg-emerald-400 rounded-full transition-all duration-300";
    } else {
      adminWeightProgressBar.className = "h-full bg-amber-400 rounded-full transition-all duration-300";
    }
  }

  if (adminWeightStatusBadge) {
    if (Math.round(totalWeight) === 100) {
      adminWeightStatusBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30";
      adminWeightStatusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Balanced (100.00%)`;
    } else {
      adminWeightStatusBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30";
      adminWeightStatusBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Calibrate (${totalWeight.toFixed(1)}% / 100%)`;
    }
  }

  if (asmts.length === 0) {
    adminAsmtTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400">
          No assessment items configured.
        </td>
      </tr>
    `;
    return;
  }

  adminAsmtTableBody.innerHTML = asmts.map((asmt) => {
    const isScheduled = asmt.unlock_time && new Date(asmt.unlock_time) > new Date();
    const formattedUnlock = asmt.unlock_time ? new Date(asmt.unlock_time).toISOString().slice(0, 16) : "";

    return `
      <tr class="hover:bg-slate-50/70 transition-colors" data-asmt-row="${asmt.id}">
        <td class="py-3.5 px-3">
          <div class="font-bold text-slate-900">${escapeHtml(asmt.title)}</div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">${escapeHtml(asmt.class_level || "Basic 9")}</span>
            <span class="text-[11px] text-slate-500">${escapeHtml(asmt.subject)}</span>
          </div>
        </td>
        <td class="py-3.5 px-2">
          <span class="font-semibold text-slate-700">${asmt.assessment_type === 'PROJECT_WORK' ? 'Project' : 'CAT'}</span>
        </td>
        <td class="py-3.5 px-2">
          <div class="flex items-center gap-1">
            <input
              type="number"
              class="asmt-weight-input w-16 bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs font-bold text-slate-800 text-center focus:ring-2 focus:ring-indigo-500"
              value="${parseFloat(asmt.weight) || 20}"
              min="1"
              max="100"
              data-asmt-id="${asmt.id}"
            />
            <span class="text-slate-400 font-semibold">%</span>
          </div>
        </td>
        <td class="py-3.5 px-2 font-mono font-bold text-slate-700">
          ${asmt.max_score}
        </td>
        <td class="py-3.5 px-3">
          <div class="space-y-1.5">
            <select
              class="asmt-status-select bg-white border border-slate-200 rounded-lg py-1 px-2 text-[11px] font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              data-asmt-id="${asmt.id}"
            >
              <option value="AVAILABLE" ${asmt.status === 'AVAILABLE' ? 'selected' : ''}>Available (Unlocked)</option>
              <option value="UPCOMING" ${asmt.status === 'UPCOMING' ? 'selected' : ''}>Upcoming (Countdown)</option>
              <option value="CLOSED" ${asmt.status === 'CLOSED' ? 'selected' : ''}>Closed (Locked)</option>
            </select>
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-slate-400">Unlock:</span>
              <input
                type="datetime-local"
                class="asmt-unlock-input bg-white border border-slate-200 rounded-lg py-0.5 px-1.5 text-[10px] text-slate-700 focus:ring-2 focus:ring-indigo-500"
                value="${formattedUnlock}"
                data-asmt-id="${asmt.id}"
              />
            </div>
            ${isScheduled ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"><i class="fa-solid fa-clock"></i> Countdown Live</span>` : ''}
          </div>
        </td>
        <td class="py-3.5 px-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button
              class="asmt-key-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
              data-asmt-id="${asmt.id}"
              title="View Answer Key &amp; Marking Scheme"
            >
              <i class="fa-solid fa-key"></i> Key
            </button>
            <button
              class="asmt-save-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
              data-asmt-id="${asmt.id}"
              title="Save changes"
            >
              <i class="fa-solid fa-floppy-disk"></i> Save
            </button>
            <button
              class="asmt-delete-btn inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
              data-asmt-id="${asmt.id}"
              title="Delete assessment"
            >
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Live weight calculation on input change
  adminAsmtTableBody.querySelectorAll(".asmt-weight-input").forEach((inp) => {
    inp.addEventListener("input", updateAdminTotalWeightDisplay);
  });

  // Answer Key button handlers
  adminAsmtTableBody.querySelectorAll(".asmt-key-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      openAnswerKeyModal(asmtId);
    });
  });

  // Save button handlers
  adminAsmtTableBody.querySelectorAll(".asmt-save-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      const row = document.querySelector(`[data-asmt-row="${asmtId}"]`);
      if (!row) return;

      const weightVal = parseFloat(row.querySelector(".asmt-weight-input")?.value) || 20;
      const statusVal = row.querySelector(".asmt-status-select")?.value || "AVAILABLE";
      const unlockVal = row.querySelector(".asmt-unlock-input")?.value;
      const unlockTime = unlockVal ? new Date(unlockVal).toISOString() : null;

      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i>`;

      await updateAssessment(asmtId, {
        weight: weightVal,
        status: statusVal,
        unlock_time: unlockTime,
      });

      state.assessments = await fetchAssessments();
      renderAdminAssessmentConfigTable();
      renderAssessmentCards();
      updateKpiMetrics();
    });
  });

  // Delete button handlers
  adminAsmtTableBody.querySelectorAll(".asmt-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      const asmt = state.assessments.find((a) => a.id === asmtId);
      if (!confirm(`Are you sure you want to delete "${asmt?.title || 'this assessment'}"?`)) return;

      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i>`;

      await deleteAssessment(asmtId);
      state.assessments = await fetchAssessments();
      renderAdminAssessmentConfigTable();
      renderAssessmentCards();
      updateKpiMetrics();
    });
  });
}

async function handleAddNewAssessment(e) {
  e.preventDefault();
  const title = newAsmtTitle?.value?.trim();
  if (!title) return;

  const subject = newAsmtSubject?.value || "Computing";
  const classLevel = newAsmtClass?.value || "Basic 9A";
  const type = newAsmtType?.value || "CAT";
  const weight = parseFloat(newAsmtWeight?.value) || 20;
  const status = newAsmtStatus?.value || "AVAILABLE";
  const unlockVal = newAsmtUnlockTime?.value;
  const unlockTime = unlockVal ? new Date(unlockVal).toISOString() : null;

  const createdAsmt = await createAssessment({
    title,
    subject,
    class_level: classLevel,
    assessment_type: type,
    max_score: 20,
    weight,
    status,
    unlock_time: unlockTime,
    description: `Official ${subject} assessment item for ${classLevel}.`,
  });

  // Auto-generate 10 curriculum-aligned test items and register question pack
  if (createdAsmt && createdAsmt.id) {
    const dynamicPack = generateDynamicTestItems(title, subject, classLevel);
    ALL_OFFICIAL_QUESTION_PACKS[createdAsmt.id] = dynamicPack;
  }

  addNewAssessmentForm.reset();
  if (newAsmtWeight) newAsmtWeight.value = "20";

  state.assessments = await fetchAssessments();
  renderAdminAssessmentConfigTable();
  renderAssessmentCards();
  updateKpiMetrics();
}

// ------------------------------------------------------------------------------
// Admin Command Center & Learner Directory
// ------------------------------------------------------------------------------
async function renderAdminDashboard() {
  state.activeView = "admin";
  authSection.classList.add("hidden");
  dashboardSection.classList.add("hidden");
  adminDashboardSection.classList.remove("hidden");
  floatingChatContainer.classList.remove("hidden");

  updateHeaderNav();

  if (!state.assessments || state.assessments.length === 0) {
    state.assessments = await fetchAssessments();
  }

  // Render skeletons for admin KPI cards & learners table
  renderAdminKpiSkeletons();

  // Load all registered learners
  state.allLearners = await fetchAllLearners();

  // Compute live admin statistics
  const onlineCount = state.allLearners.filter((l) => l.is_online).length;
  if (kpiOnlineCount) kpiOnlineCount.textContent = onlineCount;
  if (kpiTotalStudents) kpiTotalStudents.textContent = state.allLearners.length;
  if (kpiNotifsSent) kpiNotifsSent.textContent = state.notifications.length;

  renderAdminLearnersTable();
}

function renderAdminLearnersTable() {
  if (!adminLearnersTableBody) return;

  const filterVal = adminClassFilter?.value || "ALL";

  let filtered = state.allLearners.filter((l) => {
    if (filterVal === "ONLINE") return l.is_online;
    if (filterVal !== "ALL") return l.class_level === filterVal;
    return true;
  });

  if (filtered.length === 0) {
    adminLearnersTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-slate-400">
          <i class="fa-solid fa-users-slash text-2xl mb-1 block"></i>
          No learners found matching this class filter.
        </td>
      </tr>
    `;
    return;
  }

  adminLearnersTableBody.innerHTML = filtered.map((learner) => {
    const isOnline = learner.is_online;
    const presenceBadge = isOnline
      ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
           <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online Now
         </span>`
      : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
           <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Offline (${formatTimeAgo(learner.last_seen)})
         </span>`;

    const subCount = learner.submissions?.length || 0;
    const lastScore = subCount > 0 ? learner.submissions[0].score : null;
    const academicPill = subCount > 0
      ? `<span class="font-bold text-slate-800">${subCount} Task(s) Submitted</span> <span class="text-xs text-slate-400 block">Latest: ${lastScore}/20 marks</span>`
      : `<span class="text-slate-400 italic">No submissions yet</span>`;

    return `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-3">
            <div class="relative">
              <img src="${learner.avatar_url || AVATAR_PRESETS[0]}" alt="Avatar" class="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200" />
              <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 ring-2 ring-white' : 'bg-slate-400'}"></span>
            </div>
            <div>
              <div class="font-bold text-slate-900 flex items-center gap-2">
                <span>${escapeHtml(learner.full_name)}</span>
                ${isBirthdayToday(learner.date_of_birth) ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-200 animate-pulse"><i class="fa-solid fa-cake-candles text-pink-500"></i> Birthday Today!</span>` : ""}
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">${escapeHtml(learner.student_id || generateStudentId(learner.class_level, 1))}</span>
                ${learner.date_of_birth ? `<span class="text-[11px] text-slate-500 font-medium">• Age: ${calculateAge(learner.date_of_birth) != null ? calculateAge(learner.date_of_birth) + ' yrs' : 'N/A'}</span> <span class="text-[10px] text-slate-400">(${formatDateOnly(learner.date_of_birth)})</span>` : ""}
              </div>
              <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(learner.email || "student@ghana-edu.gov.gh")}</div>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-4">
          <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            ${learner.class_level || "Basic 9A"}
          </span>
        </td>
        <td class="py-3.5 px-4">${presenceBadge}</td>
        <td class="py-3.5 px-4">${academicPill}</td>
        <td class="py-3.5 px-4 text-right">
          <button
            class="admin-chat-student-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
            data-student-id="${learner.id}"
          >
            <i class="fa-solid fa-comments"></i>
            <span>Chat</span>
          </button>
        </td>
      </tr>
    `;
  }).join("");

  // Attach 1-on-1 Chat button handlers
  document.querySelectorAll(".admin-chat-student-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const studentId = btn.getAttribute("data-student-id");
      const targetStudent = state.allLearners.find((l) => l.id === studentId);
      if (targetStudent) {
        openChatWithUser(targetStudent);
      }
    });
  });
}

// ------------------------------------------------------------------------------
// In-App Notifications Controller
// ------------------------------------------------------------------------------
async function initNotifications() {
  const classFilter = state.isAdmin ? "ALL" : (state.profile?.class_level || "ALL");
  state.notifications = await fetchNotifications(classFilter);
  renderNotifications();
}

function renderNotifications() {
  if (!notifListContainer) return;

  const readSet = state.readNotificationIds;
  const unreadCount = state.notifications.filter((n) => !readSet.has(n.id)).length;

  if (notifBadge) {
    if (unreadCount > 0) {
      notifBadge.textContent = unreadCount;
      notifBadge.classList.remove("hidden");
    } else {
      notifBadge.classList.add("hidden");
    }
  }

  if (notifUnreadPill) {
    notifUnreadPill.textContent = `${unreadCount} New`;
  }

  if (state.notifications.length === 0) {
    notifListContainer.innerHTML = `
      <div class="p-8 text-center text-slate-400">
        <i class="fa-regular fa-bell-slash text-2xl mb-1 block"></i>
        <p class="text-xs">No notifications at this time.</p>
      </div>
    `;
    return;
  }

  notifListContainer.innerHTML = state.notifications.map((n) => {
    const isUnread = !readSet.has(n.id);
    let icon = "fa-bullhorn text-indigo-600";
    if (n.type === "DEADLINE") icon = "fa-clock text-rose-500";
    if (n.type === "GENERAL") icon = "fa-info-circle text-blue-500";

    return `
      <div class="p-4 hover:bg-slate-50 transition cursor-pointer relative ${isUnread ? 'bg-indigo-50/40 border-l-4 border-indigo-600' : ''}" data-notif-id="${n.id}">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-white shadow-xs border border-slate-100 flex items-center justify-center shrink-0 mt-0.5">
            <i class="fa-solid ${icon} text-xs"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1 mb-0.5">
              <h5 class="text-xs font-bold text-slate-900 truncate">${escapeHtml(n.title)}</h5>
              <span class="text-[10px] text-slate-400 shrink-0">${formatTimeAgo(n.created_at)}</span>
            </div>
            <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-2">${escapeHtml(n.message)}</p>
            <div class="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100">
              <span class="text-slate-400 font-medium">By: ${escapeHtml(n.sender_name || "Admin")}</span>
              <div class="flex items-center gap-1.5">
                <span class="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">${escapeHtml(n.target_class || "ALL")}</span>
                ${isUnread 
                  ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Unseen</span>` 
                  : `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><i class="fa-solid fa-check-double text-emerald-600"></i> Read &amp; Seen</span>`}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Clicking an unread notification marks it read
  notifListContainer.querySelectorAll("[data-notif-id]").forEach((item) => {
    item.addEventListener("click", () => {
      const notifId = item.getAttribute("data-notif-id");
      if (notifId && !state.readNotificationIds.has(notifId)) {
        state.readNotificationIds.add(notifId);
        localStorage.setItem("jhs_read_notifications", JSON.stringify([...state.readNotificationIds]));
        renderNotifications();
      }
    });
  });
}

function markAllNotificationsRead() {
  state.notifications.forEach((n) => state.readNotificationIds.add(n.id));
  localStorage.setItem("jhs_read_notifications", JSON.stringify([...state.readNotificationIds]));
  renderNotifications();
}

async function handleBroadcastSubmit(e) {
  e.preventDefault();

  const title = notifTitleInput?.value.trim();
  const targetClass = notifTargetClass?.value || "ALL";
  const message = notifMessageInput?.value.trim();

  if (!title || !message) {
    alert("Please enter both a title and message body for the announcement.");
    return;
  }

  sendBroadcastSubmitBtn.disabled = true;
  sendBroadcastSubmitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Broadcasting...`;

  try {
    const payload = {
      title,
      target_class: targetClass,
      message,
      type: "ANNOUNCEMENT",
      sender_name: state.profile?.full_name ? `${state.profile.full_name} (Admin)` : "Master Debrah (Admin)",
    };

    const created = await sendNotification(payload);
    state.notifications.unshift(created);

    // Reset Form
    notifTitleInput.value = "";
    notifMessageInput.value = "";

    // Update KPI & Notifications list
    if (kpiNotifsSent) kpiNotifsSent.textContent = state.notifications.length;
    renderNotifications();

    alert(`Notification broadcast successfully dispatched to ${targetClass === "ALL" ? "all learners" : targetClass}!`);
  } catch (err) {
    console.error("Broadcast failed:", err);
    alert("Failed to send broadcast. Please try again.");
  } finally {
    sendBroadcastSubmitBtn.disabled = false;
    sendBroadcastSubmitBtn.innerHTML = `<i class="fa-solid fa-bullhorn"></i><span>Broadcast Notification</span>`;
  }
}

// ------------------------------------------------------------------------------
// Realtime Floating Chat Widget Controller
// ------------------------------------------------------------------------------
async function initChat() {
  state.chatMessages = await fetchChatMessages();
  renderChatPartnerHeader();
  renderChatMessages();
}

function renderChatPartnerHeader() {
  const myAvatar = state.isAdmin ? TEACHER_AVATAR : (state.profile?.avatar_url || AVATAR_PRESETS[0]);
  if (chatUserAvatar) chatUserAvatar.src = myAvatar;

  if (state.isAdmin) {
    if (state.activeChatPartner) {
      chatPartnerName.textContent = `${state.activeChatPartner.full_name} (${state.activeChatPartner.class_level})`;
      chatPartnerAvatar.src = state.activeChatPartner.avatar_url || AVATAR_PRESETS[0];
      chatPartnerStatus.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${state.activeChatPartner.is_online ? 'bg-emerald-400' : 'bg-slate-300'}"></span> ${state.activeChatPartner.is_online ? 'Active Now • Online' : 'Offline'}`;
    } else {
      chatPartnerName.textContent = "General Student Help Desk";
      chatPartnerAvatar.src = AVATAR_PRESETS[0];
      chatPartnerStatus.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Click Chat on any student in directory`;
    }
  } else {
    chatPartnerName.textContent = "Master Debrah (Admin)";
    chatPartnerAvatar.src = TEACHER_AVATAR;
    chatPartnerStatus.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online • Continuous Assessment Support`;
  }
}

function openChatWithUser(student) {
  state.activeChatPartner = student;
  renderChatPartnerHeader();
  chatWindow.classList.remove("hidden");
  chatMessageInput.focus();
  markCurrentChatAsSeen();
  renderChatMessages();
}

async function markCurrentChatAsSeen() {
  const viewerRole = state.isAdmin ? "admin" : "learner";
  await markChatMessagesAsRead(viewerRole);
  let changed = false;
  state.chatMessages.forEach((m) => {
    if (m.sender_role !== viewerRole && !m.read) {
      m.read = true;
      m.read_at = new Date().toISOString();
      changed = true;
    }
  });
  if (changed) {
    renderChatMessages();
  }
}

function renderChatMessages() {
  if (!chatMessagesContainer) return;

  const currentName = state.profile?.full_name || (state.isAdmin ? "Master Debrah" : "Kwame Mensah");
  const myAvatar = state.isAdmin ? TEACHER_AVATAR : (state.profile?.avatar_url || AVATAR_PRESETS[0]);
  const defaultPartnerAvatar = state.isAdmin
    ? (state.activeChatPartner?.avatar_url || AVATAR_PRESETS[0])
    : TEACHER_AVATAR;

  const messageCardsHtml = state.chatMessages.map((msg) => {
    const isMe = msg.sender_role === (state.isAdmin ? "admin" : "learner") || msg.sender_name.includes(currentName);
    const senderAvatar = isMe ? myAvatar : (msg.sender_role === "admin" ? TEACHER_AVATAR : (state.activeChatPartner?.avatar_url || defaultPartnerAvatar));

    // Render Media Attachment if present
    let mediaContent = "";
    if (msg.media_type === "image" && msg.media_url) {
      mediaContent = `
        <div class="mt-2">
          <img
            src="${msg.media_url}"
            alt="${escapeHtml(msg.media_name || 'Shared Assessment Photo')}"
            class="chat-lightbox-trigger rounded-xl max-h-48 w-full object-cover border border-white/25 shadow-xs cursor-pointer hover:opacity-95 transition"
            data-img-url="${msg.media_url}"
            data-img-caption="${escapeHtml(msg.media_name || 'Assessment Photo')}"
            title="Click to enlarge"
          />
          ${msg.media_name ? `<span class="text-[10px] ${isMe ? 'text-indigo-200' : 'text-slate-400'} block mt-1 truncate"><i class="fa-regular fa-image mr-1"></i>${escapeHtml(msg.media_name)}</span>` : ''}
        </div>
      `;
    } else if (msg.media_type === "audio" && msg.media_url) {
      mediaContent = `
        <div class="mt-2 p-2 rounded-xl ${isMe ? 'bg-indigo-700/60 border border-indigo-400/30' : 'bg-slate-100 border border-slate-200'} flex items-center gap-2.5">
          <button type="button" class="audio-play-toggle-btn w-8 h-8 rounded-full ${isMe ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'} flex items-center justify-center shrink-0 shadow-xs hover:scale-105 transition cursor-pointer" title="Play / Pause Audio">
            <i class="fa-solid fa-play text-xs ml-0.5"></i>
          </button>
          <audio src="${msg.media_url}" preload="metadata" class="chat-audio-element hidden"></audio>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-0.5 h-3.5 mb-1 text-current opacity-80">
              <span class="soundwave-bar h-2"></span>
              <span class="soundwave-bar h-3.5"></span>
              <span class="soundwave-bar h-2"></span>
              <span class="soundwave-bar h-4"></span>
              <span class="soundwave-bar h-2.5"></span>
            </div>
            <div class="flex items-center justify-between text-[10px] ${isMe ? 'text-indigo-200' : 'text-slate-500'}">
              <span><i class="fa-solid fa-microphone text-[9px] mr-1"></i>Voice Note</span>
              <span class="font-mono font-bold">${msg.audio_duration || '0:06'}</span>
            </div>
          </div>
        </div>
      `;
    } else if (msg.media_type === "file" && msg.media_url) {
      mediaContent = `
        <div class="mt-2 p-2 rounded-xl ${isMe ? 'bg-indigo-700/60 border border-indigo-400/30' : 'bg-slate-100 border border-slate-200'} flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-200 flex items-center justify-center shrink-0">
              <i class="fa-solid fa-file-waveform text-xs"></i>
            </div>
            <div class="min-w-0">
              <span class="font-bold text-[11px] block truncate">${escapeHtml(msg.media_name || 'Document.pdf')}</span>
              <span class="text-[9px] opacity-75">${msg.media_size || 'Attached File'}</span>
            </div>
          </div>
          <a href="${msg.media_url}" download="${msg.media_name || 'attachment'}" class="text-[10px] font-bold underline shrink-0 hover:opacity-80">View</a>
        </div>
      `;
    }

    if (isMe) {
      const readReceipt = msg.read
        ? `<span class="inline-flex items-center gap-1 text-[10px] text-sky-200 font-bold" title="Seen ${msg.read_at ? 'at ' + formatTime(msg.read_at) : 'by recipient'}"><i class="fa-solid fa-check-double text-sky-300 text-[11px]"></i> Seen</span>`
        : `<span class="inline-flex items-center gap-1 text-[10px] text-indigo-200 opacity-80" title="Delivered • Not seen yet"><i class="fa-solid fa-check text-indigo-300 text-[11px]"></i> Sent</span>`;

      return `
        <div class="flex justify-end items-end gap-2 group">
          <div class="max-w-[78%] bg-indigo-600 text-white rounded-2xl rounded-br-xs px-3.5 py-2 text-xs shadow-xs">
            <div class="flex items-center justify-between gap-3 mb-0.5">
              <span class="font-bold text-[10px] text-indigo-200">You (${state.isAdmin ? 'Admin' : 'Student'})</span>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-[9px] text-indigo-200">${formatTime(msg.created_at)}</span>
                ${readReceipt}
              </div>
            </div>
            ${msg.message ? `<p class="leading-relaxed text-white">${escapeHtml(msg.message)}</p>` : ''}
            ${mediaContent}
          </div>
          <img src="${senderAvatar}" alt="You" title="You" class="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-200 shrink-0 mb-0.5 shadow-xs" />
        </div>
      `;
    } else {
      return `
        <div class="flex justify-start items-end gap-2 group">
          <img src="${senderAvatar}" alt="${escapeHtml(msg.sender_name)}" title="${escapeHtml(msg.sender_name)}" class="w-7 h-7 rounded-full object-cover ring-2 ring-slate-200 shrink-0 mb-0.5 shadow-xs" />
          <div class="max-w-[78%] bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-3.5 py-2 text-xs shadow-xs text-slate-800">
            <div class="flex items-center justify-between gap-3 mb-0.5">
              <span class="font-bold text-[10px] text-indigo-600">${escapeHtml(msg.sender_name)}</span>
              <span class="text-[9px] text-slate-400 shrink-0">${formatTime(msg.created_at)}</span>
            </div>
            ${msg.message ? `<p class="leading-relaxed text-slate-700">${escapeHtml(msg.message)}</p>` : ''}
            ${mediaContent}
          </div>
        </div>
      `;
    }
  }).join("");

  // Thread-level read/seen receipt below last outgoing message
  const lastMsg = state.chatMessages[state.chatMessages.length - 1];
  const partnerName = state.isAdmin ? (state.activeChatPartner?.full_name || "Student") : "Master Debrah";
  let threadSeenFooter = "";
  if (lastMsg && (lastMsg.sender_role === (state.isAdmin ? "admin" : "learner") || lastMsg.sender_name.includes(currentName))) {
    if (lastMsg.read) {
      threadSeenFooter = `
        <div class="flex justify-end pr-9 -mt-1 mb-2">
          <span class="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <i class="fa-solid fa-check-double text-indigo-600"></i> Seen by ${escapeHtml(partnerName)} ${lastMsg.read_at ? 'at ' + formatTime(lastMsg.read_at) : 'just now'}
          </span>
        </div>
      `;
    } else {
      threadSeenFooter = `
        <div class="flex justify-end pr-9 -mt-1 mb-2">
          <span class="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <i class="fa-solid fa-check text-slate-400"></i> Delivered • Not seen yet
          </span>
        </div>
      `;
    }
  }

  chatMessagesContainer.innerHTML = messageCardsHtml + threadSeenFooter;

  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

  // Wire up audio playback triggers
  chatMessagesContainer.querySelectorAll(".audio-play-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const container = btn.closest("div");
      const audio = container.querySelector(".chat-audio-element");
      if (!audio) return;

      if (audio.paused) {
        if (activePlayingAudio && activePlayingAudio !== audio) {
          activePlayingAudio.pause();
          activePlayingAudio.currentTime = 0;
          document.querySelectorAll(".audio-play-toggle-btn i").forEach((icon) => {
            icon.className = "fa-solid fa-play text-xs ml-0.5";
          });
        }
        audio.play().catch((e) => console.warn("Audio playback err:", e));
        activePlayingAudio = audio;
        btn.querySelector("i").className = "fa-solid fa-pause text-xs";
      } else {
        audio.pause();
        btn.querySelector("i").className = "fa-solid fa-play text-xs ml-0.5";
      }

      audio.onended = () => {
        btn.querySelector("i").className = "fa-solid fa-play text-xs ml-0.5";
      };
    });
  });

  // Wire up image lightbox preview triggers
  chatMessagesContainer.querySelectorAll(".chat-lightbox-trigger").forEach((imgEl) => {
    imgEl.addEventListener("click", () => {
      const url = imgEl.getAttribute("data-img-url");
      const caption = imgEl.getAttribute("data-img-caption");
      openMediaLightbox(url, caption);
    });
  });
}

function openMediaLightbox(url, caption) {
  if (!mediaLightboxModal) return;
  if (lightboxImg) lightboxImg.src = url;
  if (lightboxCaption) lightboxCaption.textContent = caption || "Assessment Shared Media";
  mediaLightboxModal.classList.remove("hidden");
}

function showTypingIndicator(senderName, isTyping) {
  if (!chatTypingIndicator) return;
  if (isTyping) {
    if (chatTypingText) chatTypingText.textContent = `${senderName} is typing...`;
    chatTypingIndicator.classList.remove("hidden");
    if (chatMessagesContainer) {
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }
  } else {
    chatTypingIndicator.classList.add("hidden");
  }
}

function simulatePartnerReply(triggerType = "text") {
  const partnerName = state.isAdmin ? (state.activeChatPartner?.full_name || "Kwame Mensah Frimpong") : "Master Debrah (Admin)";

  setTimeout(() => {
    showTypingIndicator(partnerName, true);
    setTimeout(async () => {
      showTypingIndicator(partnerName, false);

      let replyText = "Thank you for reaching out! Your question has been recorded in the assessment registry.";
      let mediaType = "text";
      let mediaUrl = null;
      let audioDuration = null;

      if (state.isAdmin) {
        if (triggerType === "audio") {
          replyText = "Thank you sir! I have received and listened to your voice feedback on my algorithm.";
        } else if (triggerType === "image") {
          replyText = "Thank you sir! I am updating my CAT flowchart based on your notes.";
        } else {
          replyText = "Yes sir, I understand clearly. Thank you for the guidance!";
        }
      } else {
        if (triggerType === "audio") {
          replyText = "Voice note received Kwame! Here is my audio response on the flowchart loop exit logic.";
          mediaType = "audio";
          mediaUrl = "https://cdn.freesound.org/previews/263/263133_2064400-lq.mp3";
          audioDuration = "0:06";
        } else if (triggerType === "image") {
          replyText = "Diagram received Kwame! The loop structure and decision box look properly defined. You may proceed to submit.";
        } else {
          replyText = "Thank you Kwame! I am reviewing your Continuous Assessment scores.";
        }
      }

      // Mark all preceding messages sent by user as seen/read by partner
      const viewerRole = state.isAdmin ? "admin" : "learner";
      state.chatMessages.forEach((m) => {
        if (m.sender_role === viewerRole && !m.read) {
          m.read = true;
          m.read_at = new Date().toISOString();
        }
      });

      const replyPayload = {
        sender_name: partnerName,
        sender_role: state.isAdmin ? "learner" : "admin",
        message: replyText,
        media_type: mediaType,
        media_url: mediaUrl,
        audio_duration: audioDuration,
        read: true,
        read_at: new Date().toISOString(),
      };

      const res = await sendChatMessage(replyPayload);
      state.chatMessages.push(res);
      renderChatMessages();
    }, 1800);
  }, 600);
}

function handleFileSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const dataUrl = event.target.result;
    const isImg = file.type.startsWith("image/");
    const isAud = file.type.startsWith("audio/");
    currentAttachment = {
      file,
      dataUrl,
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      type: isImg ? "image" : (isAud ? "audio" : "file"),
    };

    if (chatAttachmentPreview) {
      chatAttachmentPreview.classList.remove("hidden");
      if (chatPreviewFilename) chatPreviewFilename.textContent = file.name;
      if (chatPreviewFilesize) chatPreviewFilesize.textContent = `${currentAttachment.size} • Ready to send`;

      if (isImg && chatPreviewThumb && chatPreviewDocIcon) {
        chatPreviewThumb.src = dataUrl;
        chatPreviewThumb.classList.remove("hidden");
        chatPreviewDocIcon.classList.add("hidden");
      } else if (chatPreviewThumb && chatPreviewDocIcon) {
        chatPreviewThumb.classList.add("hidden");
        chatPreviewDocIcon.classList.remove("hidden");
      }
    }
  };
  reader.readAsDataURL(file);
}

function clearAttachment() {
  currentAttachment = null;
  if (chatFileInput) chatFileInput.value = "";
  if (chatAttachmentPreview) chatAttachmentPreview.classList.add("hidden");
}

function formatRecordingTime(totalSecs) {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

async function startAudioRecording() {
  audioChunks = [];
  recordingSeconds = 0;
  if (recordingTimer) recordingTimer.textContent = "0:00";

  if (chatRecordingBar && chatInputForm) {
    chatInputForm.classList.add("hidden");
    chatRecordingBar.classList.remove("hidden");
  }
  isRecordingAudio = true;

  recordingInterval = setInterval(() => {
    recordingSeconds++;
    if (recordingTimer) recordingTimer.textContent = formatRecordingTime(recordingSeconds);
  }, 1000);

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingAudioStream = stream;
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.start();
    }
  } catch (err) {
    console.warn("Microphone hardware access not active, running voice note simulation:", err);
  }
}

function cancelAudioRecording() {
  if (recordingInterval) clearInterval(recordingInterval);
  if (recordingAudioStream) {
    recordingAudioStream.getTracks().forEach((t) => t.stop());
    recordingAudioStream = null;
  }
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    try { mediaRecorder.stop(); } catch (e) {}
  }
  audioChunks = [];
  isRecordingAudio = false;

  if (chatRecordingBar && chatInputForm) {
    chatRecordingBar.classList.add("hidden");
    chatInputForm.classList.remove("hidden");
  }
}

async function sendAudioRecording() {
  if (recordingInterval) clearInterval(recordingInterval);
  const durationSec = recordingSeconds > 0 ? recordingSeconds : 6;
  const durationStr = formatRecordingTime(durationSec);

  let finalAudioUrl = "https://cdn.freesound.org/previews/263/263133_2064400-lq.mp3";

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    try {
      mediaRecorder.stop();
      await new Promise((resolve) => {
        mediaRecorder.onstop = () => {
          if (audioChunks.length > 0) {
            const blob = new Blob(audioChunks, { type: "audio/webm" });
            finalAudioUrl = URL.createObjectURL(blob);
          }
          resolve();
        };
      });
    } catch (e) {
      console.warn("Media recorder stop error:", e);
    }
  }

  if (recordingAudioStream) {
    recordingAudioStream.getTracks().forEach((t) => t.stop());
    recordingAudioStream = null;
  }
  isRecordingAudio = false;

  if (chatRecordingBar && chatInputForm) {
    chatRecordingBar.classList.add("hidden");
    chatInputForm.classList.remove("hidden");
  }

  const senderRole = state.isAdmin ? "admin" : "learner";
  const senderName = state.isAdmin
    ? `${state.profile?.full_name || "Master Debrah"} (Admin)`
    : `${state.profile?.full_name || "Student Learner"}`;

  const payload = {
    sender_name: senderName,
    sender_role: senderRole,
    message: `Voice Note (${durationStr})`,
    media_type: "audio",
    media_url: finalAudioUrl,
    media_name: `Voice_Note_${Date.now()}.mp3`,
    audio_duration: durationStr,
  };

  const newMsg = await sendChatMessage(payload);
  state.chatMessages.push(newMsg);
  renderChatMessages();

  simulatePartnerReply("audio");
}

async function handleChatInputSubmit(e) {
  e.preventDefault();
  const text = chatMessageInput?.value.trim();
  const hasAttachment = Boolean(currentAttachment);

  if (!text && !hasAttachment) return;

  const senderRole = state.isAdmin ? "admin" : "learner";
  const senderName = state.isAdmin
    ? `${state.profile?.full_name || "Master Debrah"} (Admin)`
    : `${state.profile?.full_name || "Student Learner"}`;

  chatMessageInput.value = "";

  const payload = {
    sender_name: senderName,
    sender_role: senderRole,
    message: text || (currentAttachment ? `Shared ${currentAttachment.name}` : ""),
    media_type: currentAttachment ? currentAttachment.type : "text",
    media_url: currentAttachment ? currentAttachment.dataUrl : null,
    media_name: currentAttachment ? currentAttachment.name : null,
    media_size: currentAttachment ? currentAttachment.size : null,
  };

  const triggerType = currentAttachment ? currentAttachment.type : "text";
  clearAttachment();

  const newMsg = await sendChatMessage(payload);
  state.chatMessages.push(newMsg);
  renderChatMessages();

  simulatePartnerReply(triggerType);
}

// ------------------------------------------------------------------------------
// Modals & Score Details
// ------------------------------------------------------------------------------
function openScoreDetailsModal(submission) {
  const asmt = submission.assessments || {};
  const maxScore = parseFloat(submission.max_score || asmt.max_score || 20);
  const scoreVal = parseFloat(submission.score || 0);
  const pct = Math.round((scoreVal / maxScore) * 100);

  scoreModalTitle.textContent = asmt.title || "Assessment Score Card";
  scoreModalSubtitle.textContent = `${asmt.subject || "Continuous Assessment"} • Basic 9`;
  modalScoreNum.textContent = scoreVal.toFixed(1);
  modalMaxScore.textContent = `/ ${maxScore}`;
  modalScorePct.textContent = `${pct}%`;

  if (pct >= 80) {
    modalGradeLabel.textContent = "Distinction";
    modalGradeLabel.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800";
  } else if (pct >= 65) {
    modalGradeLabel.textContent = "Credit";
    modalGradeLabel.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800";
  } else {
    modalGradeLabel.textContent = "Pass";
    modalGradeLabel.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800";
  }

  modalSubmittedDate.textContent = formatDateTime(submission.submitted_at);

  const learnerClass = state.profile?.class_level || "Basic 9A";
  const totalStudents = getClassTotalStudents(learnerClass);
  const rankNum = submission.submission_rank || 1;
  const ordinalRank = getOrdinalSuffix(rankNum);

  if (modalSubmissionRank) {
    modalSubmissionRank.innerHTML = `<i class="fa-solid fa-list-ol text-amber-600"></i> ${ordinalRank} person to submit out of ${totalStudents} students (${learnerClass})`;
  }

  modalSubject.textContent = asmt.subject || "General";
  modalType.textContent = asmt.assessment_type === "PROJECT_WORK" ? "Practical Project Work" : "Continuous Assessment Test (CAT)";
  
  if (submission.correct_count != null && submission.incorrect_count != null) {
    modalRemarks.innerHTML = `
      <div class="mb-2 flex items-center gap-2">
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
          <i class="fa-solid fa-check"></i> ${submission.correct_count} Correct
        </span>
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
          <i class="fa-solid fa-xmark"></i> ${submission.incorrect_count} Incorrect
        </span>
      </div>
      <p class="text-xs text-slate-700 italic leading-relaxed">
        "${escapeHtml(submission.teacher_remarks || 'Assessment verified and recorded in school registry.')}"
      </p>
    `;
  } else {
    modalRemarks.textContent = submission.teacher_remarks || "Assessment verified and recorded in school registry.";
  }

  scoreDetailsModal.classList.remove("hidden");
}

function openBackendConfig() {
  const { url, anonKey } = getSupabaseConfig();
  const cfgUrlEl = document.getElementById("cfgSupabaseUrl");
  if (cfgUrlEl) cfgUrlEl.value = url;
  if (cfgAnonKey) cfgAnonKey.value = anonKey;
  backendConfigModal.classList.remove("hidden");
}

function handleSaveConfig() {
  const keyVal = cfgAnonKey.value.trim();
  saveSupabaseConfig(null, keyVal);
  backendConfigModal.classList.add("hidden");
  alert("Supabase credentials updated! The portal will now reload to synchronize.");
  window.location.reload();
}

// ------------------------------------------------------------------------------
// Helpers, Timers & Quotes
// ------------------------------------------------------------------------------
function initCountdownTimer() {
  function updateCountdown() {
    const deadline = new Date(Date.now() + 4 * 86400000 + 5 * 3600000);
    const now = new Date();
    const diff = deadline - now;

    if (diff <= 0) {
      if (bannerDeadline) bannerDeadline.textContent = "EXPIRED";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (bannerDeadline) {
      bannerDeadline.innerHTML = `<i class="fa-regular fa-clock text-amber-400"></i> ${days}d ${hours}h ${minutes}m ${seconds}s left`;
    }
  }

  updateCountdown();
  state.countdownInterval = setInterval(updateCountdown, 1000);
}

function initQuotes() {
  rotateQuote();
}

function rotateQuote() {
  const randomQ = INSPIRATIONAL_QUOTES[Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length)];
  if (quoteText && quoteAuthor) {
    quoteText.textContent = `"${randomQ.text}"`;
    quoteAuthor.textContent = `— ${randomQ.author}`;
  }
}

function getClassTotalStudents(classLevel) {
  if (!classLevel) return 45;
  const trimmed = classLevel.trim();
  return CLASS_REGISTRY_SIZES[trimmed] || 45;
}

function getOrdinalSuffix(i) {
  const j = i % 10;
  const k = i % 100;
  if (j === 1 && k !== 11) return `${i}st`;
  if (j === 2 && k !== 12) return `${i}nd`;
  if (j === 3 && k !== 13) return `${i}rd`;
  return `${i}th`;
}

function formatDateOnly(dateStr) {
  if (!dateStr) return "Not specified";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(isoString) {
  if (!isoString) return "Recent";
  const d = new Date(isoString);
  const datePart = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const timePart = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${datePart} at ${timePart}`;
}

function formatTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDeadline(isoString) {
  if (!isoString) return "Open";
  const d = new Date(isoString);
  const now = new Date();
  if (d < now) return "Expired (Closed)";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatTimeAgo(isoString) {
  if (!isoString) return "Just now";
  const diffSecs = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSecs < 60) return "Just now";
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  return `${Math.floor(diffSecs / 86400)}d ago`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ------------------------------------------------------------------------------
// Event Listeners Wiring
// ------------------------------------------------------------------------------
function attachEventListeners() {
  // Sign In / Out
  googleSignInBtn?.addEventListener("click", handleGoogleSignIn);
  headerSignInBtn?.addEventListener("click", handleGoogleSignIn);
  demoModeBtn?.addEventListener("click", startDemoMode);
  demoAdminBtn?.addEventListener("click", startAdminDemoMode);
  signOutBtn?.addEventListener("click", handleSignOut);

  // Auth Error Banner Actions
  dismissAuthErrorBtn?.addEventListener("click", () => {
    authErrorBanner?.classList.add("hidden");
  });
  authErrorRetryBtn?.addEventListener("click", handleGoogleSignIn);
  authErrorDemoStudentBtn?.addEventListener("click", startDemoMode);
  authErrorDemoAdminBtn?.addEventListener("click", startAdminDemoMode);

  // Birthday Celebration Actions
  triggerConfettiBtn?.addEventListener("click", launchConfetti);
  dismissBirthdayBannerBtn?.addEventListener("click", () => {
    birthdayCelebrationBanner?.classList.add("hidden");
  });

  // Profile Edit
  editProfileBtn?.addEventListener("click", () => {
    if (state.profile) {
      showOnboardingModal(state.user, state.profile);
    }
  });

  // Role Switcher Toggle
  viewModeToggleBtn?.addEventListener("click", toggleViewMode);
  adminSwitchLearnerBtn?.addEventListener("click", () => {
    state.activeView = "learner";
    localStorage.setItem("jhs_view_mode", "learner");
    renderDashboard();
  });
  adminNewBroadcastBtn?.addEventListener("click", () => {
    document.getElementById("broadcastComposerSection")?.scrollIntoView({ behavior: "smooth" });
    notifTitleInput?.focus();
  });

  // Notification Bell Toggle & Actions
  notifBellBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    notifDropdown?.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!notifDropdown?.contains(e.target) && !notifBellBtn?.contains(e.target)) {
      notifDropdown?.classList.add("hidden");
    }
  });
  markAllReadBtn?.addEventListener("click", markAllNotificationsRead);

  // Broadcast Notification Form
  broadcastNotifForm?.addEventListener("submit", handleBroadcastSubmit);

  // Admin Learners Directory Class Filter
  adminClassFilter?.addEventListener("change", renderAdminLearnersTable);

  // Floating Chat Widget Handlers
  openChatBtn?.addEventListener("click", () => {
    chatWindow?.classList.toggle("hidden");
    if (!chatWindow?.classList.contains("hidden")) {
      markCurrentChatAsSeen();
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
      chatMessageInput?.focus();
    }
  });
  closeChatBtn?.addEventListener("click", () => chatWindow?.classList.add("hidden"));
  chatInputForm?.addEventListener("submit", handleChatInputSubmit);

  // Attachment & Voice Recording Listeners
  chatAttachBtn?.addEventListener("click", () => chatFileInput?.click());
  chatFileInput?.addEventListener("change", handleFileSelect);
  chatRemoveAttachBtn?.addEventListener("click", clearAttachment);
  chatVoiceRecordBtn?.addEventListener("click", startAudioRecording);
  cancelRecordBtn?.addEventListener("click", cancelAudioRecording);
  sendRecordBtn?.addEventListener("click", sendAudioRecording);

  // Typing Effect on Input
  chatMessageInput?.addEventListener("input", () => {
    // When typing, notify or display typing indicator
  });

  // Lightbox Modal Closers
  closeLightboxBtn?.addEventListener("click", () => mediaLightboxModal?.classList.add("hidden"));
  mediaLightboxModal?.addEventListener("click", (e) => {
    if (e.target === mediaLightboxModal) mediaLightboxModal.classList.add("hidden");
  });

  // Onboarding Form & Avatar Upload
  initAvatarUploadHandler();
  onboardingForm?.addEventListener("submit", handleOnboardingSubmit);
  closeOnboardingModalBtn?.addEventListener("click", () => onboardingModal.classList.add("hidden"));

  // Status Filter Tabs
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach((t) => {
        t.className = "filter-tab px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer";
      });
      tab.className = "filter-tab px-3 py-1.5 rounded-lg bg-white text-indigo-600 shadow-xs transition-all cursor-pointer active font-semibold";
      state.filterStatus = tab.getAttribute("data-filter");
      renderAssessmentCards();
    });
  });

  // Subject Dropdown Filter
  subjectSelect?.addEventListener("change", (e) => {
    state.filterSubject = e.target.value;
    renderAssessmentCards();
  });

  // Score Modal Closers
  closeScoreModalBtn?.addEventListener("click", () => scoreDetailsModal.classList.add("hidden"));
  closeScoreModalBtn2?.addEventListener("click", () => scoreDetailsModal.classList.add("hidden"));

  // Quiz Runner Listeners
  closeQuizRunnerBtn?.addEventListener("click", closeQuizRunner);
  quizNextBtn?.addEventListener("click", handleQuizNext);
  quizSubmitBtn?.addEventListener("click", handleQuizSubmit);
  quizDoneBtn?.addEventListener("click", closeQuizRunner);

  // Admin Assessment & Term Weighting Config Listeners
  adminManageAssessmentsBtn?.addEventListener("click", openAdminAssessmentManager);
  closeAdminAsmtConfigBtn?.addEventListener("click", () => adminAssessmentConfigModal?.classList.add("hidden"));
  closeAdminAsmtConfigBtn2?.addEventListener("click", () => adminAssessmentConfigModal?.classList.add("hidden"));
  addNewAssessmentForm?.addEventListener("submit", handleAddNewAssessment);

  // Student Track Switcher Listeners
  trackBtn9A?.addEventListener("click", () => switchStudentTrack("Basic 9A"));
  trackBtn9B?.addEventListener("click", () => switchStudentTrack("Basic 9B"));

  // Admin Answer Keys & Marking Scheme Listeners
  adminViewAnswerKeysBtn?.addEventListener("click", () => openAnswerKeyModal());
  adminAutoBalanceBtn?.addEventListener("click", autoBalanceAssessmentWeights);
  closeAnswerKeyModalBtn?.addEventListener("click", () => adminAnswerKeyModal?.classList.add("hidden"));
  closeAnswerKeyModalBtn2?.addEventListener("click", () => adminAnswerKeyModal?.classList.add("hidden"));
  answerKeyAsmtSelect?.addEventListener("change", (e) => renderAnswerKeyPack(e.target.value));
  printAnswerKeyBtn?.addEventListener("click", () => window.print());

  // Config Modal Closers
  openConfigBtn?.addEventListener("click", openBackendConfig);
  closeConfigModalBtn?.addEventListener("click", () => backendConfigModal.classList.add("hidden"));
  closeConfigModalBtn2?.addEventListener("click", () => backendConfigModal.classList.add("hidden"));
  saveConfigBtn?.addEventListener("click", handleSaveConfig);

  // Quotes
  newQuoteBtn?.addEventListener("click", rotateQuote);
}

// @ts-nocheck
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
  PRIMARY_ADMIN_EMAIL,
  ADMIN_EMAILS,
  generateStudentId,
  getNextStudentSequence,
  calculateAge,
  isBirthdayToday,
  clearAllMockData,
  isMockDataCleared,
  restoreMockData,
  onAuthChange,
} from "./supabaseClient.js";

import {
  exportBroadsheetExcel,
  calculateBroadsheetData,
} from "./excelExport.ts";

import {
  COMPUTING_CAT1_9A,
  COMPUTING_CAT1_9B,
  COMPUTING_CAT2_9A,
  COMPUTING_CAT2_9B,
  COMPUTING_QUIZ_9A,
  COMPUTING_PROJECT_9,
  COMPUTING_EXAM_9,
  ALL_OFFICIAL_QUESTION_PACKS,
  getAllConfiguredQuestionPacks,
  saveConfiguredQuestion,
  deleteConfiguredQuestion,
  updateAssessmentDuration,
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
  questionCatFilter: "ALL",
  questionTrackFilter: "ALL",
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
const adminExportExcelBtn = document.getElementById("adminExportExcelBtn");
const adminExportExcelBtnText = document.getElementById("adminExportExcelBtnText");
const adminTopExportExcelBtn = document.getElementById("adminTopExportExcelBtn");
const adminClearMockBtn = document.getElementById("adminClearMockBtn");

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

// Admin Security Gatekeeper & Routing Elements
const adminGatekeeperSection = document.getElementById("adminGatekeeperSection");
const adminGatekeeperQuickBtn = document.getElementById("adminGatekeeperQuickBtn");
const adminGatekeeperGoogleBtn = document.getElementById("adminGatekeeperGoogleBtn");
const adminGatekeeperLearnerBtn = document.getElementById("adminGatekeeperLearnerBtn");
const brandLogoLink = document.getElementById("brandLogoLink");

// Admin Sub-Navigation Tabs
const adminTabOverview = document.getElementById("adminTabOverview");
const adminTabQuestions = document.getElementById("adminTabQuestions");
const adminTabAssessments = document.getElementById("adminTabAssessments");
const adminTabMarkingScheme = document.getElementById("adminTabMarkingScheme");
const adminTabBroadcast = document.getElementById("adminTabBroadcast");
const adminQuestionsNavBtn = document.getElementById("adminQuestionsNavBtn");

// Admin Subviews
const adminSubViewOverview = document.getElementById("adminSubViewOverview");
const adminSubViewQuestions = document.getElementById("adminSubViewQuestions");
const adminSubViewAssessments = document.getElementById("adminSubViewAssessments");
const adminSubViewMarkingScheme = document.getElementById("adminSubViewMarkingScheme");
const adminSubViewBroadcast = document.getElementById("adminSubViewBroadcast");

// Questions Bank & Sitting Config Elements
const addNewQuestionBtn = document.getElementById("addNewQuestionBtn");
const questionTrackFilter = document.getElementById("questionTrackFilter");
const adminQuestionSittingsContainer = document.getElementById("adminQuestionSittingsContainer");

// Assessments & Weights Table 2 Elements
const adminAutoBalanceBtn2 = document.getElementById("adminAutoBalanceBtn2");
const adminWeightStatusBadge2 = document.getElementById("adminWeightStatusBadge2");
const adminTotalWeightVal2 = document.getElementById("adminTotalWeightVal2");
const adminWeightProgressBar2 = document.getElementById("adminWeightProgressBar2");
const adminAsmtTableBody2 = document.getElementById("adminAsmtTableBody2");

// Embedded Marking Scheme & Answer Keys Elements
const printAnswerKeyBtn2 = document.getElementById("printAnswerKeyBtn2");
const embeddedAnswerKeySelect = document.getElementById("embeddedAnswerKeySelect");
const embeddedAnswerKeyTrackBadge = document.getElementById("embeddedAnswerKeyTrackBadge");
const embeddedAnswerKeyContainer = document.getElementById("embeddedAnswerKeyContainer");

// Question Editor Modal Elements
const questionEditorModal = document.getElementById("questionEditorModal");
const questionEditorModalTitle = document.getElementById("questionEditorModalTitle");
const closeQuestionEditorBtn = document.getElementById("closeQuestionEditorBtn");
const cancelQuestionEditorBtn = document.getElementById("cancelQuestionEditorBtn");
const questionEditorForm = document.getElementById("questionEditorForm");
const qEditorQuestionId = document.getElementById("qEditorQuestionId");
const qEditorAsmtSelect = document.getElementById("qEditorAsmtSelect");
const qEditorPrompt = document.getElementById("qEditorPrompt");
const qEditorPoints = document.getElementById("qEditorPoints");
const qEditorOptA = document.getElementById("qEditorOptA");
const qEditorOptB = document.getElementById("qEditorOptB");
const qEditorOptC = document.getElementById("qEditorOptC");
const qEditorOptD = document.getElementById("qEditorOptD");
const qEditorCorrectOpt = document.getElementById("qEditorCorrectOpt");
const qEditorExplanation = document.getElementById("qEditorExplanation");

// Extend Period Modal Elements
const extendPeriodModal = document.getElementById("extendPeriodModal");
const extendModalAsmtId = document.getElementById("extendModalAsmtId");
const extendModalAsmtTitle = document.getElementById("extendModalAsmtTitle");
const extendModalCurrentDeadline = document.getElementById("extendModalCurrentDeadline");
const extendCustomDatetimeInput = document.getElementById("extendCustomDatetimeInput");
const closeExtendPeriodBtn = document.getElementById("closeExtendPeriodBtn");
const cancelExtendPeriodBtn = document.getElementById("cancelExtendPeriodBtn");
const saveExtendPeriodBtn = document.getElementById("saveExtendPeriodBtn");

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
// Initialization & Application Lifecycle
// ------------------------------------------------------------------------------
async function startApplication() {
  initAvatarPresets();
  initQuotes();
  initCountdownTimer();
  attachEventListeners();
  window.addEventListener("popstate", () => handleRoute());

  // Listen for Supabase realtime OAuth events (e.g. login redirect completion)
  onAuthChange(async (event, session) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      if (session?.user && (!state.user || state.user.id !== session.user.id)) {
        await checkAuthSession();
      }
    } else if (event === "SIGNED_OUT") {
      state.user = null;
      state.profile = null;
      state.isAdmin = false;
      await handleRoute();
    }
  });

  await checkAuthSession();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => startApplication());
} else {
  startApplication();
}

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
      const gatekeeperError = document.getElementById("adminGatekeeperError");
      const gatekeeperErrorMsg = document.getElementById("adminGatekeeperErrorMsg");
      if (gatekeeperError) {
        gatekeeperError.classList.remove("hidden");
        if (gatekeeperErrorMsg) {
          gatekeeperErrorMsg.textContent = oauthDesc || oauthError || "Google Authentication failed. Please try again.";
        }
      }
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {}
    }

    let user = await getSessionUser();
    let profile = null;

    if (user) {
      state.user = user;
      profile = await fetchLearnerProfile(user.id);

      // Default profile if newly authenticated user has no profile yet
      if (!profile) {
        profile = {
          id: user.id,
          student_id: generateStudentId("Basic 9A", 1),
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Student Learner",
          email: user.email,
          gender: "Male",
          date_of_birth: "2011-10-14",
          class_level: "Basic 9A",
          role: "learner",
          avatar_url: user.user_metadata?.avatar_url || AVATAR_PRESETS[0],
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
    } else {
      state.user = null;
      state.profile = null;
      state.isAdmin = false;
    }

    const savedView = localStorage.getItem("jhs_view_mode");
    state.activeView = savedView === "admin" ? "admin" : "learner";

    if (state.user) {
      await initNotifications();
      await initChat();
    }

    await handleRoute();
  } catch (err) {
    console.error("Error checking auth session:", err);
    if (!isMockDataCleared()) {
      startDemoMode();
    } else {
      state.user = null;
      state.profile = null;
      state.isAdmin = false;
      await handleRoute();
    }
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
  document.getElementById("topAnnouncementBar")?.classList.add("hidden");
  document.getElementById("mainHeader")?.classList.add("hidden");

  authSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  adminDashboardSection.classList.add("hidden");
  adminGatekeeperSection.classList.add("hidden");
  adminGatekeeperSection.classList.remove("flex");
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

  const gatekeeperBtn = document.getElementById("adminGatekeeperGoogleBtn");
  const gatekeeperError = document.getElementById("adminGatekeeperError");
  if (gatekeeperError) gatekeeperError.classList.add("hidden");

  const originalGoogleBtnHtml = googleSignInBtn ? googleSignInBtn.innerHTML : "";
  const originalGatekeeperBtnHtml = gatekeeperBtn ? gatekeeperBtn.innerHTML : "";

  try {
    // When clicked, change button text to spinner for both learner and admin app
    if (googleSignInBtn) {
      googleSignInBtn.disabled = true;
      googleSignInBtn.classList.add("opacity-75", "cursor-wait");
      googleSignInBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-base text-indigo-600"></i>`;
    }
    if (gatekeeperBtn) {
      gatekeeperBtn.disabled = true;
      gatekeeperBtn.classList.add("opacity-75", "cursor-wait");
      gatekeeperBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-base text-white"></i>`;
    }
    if (headerSignInBtn) {
      headerSignInBtn.disabled = true;
      headerSignInBtn.classList.add("opacity-75", "cursor-wait");
      headerSignInBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-xs text-white"></i>`;
    }
    await signInWithGoogle();
  } catch (err) {
    if (googleSignInBtn) {
      googleSignInBtn.disabled = false;
      googleSignInBtn.classList.remove("opacity-75", "cursor-wait");
      googleSignInBtn.innerHTML = originalGoogleBtnHtml || `
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>Continue with Google (Gmail)</span>
      `;
    }
    if (gatekeeperBtn) {
      gatekeeperBtn.disabled = false;
      gatekeeperBtn.classList.remove("opacity-75", "cursor-wait");
      gatekeeperBtn.innerHTML = originalGatekeeperBtnHtml || `
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span id="adminGatekeeperGoogleBtnText">Sign in with Google</span>
      `;
    }
    if (headerSignInBtn) {
      headerSignInBtn.disabled = false;
      headerSignInBtn.classList.remove("opacity-75", "cursor-wait");
      headerSignInBtn.innerHTML = `<i class="fa-brands fa-google text-xs"></i> Sign In`;
    }
    if (gatekeeperError) {
      gatekeeperError.classList.remove("hidden");
      const errorMsg = document.getElementById("adminGatekeeperErrorMsg");
      if (errorMsg) errorMsg.textContent = err.message || "Could not start Google Sign In. Please try again.";
    } else {
      alert("Could not start Google Sign In. Please verify your connection.");
      openBackendConfig();
    }
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
  navigateTo("/learner");
}

function startAdminDemoMode() {
  const adminUser = {
    id: "admin-master-debrah",
    email: PRIMARY_ADMIN_EMAIL,
    user_metadata: {
      full_name: "Master Debrah (Admin & Head of Computing)",
      avatar_url: TEACHER_AVATAR,
    },
  };

  const adminProfile = {
    id: "admin-master-debrah",
    full_name: "Master Debrah",
    email: PRIMARY_ADMIN_EMAIL,
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
  navigateTo("/admin");
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
  if (state.activeView === "admin") {
    navigateTo("/learner");
  } else {
    navigateTo("/admin");
  }
}

// ------------------------------------------------------------------------------
// Header Navigation Builder
// ------------------------------------------------------------------------------
function updateHeaderNav() {
  const profile = state.profile;
  const roleBadge = state.activeView === "admin"
    ? `<span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Admin</span>`
    : `<span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800">${profile?.class_level || "Student"}</span>`;

  authNavContainer.innerHTML = `
    <div class="flex items-center gap-1.5 sm:gap-2">
      <div class="flex items-center gap-1.5 sm:gap-2 p-1 pr-2.5 rounded-full bg-slate-100 border border-slate-200">
        <img src="${profile?.avatar_url || AVATAR_PRESETS[0]}" alt="Avatar" class="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-1 ring-indigo-500 shrink-0" />
        <div class="flex items-center gap-1">
          <span class="text-xs font-semibold text-slate-800 max-w-[110px] sm:max-w-none truncate">${state.activeView === "admin" ? "Master Debrah" : (profile?.full_name || "Kwame Mensah Frimpong")}</span>
          ${roleBadge}
        </div>
      </div>
      <button id="headerSignOutBtn" class="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer" title="Sign Out">
        <i class="fa-solid fa-right-from-bracket text-xs"></i>
      </button>
    </div>
  `;
  document.getElementById("headerSignOutBtn")?.addEventListener("click", handleSignOut);

  // Manage Admin Switcher Visibility & Exact Step 10 Text Alignment
  if (adminToggleContainer && viewModeToggleBtn) {
    adminToggleContainer.classList.remove("hidden");
    if (state.activeView === "admin") {
      if (viewModeLabel) viewModeLabel.textContent = "Learner Portal";
      viewModeToggleBtn.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all cursor-pointer";
      viewModeToggleBtn.innerHTML = `<i class="fa-solid fa-graduation-cap text-indigo-600 text-xs"></i> <span>Learner Portal</span>`;
      viewModeToggleBtn.title = "Switch to Learner Portal";
    } else {
      if (viewModeLabel) viewModeLabel.textContent = "Admin Console";
      viewModeToggleBtn.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-2xs transition-all cursor-pointer";
      viewModeToggleBtn.innerHTML = `<i class="fa-solid fa-shield-halved text-indigo-400 text-xs"></i> <span>Admin Console</span>`;
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

    // Subject styles - Exclusively Computing
    const subjectClass = "bg-blue-50 text-blue-700 border-blue-200";
    const subjectIcon = "fa-laptop-code";

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
        <div class="bg-amber-50/90 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between text-xs font-bold text-amber-900 mb-3 shadow-2xs">
          <span class="flex items-center gap-1 text-amber-700 text-xs"><i class="fa-solid fa-clock animate-spin text-amber-600 text-xs"></i> Live Countdown:</span>
          <span class="asmt-live-countdown font-mono text-xs sm:text-sm text-amber-950 font-extrabold" data-unlock-time="${asmt.unlock_time}">--:--:--</span>
        </div>
      `;
    }

    // Action Button (Compact)
    let actionBtn = "";
    if (hasScore) {
      actionBtn = `
        <button class="view-score-btn w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5" data-sub-id="${sub.id}">
          <i class="fa-solid fa-file-lines text-indigo-600 text-xs"></i> View Score &amp; Feedback
        </button>
      `;
    } else if (isScheduled) {
      actionBtn = `
        <button disabled class="w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-clock text-slate-400 text-xs"></i> Locked until scheduled release
        </button>
      `;
    } else if (isAvailable) {
      actionBtn = `
        <button class="start-quiz-btn w-full py-2 px-3 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5" data-asmt-id="${asmt.id}">
          <i class="fa-solid fa-play text-xs"></i> Start Assessment (CAT)
        </button>
      `;
    } else {
      actionBtn = `
        <button disabled class="w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-lock text-slate-400 text-xs"></i> Locked by Administrator
        </button>
      `;
    }

    const cardClassTotal = getClassTotalStudents(learnerClass);
    const cardRankNum = sub?.submission_rank || 1;
    const cardOrdinal = getOrdinalSuffix(cardRankNum);

    return `
      <div class="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4.5 flex flex-col justify-between hover:shadow-xs hover:border-slate-300 transition-all">
        <div>
          <!-- Header -->
          <div class="flex items-center justify-between gap-1.5 mb-2.5">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border ${subjectClass}">
              <i class="fa-solid ${subjectIcon} text-[10px]"></i> ${asmt.subject}
            </span>
            ${statusBadge}
          </div>

          <h4 class="font-bold text-sm sm:text-base text-slate-900 mb-1 leading-snug">${asmt.title}</h4>
          <p class="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
            ${asmt.description || "Continuous assessment task under Ghana JHS curriculum."}
          </p>

          ${countdownBox}

          <!-- Details Grid -->
          <div class="space-y-1 py-2 border-y border-slate-100 text-xs text-slate-600 mb-3">
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
    alert("This assessment has been turned off / closed by the administrator or is locked until scheduled release.");
    return;
  }

  const learnerClass = state.profile?.class_level || "Basic 9A";
  const questionPack = getAssessmentQuestionPack(asmtId, learnerClass, asmt.title);
  // Anti-cheat intelligence: randomize both question order AND option order for each student paper
  const studentPaper = generateStudentPaper(questionPack);
  const sittingMinutes = questionPack?.time_limit_minutes || asmt.time_limit_minutes || 15;

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
    remainingSeconds: sittingMinutes * 60,
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
          class="quiz-option-btn w-full p-2.5 sm:p-3 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
            isSelected
              ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800 font-medium'
          }"
          data-option="${escapeHtml(optText)}"
        >
          <div class="flex items-center gap-2.5">
            <span class="quiz-letter-badge w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }">
              ${letter}
            </span>
            <span class="text-xs sm:text-sm leading-relaxed">${escapeHtml(optText)}</span>
          </div>
          <div class="quiz-radio-outer w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
          }">
            <span class="quiz-radio-inner">${isSelected ? '<span class="w-1.5 h-1.5 rounded-full bg-white block"></span>' : ''}</span>
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
          b.className = `quiz-option-btn w-full p-2.5 sm:p-3 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
            isThis
              ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800 font-medium'
          }`;
          const badge = b.querySelector(".quiz-letter-badge");
          if (badge) {
            badge.className = `quiz-letter-badge w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
              isThis ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }`;
          }
          const radioOuter = b.querySelector(".quiz-radio-outer");
          if (radioOuter) {
            radioOuter.className = `quiz-radio-outer w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              isThis ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
            }`;
          }
          const radioInner = b.querySelector(".quiz-radio-inner");
          if (radioInner) {
            radioInner.innerHTML = isThis ? '<span class="w-1.5 h-1.5 rounded-full bg-white block"></span>' : '';
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

  const asmts = (state.assessments || []).filter(a => a.subject !== "Mathematics");
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
  const questions = questionPack?.questions || (Array.isArray(questionPack) ? questionPack : []);

  if (!questions || questions.length === 0) {
    answerKeyQuestionsContainer.innerHTML = `
      <div class="text-center py-12 text-slate-400">
        <i class="fa-solid fa-triangle-exclamation text-3xl mb-2 text-amber-500 block"></i>
        No marking scheme registered for this assessment item.
      </div>
    `;
    return;
  }

  const optionLetters = ["A", "B", "C", "D", "E"];
  answerKeyQuestionsContainer.innerHTML = questions.map((q, idx) => {
    return `
      <div class="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              Q${idx + 1}
            </span>
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">${escapeHtml(q.topic || asmt?.subject || 'Curriculum')}</span>
          </div>
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">${q.points || 2} Marks</span>
        </div>

        <p class="text-sm font-semibold text-slate-900 leading-relaxed">${escapeHtml(q.prompt)}</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          ${(q.options || []).map((opt, optIdx) => {
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

function renderEmbeddedAnswerKeyView(asmtId = null) {
  if (!embeddedAnswerKeyContainer) return;
  const asmts = (state.assessments || []).filter(a => a.subject !== "Mathematics");

  if (embeddedAnswerKeySelect) {
    embeddedAnswerKeySelect.innerHTML = asmts.map((a) => {
      return `<option value="${a.id}">${escapeHtml(a.title)} (${escapeHtml(a.class_level || 'Basic 9')} - ${escapeHtml(a.subject)})</option>`;
    }).join("");

    if (asmtId) {
      embeddedAnswerKeySelect.value = asmtId;
    }
  }

  const activeId = asmtId || embeddedAnswerKeySelect?.value || (asmts.length > 0 ? asmts[0].id : null);
  if (!activeId) {
    embeddedAnswerKeyContainer.innerHTML = `<div class="text-center py-12 text-slate-400">No assessments available.</div>`;
    return;
  }

  const asmt = asmts.find(a => a.id === activeId);
  const classLevel = asmt?.class_level || "Basic 9A";
  if (embeddedAnswerKeyTrackBadge) {
    embeddedAnswerKeyTrackBadge.textContent = `${classLevel} Track`;
  }

  const questionPack = getAssessmentQuestionPack(activeId, classLevel, asmt?.title);
  const questions = questionPack?.questions || (Array.isArray(questionPack) ? questionPack : []);

  if (!questions || questions.length === 0) {
    embeddedAnswerKeyContainer.innerHTML = `
      <div class="text-center py-12 text-slate-400">
        <i class="fa-solid fa-triangle-exclamation text-3xl mb-2 text-amber-500 block"></i>
        No marking scheme registered for this assessment item.
      </div>
    `;
    return;
  }

  const optionLetters = ["A", "B", "C", "D", "E"];
  embeddedAnswerKeyContainer.innerHTML = questions.map((q, idx) => {
    return `
      <div class="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              Q${idx + 1}
            </span>
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">${escapeHtml(q.topic || asmt?.subject || 'Curriculum')}</span>
          </div>
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">${q.points || 2} Marks</span>
        </div>

        <p class="text-sm font-semibold text-slate-900 leading-relaxed">${escapeHtml(q.prompt)}</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          ${(q.options || []).map((opt, optIdx) => {
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
// ------------------------------------------------------------------------------
// Client-Side Router & Access Control Controller
// ------------------------------------------------------------------------------
function navigateTo(path, replace = false) {
  if (replace) {
    window.history.replaceState({}, "", path);
  } else {
    window.history.pushState({}, "", path);
  }
  handleRoute();
}

async function handleRoute() {
  const path = window.location.pathname.toLowerCase();

  // If path targets administrator surfaces (/admin or /admin/*)
  if (path === "/admin" || path.startsWith("/admin/")) {
    state.activeView = "admin";
    updateHeaderNav();

    // STRICT SECURITY GATEKEEPER:
    // Requires verified email 'computing.b9@gmail.com'
    const isAuthorizedAdmin = (state.user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

    if (!isAuthorizedAdmin) {
      // Show Gatekeeper Clearance Screen - Only the sign in form, simply centered
      document.getElementById("topAnnouncementBar")?.classList.add("hidden");
      document.getElementById("mainHeader")?.classList.add("hidden");
      document.getElementById("mainFooter")?.classList.add("hidden");

      authSection?.classList.add("hidden");
      dashboardSection?.classList.add("hidden");
      adminDashboardSection?.classList.add("hidden");
      adminGatekeeperSection?.classList.remove("hidden");
      adminGatekeeperSection?.classList.add("flex");

      const gatekeeperError = document.getElementById("adminGatekeeperError");
      const gatekeeperErrorMsg = document.getElementById("adminGatekeeperErrorMsg");
      const gatekeeperGoogleBtnText = document.getElementById("adminGatekeeperGoogleBtnText");

      // Check if user authenticated with an unauthorized email
      const currentEmail = state.user?.email;
      const isRealUser = state.user && !state.user.id?.startsWith("demo-") && state.user.id !== "lrn-001";

      if (isRealUser && currentEmail && currentEmail.toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase()) {
        if (gatekeeperError) gatekeeperError.classList.remove("hidden");
        if (gatekeeperErrorMsg) {
          gatekeeperErrorMsg.innerHTML = `<strong>${escapeHtml(currentEmail)}</strong> is not authorized. Please choose your dedicated administrator Gmail (<code>${PRIMARY_ADMIN_EMAIL}</code>).`;
        }
        if (gatekeeperGoogleBtnText) {
          gatekeeperGoogleBtnText.textContent = "Choose another Google Account";
        }
      } else {
        if (gatekeeperError) gatekeeperError.classList.add("hidden");
        if (gatekeeperGoogleBtnText) {
          gatekeeperGoogleBtnText.textContent = "Sign in with Google";
        }
      }
      return;
    }

    // Authorized Admin
    document.getElementById("topAnnouncementBar")?.classList.remove("hidden");
    document.getElementById("mainHeader")?.classList.remove("hidden");
    document.getElementById("mainFooter")?.classList.remove("hidden");

    adminGatekeeperSection?.classList.add("hidden");
    adminGatekeeperSection?.classList.remove("flex");
    authSection?.classList.add("hidden");
    dashboardSection?.classList.add("hidden");
    adminDashboardSection?.classList.remove("hidden");
    floatingChatContainer?.classList.remove("hidden");

    if (!state.assessments || state.assessments.length === 0) {
      state.assessments = await fetchAssessments();
    }

    // Resolve subviews
    if (path.includes("/admin/questions")) {
      showAdminSubview("questions");
    } else if (path.includes("/admin/assessments")) {
      showAdminSubview("assessments");
    } else if (path.includes("/admin/marking-scheme")) {
      showAdminSubview("marking-scheme");
    } else if (path.includes("/admin/broadcast")) {
      showAdminSubview("broadcast");
    } else {
      showAdminSubview("overview");
    }
    return;
  }

  // Learner Surface (/learner or / or other)
  state.activeView = "learner";
  localStorage.setItem("jhs_view_mode", "learner");

  adminGatekeeperSection?.classList.add("hidden");
  adminGatekeeperSection?.classList.remove("flex");
  adminDashboardSection?.classList.add("hidden");

  if (window.location.pathname === "/" || window.location.pathname === "") {
    window.history.replaceState({}, "", "/learner");
  }

  // If user is not authenticated, show the Learner Sign In screen (without headers)
  if (!state.user) {
    renderAuthLanding();
    return;
  }

  document.getElementById("topAnnouncementBar")?.classList.remove("hidden");
  document.getElementById("mainHeader")?.classList.remove("hidden");
  document.getElementById("mainFooter")?.classList.remove("hidden");

  await renderDashboard();
  updateHeaderNav();
}

function showAdminSubview(subviewKey) {
  const tabs = [
    { key: "overview", el: adminTabOverview, view: adminSubViewOverview },
    { key: "questions", el: adminTabQuestions, view: adminSubViewQuestions },
    { key: "assessments", el: adminTabAssessments, view: adminSubViewAssessments },
    { key: "marking-scheme", el: adminTabMarkingScheme, view: adminSubViewMarkingScheme },
    { key: "broadcast", el: adminTabBroadcast, view: adminSubViewBroadcast },
  ];

  tabs.forEach((t) => {
    if (t.key === subviewKey) {
      t.el?.classList.remove("text-slate-600", "hover:text-slate-900", "hover:bg-slate-100");
      t.el?.classList.add("text-white", "bg-slate-900", "border-slate-800");
      t.view?.classList.remove("hidden");
    } else {
      t.el?.classList.remove("text-white", "bg-slate-900", "border-slate-800");
      t.el?.classList.add("text-slate-600", "hover:text-slate-900", "hover:bg-slate-100");
      t.view?.classList.add("hidden");
    }
  });

  if (subviewKey === "questions") {
    renderQuestionsConfigView();
  } else if (subviewKey === "assessments") {
    renderAdminAssessmentConfigTable2();
  } else if (subviewKey === "marking-scheme") {
    renderEmbeddedAnswerKeyView();
  } else if (subviewKey === "overview") {
    renderAdminOverviewStats();
    renderAdminLearnersTable();
  }
}

async function authenticateAsAdminEmail() {
  const adminUser = {
    id: "admin-master-debrah",
    email: PRIMARY_ADMIN_EMAIL, // "computing.b9@gmail.com"
    user_metadata: {
      full_name: "Master Debrah (Admin)",
      avatar_url: TEACHER_AVATAR,
    },
  };
  const adminProfile = {
    id: "admin-master-debrah",
    student_id: "STAFF-ADM-001",
    full_name: "Master Debrah (Admin)",
    email: PRIMARY_ADMIN_EMAIL,
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

  await initNotifications();
  await initChat();
  handleRoute();
}

async function renderAdminDashboard() {
  navigateTo("/admin");
}

async function renderAdminOverviewStats() {
  if (!state.allLearners || state.allLearners.length === 0) {
    state.allLearners = await fetchAllLearners();
  }
  const onlineCount = state.allLearners.filter((l) => l.is_online).length;
  if (kpiOnlineCount) kpiOnlineCount.textContent = onlineCount;
  if (kpiTotalStudents) kpiTotalStudents.textContent = state.allLearners.length;
  if (kpiNotifsSent) kpiNotifsSent.textContent = state.notifications.length;
}

// ------------------------------------------------------------------------------
// Questions Bank & Test Sittings Configuration View (/admin/questions)
// ------------------------------------------------------------------------------
function renderQuestionsConfigView() {
  if (!adminQuestionSittingsContainer) return;

  const catFilter = state.questionCatFilter || "ALL";
  const trackFilter = state.questionTrackFilter || "ALL";

  // Filter computing assessments only (no Mathematics)
  let filtered = (state.assessments || []).filter((a) => {
    if (a.subject === "Mathematics") return false;
    if (catFilter !== "ALL") {
      const aType = (a.assessment_type || "").toUpperCase();
      const aTitle = (a.title || "").toUpperCase();
      if (catFilter === "CAT" && !aType.includes("CAT") && !aTitle.includes("CAT")) return false;
      if (catFilter === "QUIZ" && !aType.includes("QUIZ") && !aTitle.includes("QUIZ")) return false;
      if (catFilter === "PROJECT_WORK" && !aType.includes("PROJECT") && !aTitle.includes("PROJECT")) return false;
      if (catFilter === "EXAM" && !aType.includes("EXAM") && !aTitle.includes("EXAM")) return false;
    }
    if (trackFilter !== "ALL") {
      if (a.class_level && a.class_level !== trackFilter && a.class_level !== "Basic 9") return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    adminQuestionSittingsContainer.innerHTML = `
      <div class="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
        <i class="fa-solid fa-list-check text-4xl mb-3 text-indigo-400 block"></i>
        <h3 class="text-base font-bold text-slate-700">No assessment test items match current filters</h3>
        <p class="text-xs text-slate-400 mt-1">Select "All Items" or "All Tracks" to view all Computing assessment question sets.</p>
      </div>
    `;
    return;
  }

  adminQuestionSittingsContainer.innerHTML = filtered.map((asmt) => {
    const pack = getAssessmentQuestionPack(asmt.id, asmt.class_level || "Basic 9A", asmt.title);
    const questions = pack?.questions || (Array.isArray(pack) ? pack : []);
    const duration = pack?.time_limit_minutes || asmt.time_limit_minutes || 15;
    const isActive = asmt.status === "AVAILABLE";
    const statusColor = isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200";
    const statusIcon = isActive ? "fa-solid fa-circle-check text-emerald-500" : "fa-solid fa-lock text-slate-400";
    const statusText = isActive ? "Active & Open" : "Inactive / Turned Off";

    const dueDateStr = asmt.deadline || asmt.due_date ? formatDateOnly(asmt.deadline || asmt.due_date) : "Open-ended";

    return `
      <div class="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden" data-asmt-config-card="${asmt.id}">
        <!-- Sitting Control Header Bar -->
        <div class="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div class="flex flex-wrap items-center gap-2 mb-1.5">
              <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                <i class="fa-solid fa-laptop-code mr-1"></i> ${escapeHtml(asmt.subject || "Computing")}
              </span>
              <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                ${escapeHtml(asmt.class_level || "Basic 9")} Track
              </span>
              <span class="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-200/80 text-slate-700">
                ${escapeHtml(asmt.assessment_type || "CAT")}
              </span>
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${statusColor}">
                <i class="${statusIcon}"></i> ${statusText}
              </span>
              <span class="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Weight: ${parseFloat(asmt.weight) || 20}% of Term
              </span>
            </div>

            <h3 class="text-lg font-bold text-slate-900 leading-snug">
              ${escapeHtml(asmt.title)}
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              ${questions.length} Question items configured • Max Score: ${asmt.max_score || 20} Marks • Deadline: <strong class="text-slate-700">${dueDateStr}</strong>
            </p>
          </div>

          <!-- Controls: Sitting Duration, On/Off, Extend Period, Add Question -->
          <div class="flex flex-wrap items-center gap-2.5 shrink-0">
            <!-- Sitting Duration Controller -->
            <div class="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span class="text-slate-400 text-xs"><i class="fa-solid fa-stopwatch text-indigo-500"></i></span>
              <label class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Sitting:</label>
              <input
                type="number"
                min="5"
                max="180"
                step="5"
                value="${duration}"
                class="asmt-duration-input w-14 bg-slate-50 border border-slate-200 rounded-lg py-0.5 px-1.5 text-xs font-bold text-slate-800 text-center focus:ring-2 focus:ring-indigo-500"
                data-asmt-id="${asmt.id}"
                title="Duration for one sitting in minutes"
              />
              <span class="text-[11px] font-semibold text-slate-500">min</span>
              <button
                type="button"
                class="save-duration-btn ml-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                data-asmt-id="${asmt.id}"
                title="Save sitting duration"
              >
                Save
              </button>
            </div>

            <!-- Active / Inactive Toggle (Turn Off / On) -->
            <button
              type="button"
              class="toggle-status-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-2xs ${
                isActive
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
              }"
              data-asmt-id="${asmt.id}"
              data-current-status="${asmt.status}"
              title="${isActive ? 'Turn off assessment (Learners will not be able to start)' : 'Turn on assessment (Make available to learners)'}"
            >
              <i class="fa-solid ${isActive ? 'fa-toggle-on text-rose-600' : 'fa-toggle-off text-emerald-600'}"></i>
              <span>${isActive ? 'Turn Off (Deactivate)' : 'Turn On (Activate)'}</span>
            </button>

            <!-- Extend Period Button -->
            <button
              type="button"
              class="open-extend-modal-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 shadow-2xs transition cursor-pointer"
              data-asmt-id="${asmt.id}"
              data-asmt-title="${escapeHtml(asmt.title)}"
              data-due-date="${asmt.deadline || asmt.due_date || ''}"
              title="Extend deadline period for this assessment"
            >
              <i class="fa-solid fa-clock-rotate-left text-amber-600"></i>
              <span>Extend Period</span>
            </button>

            <!-- Add Question to this specific sitting -->
            <button
              type="button"
              class="add-question-to-asmt-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-2xs transition cursor-pointer"
              data-asmt-id="${asmt.id}"
            >
              <i class="fa-solid fa-plus text-indigo-400"></i>
              <span>Add Question</span>
            </button>
          </div>
        </div>

        <!-- Questions List Body -->
        <div class="p-5 sm:p-6 space-y-4">
          ${questions.length === 0 ? `
            <div class="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              <i class="fa-solid fa-folder-open text-2xl mb-1 block"></i>
              No questions configured yet for this sitting. Click "Add Question" to begin.
            </div>
          ` : questions.map((q, qIdx) => {
            const optionLetters = ["A", "B", "C", "D", "E"];
            return `
              <div class="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3 hover:border-slate-300 transition-all">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      Q${qIdx + 1}
                    </span>
                    <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">${escapeHtml(q.topic || asmt.subject || "Computing")}</span>
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">${q.points || 2} Marks</span>
                  </div>

                  <!-- Edit / Delete actions -->
                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      class="edit-question-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                      data-asmt-id="${asmt.id}"
                      data-q-id="${q.id}"
                      title="Edit question prompt, options, answer key"
                    >
                      <i class="fa-solid fa-pen-to-square text-indigo-600"></i> Edit
                    </button>
                    <button
                      type="button"
                      class="delete-question-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                      data-asmt-id="${asmt.id}"
                      data-q-id="${q.id}"
                      title="Delete this question"
                    >
                      <i class="fa-solid fa-trash text-rose-600"></i> Delete
                    </button>
                  </div>
                </div>

                <p class="text-sm font-semibold text-slate-900 leading-relaxed">
                  ${escapeHtml(q.prompt)}
                </p>

                <!-- Options Grid with verified answer -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  ${(q.options || []).map((opt, optIdx) => {
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
                        ${isCorrect ? '<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><i class="fa-solid fa-circle-check"></i> Answer Key</span>' : ''}
                      </div>
                    `;
                  }).join("")}
                </div>

                ${q.explanation ? `
                  <div class="mt-2 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 leading-relaxed">
                    <span class="font-bold flex items-center gap-1 text-indigo-900 mb-0.5">
                      <i class="fa-solid fa-lightbulb text-amber-500"></i> Marking Rubric &amp; Solution Note:
                    </span>
                    ${escapeHtml(q.explanation)}
                  </div>
                ` : ""}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");

  attachQuestionsConfigHandlers();
}

function attachQuestionsConfigHandlers() {
  const container = adminQuestionSittingsContainer;
  if (!container) return;

  // Save Sitting Duration
  container.querySelectorAll(".save-duration-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      const input = container.querySelector(`.asmt-duration-input[data-asmt-id="${asmtId}"]`);
      const durationVal = parseInt(input?.value, 10) || 15;
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i>`;
      updateAssessmentDuration(asmtId, durationVal);
      await updateAssessment(asmtId, { time_limit_minutes: durationVal });
      const asmt = (state.assessments || []).find((a) => a.id === asmtId);
      if (asmt) asmt.time_limit_minutes = durationVal;
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-check text-emerald-600"></i> Saved`;
      setTimeout(() => {
        btn.textContent = "Save";
      }, 2000);
    });
  });

  // Toggle Active / Inactive (Turn Off / On)
  container.querySelectorAll(".toggle-status-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      const current = btn.getAttribute("data-current-status");
      const nextStatus = current === "AVAILABLE" ? "CLOSED" : "AVAILABLE";
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i>`;
      await updateAssessment(asmtId, { status: nextStatus });
      const asmt = (state.assessments || []).find((a) => a.id === asmtId);
      if (asmt) asmt.status = nextStatus;
      renderQuestionsConfigView();
      renderAssessmentCards();
    });
  });

  // Extend Period
  container.querySelectorAll(".open-extend-modal-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      openExtendPeriodModal(asmtId);
    });
  });

  // Add Question to sitting
  container.querySelectorAll(".add-question-to-asmt-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      openQuestionEditor(asmtId);
    });
  });

  // Edit question
  container.querySelectorAll(".edit-question-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      const qId = btn.getAttribute("data-q-id");
      openQuestionEditor(asmtId, qId);
    });
  });

  // Delete question
  container.querySelectorAll(".delete-question-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      const qId = btn.getAttribute("data-q-id");
      if (!confirm("Are you sure you want to delete this question from the sitting bank?")) return;
      deleteConfiguredQuestion(asmtId, qId);
      renderQuestionsConfigView();
      if (embeddedAnswerKeySelect?.value === asmtId) {
        renderEmbeddedAnswerKeyView(asmtId);
      }
    });
  });
}

// ------------------------------------------------------------------------------
// Assessments & Term Weights Calibration Table 2 (/admin/assessments)
// ------------------------------------------------------------------------------
function renderAdminAssessmentConfigTable2() {
  if (!adminAsmtTableBody2) return;

  const asmts = (state.assessments || []).filter((a) => a.subject !== "Mathematics");
  const trackAsmts = asmts.filter((a) => a.class_level !== "Basic 9B");
  const totalWeight = trackAsmts.reduce((sum, a) => sum + (parseFloat(a.weight) || 20), 0);

  if (adminTotalWeightVal2) adminTotalWeightVal2.textContent = `${totalWeight.toFixed(2)}%`;
  if (adminWeightProgressBar2) {
    const clampedPct = Math.min(100, Math.round(totalWeight));
    adminWeightProgressBar2.style.width = `${clampedPct}%`;
    adminWeightProgressBar2.className =
      Math.round(totalWeight) === 100
        ? "h-full bg-emerald-500 rounded-full transition-all duration-300"
        : "h-full bg-amber-500 rounded-full transition-all duration-300";
  }
  if (adminWeightStatusBadge2) {
    if (Math.round(totalWeight) === 100) {
      adminWeightStatusBadge2.className =
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300";
      adminWeightStatusBadge2.innerHTML = `<i class="fa-solid fa-circle-check"></i> Balanced (100.00%)`;
    } else {
      adminWeightStatusBadge2.className =
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300";
      adminWeightStatusBadge2.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Calibrate (${totalWeight.toFixed(1)}% / 100%)`;
    }
  }

  if (asmts.length === 0) {
    adminAsmtTableBody2.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No assessments found.</td></tr>`;
    return;
  }

  adminAsmtTableBody2.innerHTML = asmts.map((asmt) => {
    const isActive = asmt.status === "AVAILABLE";
    const duration = asmt.time_limit_minutes || 15;
    const dueDateStr = asmt.deadline || asmt.due_date ? formatDateOnly(asmt.deadline || asmt.due_date) : "Open-ended";

    return `
      <tr class="hover:bg-slate-50/80 transition-colors" data-asmt-row2="${asmt.id}">
        <td class="py-3 px-3">
          <div class="font-bold text-slate-900">${escapeHtml(asmt.title)}</div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">${escapeHtml(asmt.class_level || "Basic 9")}</span>
            <span class="text-[11px] text-slate-500">${escapeHtml(asmt.subject || "Computing")}</span>
          </div>
        </td>
        <td class="py-3 px-2">
          <span class="font-semibold text-slate-700">${escapeHtml(asmt.assessment_type || "CAT")}</span>
        </td>
        <td class="py-3 px-2">
          <div class="flex items-center gap-1">
            <input
              type="number"
              min="5"
              max="180"
              step="5"
              value="${duration}"
              class="asmt-duration-input2 w-14 bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 text-xs font-bold text-slate-800 text-center focus:ring-2 focus:ring-indigo-500"
              data-asmt-id="${asmt.id}"
            />
            <span class="text-slate-400 font-semibold">m</span>
            <button
              type="button"
              class="save-duration-btn2 px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
              data-asmt-id="${asmt.id}"
            >
              Save
            </button>
          </div>
        </td>
        <td class="py-3 px-2">
          <div class="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max="100"
              value="${parseFloat(asmt.weight) || 20}"
              class="asmt-weight-input2 w-14 bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 text-xs font-bold text-slate-800 text-center focus:ring-2 focus:ring-indigo-500"
              data-asmt-id="${asmt.id}"
            />
            <span class="text-slate-400 font-semibold">%</span>
            <button
              type="button"
              class="save-weight-btn2 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
              data-asmt-id="${asmt.id}"
            >
              Save
            </button>
          </div>
        </td>
        <td class="py-3 px-2 font-mono font-bold text-slate-700">${asmt.max_score || 20}</td>
        <td class="py-3 px-3">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-1.5">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isActive
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }">
                <i class="fa-solid ${isActive ? 'fa-circle-check text-emerald-600' : 'fa-lock text-slate-400'}"></i> ${isActive ? 'Active' : 'Closed'}
              </span>
              <button
                type="button"
                class="toggle-status-btn2 text-[10px] font-bold px-2 py-0.5 rounded border ${
                  isActive
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                } cursor-pointer"
                data-asmt-id="${asmt.id}"
                data-current="${asmt.status}"
              >
                ${isActive ? 'Turn Off' : 'Turn On'}
              </button>
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>Due: ${dueDateStr}</span>
              <button
                type="button"
                class="open-extend-modal-btn2 text-amber-600 hover:text-amber-800 font-bold cursor-pointer"
                data-asmt-id="${asmt.id}"
                title="Extend Deadline"
              >
                <i class="fa-solid fa-clock-rotate-left"></i> Extend
              </button>
            </div>
          </div>
        </td>
        <td class="py-3 px-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button
              type="button"
              class="asmt-nav-questions-btn px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 cursor-pointer"
              data-asmt-id="${asmt.id}"
              title="Configure questions for this assessment"
            >
              <i class="fa-solid fa-list-check"></i> Questions
            </button>
            <button
              type="button"
              class="asmt-open-key-btn px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 cursor-pointer"
              data-asmt-id="${asmt.id}"
              title="View marking scheme"
            >
              <i class="fa-solid fa-key"></i> Key
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  attachAdminAsmtTable2Handlers();
}

function attachAdminAsmtTable2Handlers() {
  const tbody = adminAsmtTableBody2;
  if (!tbody) return;

  // Save Duration
  tbody.querySelectorAll(".save-duration-btn2").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      const row = tbody.querySelector(`[data-asmt-row2="${asmtId}"]`);
      const val = parseInt(row?.querySelector(".asmt-duration-input2")?.value, 10) || 15;
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i>`;
      updateAssessmentDuration(asmtId, val);
      await updateAssessment(asmtId, { time_limit_minutes: val });
      const asmt = (state.assessments || []).find((a) => a.id === asmtId);
      if (asmt) asmt.time_limit_minutes = val;
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-check text-emerald-600"></i>`;
      setTimeout(() => {
        btn.textContent = "Save";
      }, 2000);
    });
  });

  // Save Weight
  tbody.querySelectorAll(".save-weight-btn2").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      const row = tbody.querySelector(`[data-asmt-row2="${asmtId}"]`);
      const val = parseFloat(row?.querySelector(".asmt-weight-input2")?.value) || 20;
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i>`;
      await updateAssessment(asmtId, { weight: val });
      const asmt = (state.assessments || []).find((a) => a.id === asmtId);
      if (asmt) asmt.weight = val;
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-check text-emerald-600"></i>`;
      setTimeout(() => {
        btn.textContent = "Save";
      }, 2000);
      renderAdminAssessmentConfigTable2();
    });
  });

  // Toggle Status
  tbody.querySelectorAll(".toggle-status-btn2").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      const current = btn.getAttribute("data-current");
      const nextStatus = current === "AVAILABLE" ? "CLOSED" : "AVAILABLE";
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i>`;
      await updateAssessment(asmtId, { status: nextStatus });
      const asmt = (state.assessments || []).find((a) => a.id === asmtId);
      if (asmt) asmt.status = nextStatus;
      renderAdminAssessmentConfigTable2();
      renderAssessmentCards();
    });
  });

  // Extend Period
  tbody.querySelectorAll(".open-extend-modal-btn2").forEach((btn) => {
    btn.addEventListener("click", () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      openExtendPeriodModal(asmtId);
    });
  });

  // Nav to questions
  tbody.querySelectorAll(".asmt-nav-questions-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateTo("/admin/questions");
    });
  });

  // Open key
  tbody.querySelectorAll(".asmt-open-key-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      openAnswerKeyModal(asmtId);
    });
  });
}

async function autoBalanceAssessmentWeights2() {
  const asmts = (state.assessments || []).filter((a) => a.subject !== "Mathematics");
  if (asmts.length === 0) return;

  const trackAsmts = asmts.filter((a) => a.class_level !== "Basic 9B");
  const count = trackAsmts.length;
  if (count === 0) return;

  const baseWeight = Math.floor(100 / count);
  const remainder = 100 - baseWeight * count;

  if (adminAutoBalanceBtn2) {
    adminAutoBalanceBtn2.disabled = true;
    adminAutoBalanceBtn2.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Balancing...`;
  }

  for (let i = 0; i < count; i++) {
    const asmt = trackAsmts[i];
    const newWeight = i === 0 ? baseWeight + remainder : baseWeight;
    await updateAssessment(asmt.id, { weight: newWeight });
    asmt.weight = newWeight;

    const baseTitle = asmt.title.replace(" (Basic 9A)", "").replace(" 9A", "");
    const parallel9B = asmts.find((a) => a.class_level === "Basic 9B" && a.title.includes(baseTitle));
    if (parallel9B) {
      await updateAssessment(parallel9B.id, { weight: newWeight });
      parallel9B.weight = newWeight;
    }
  }

  renderAdminAssessmentConfigTable2();
  renderAssessmentCards();

  if (adminAutoBalanceBtn2) {
    adminAutoBalanceBtn2.disabled = false;
    adminAutoBalanceBtn2.innerHTML = `<i class="fa-solid fa-scale-balanced"></i> Auto-Balance to 100%`;
  }
}

// ------------------------------------------------------------------------------
// Question Editor Modal Handlers
// ------------------------------------------------------------------------------
function openQuestionEditor(asmtId = null, questionId = null) {
  if (!questionEditorModal) return;

  const asmts = (state.assessments || []).filter((a) => a.subject !== "Mathematics");
  if (qEditorAsmtSelect) {
    qEditorAsmtSelect.innerHTML = asmts.map((a) => {
      return `<option value="${a.id}">${escapeHtml(a.title)} (${escapeHtml(a.class_level || "Basic 9")})</option>`;
    }).join("");

    if (asmtId) qEditorAsmtSelect.value = asmtId;
  }

  const activeAsmtId = asmtId || qEditorAsmtSelect?.value || (asmts.length > 0 ? asmts[0].id : null);
  const asmt = asmts.find((a) => a.id === activeAsmtId);
  const pack = getAssessmentQuestionPack(activeAsmtId, asmt?.class_level || "Basic 9A", asmt?.title);
  const questions = pack?.questions || (Array.isArray(pack) ? pack : []);

  if (questionId) {
    const q = questions.find((item) => item.id === questionId);
    if (q) {
      if (questionEditorModalTitle) questionEditorModalTitle.textContent = "Edit Question";
      if (qEditorQuestionId) qEditorQuestionId.value = q.id;
      if (qEditorPrompt) qEditorPrompt.value = q.prompt || "";
      if (qEditorPoints) qEditorPoints.value = q.points || 2;
      if (qEditorOptA) qEditorOptA.value = q.options?.[0] || "";
      if (qEditorOptB) qEditorOptB.value = q.options?.[1] || "";
      if (qEditorOptC) qEditorOptC.value = q.options?.[2] || "";
      if (qEditorOptD) qEditorOptD.value = q.options?.[3] || "";

      // Determine correct opt letter
      let correctLetter = "A";
      (q.options || []).forEach((opt, idx) => {
        if (q.correctAnswer && opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
          correctLetter = ["A", "B", "C", "D"][idx] || "A";
        }
      });
      if (qEditorCorrectOpt) qEditorCorrectOpt.value = correctLetter;
      if (qEditorExplanation) qEditorExplanation.value = q.explanation || "";
    }
  } else {
    if (questionEditorModalTitle) questionEditorModalTitle.textContent = "Add New Question";
    if (qEditorQuestionId) qEditorQuestionId.value = "";
    if (qEditorPrompt) qEditorPrompt.value = "";
    if (qEditorPoints) qEditorPoints.value = "2";
    if (qEditorOptA) qEditorOptA.value = "";
    if (qEditorOptB) qEditorOptB.value = "";
    if (qEditorOptC) qEditorOptC.value = "";
    if (qEditorOptD) qEditorOptD.value = "";
    if (qEditorCorrectOpt) qEditorCorrectOpt.value = "A";
    if (qEditorExplanation) qEditorExplanation.value = "";
  }

  questionEditorModal.classList.remove("hidden");
}

function handleQuestionEditorSubmit(e) {
  e.preventDefault();
  const asmtId = qEditorAsmtSelect?.value;
  if (!asmtId) return;

  const qId = qEditorQuestionId?.value || null;
  const promptVal = qEditorPrompt?.value?.trim();
  const pointsVal = parseInt(qEditorPoints?.value, 10) || 2;
  const optA = qEditorOptA?.value?.trim() || "";
  const optB = qEditorOptB?.value?.trim() || "";
  const optC = qEditorOptC?.value?.trim() || "";
  const optD = qEditorOptD?.value?.trim() || "";
  const correctLetter = qEditorCorrectOpt?.value || "A";
  const explanationVal = qEditorExplanation?.value?.trim() || "";

  if (!promptVal || !optA || !optB || !optC || !optD) {
    alert("Please complete the prompt and all 4 options.");
    return;
  }

  const optionsMap = { A: optA, B: optB, C: optC, D: optD };
  const correctText = optionsMap[correctLetter] || optA;

  const questionData = {
    id: qId || `q-${Date.now()}`,
    prompt: promptVal,
    options: [optA, optB, optC, optD],
    correctAnswer: correctText,
    points: pointsVal,
    topic: "Computing",
    explanation: explanationVal,
  };

  saveConfiguredQuestion(asmtId, questionData, !qId);
  questionEditorModal?.classList.add("hidden");
  renderQuestionsConfigView();
  if (embeddedAnswerKeySelect?.value === asmtId) {
    renderEmbeddedAnswerKeyView(asmtId);
  }
}

// ------------------------------------------------------------------------------
// Extend Assessment Period Modal Handlers
// ------------------------------------------------------------------------------
function openExtendPeriodModal(asmtId) {
  if (!extendPeriodModal) return;
  const asmt = (state.assessments || []).find((a) => a.id === asmtId);
  if (!asmt) return;

  if (extendModalAsmtId) extendModalAsmtId.value = asmtId;
  if (extendModalAsmtTitle) extendModalAsmtTitle.textContent = asmt.title;

  const currentDue = asmt.deadline || asmt.due_date;
  if (extendModalCurrentDeadline) {
    extendModalCurrentDeadline.textContent = currentDue
      ? new Date(currentDue).toLocaleString()
      : "No deadline currently configured";
  }

  // Pre-set custom datetime input to 24 hours from now
  const defaultExtend = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16);
  if (extendCustomDatetimeInput) {
    extendCustomDatetimeInput.value = defaultExtend;
  }

  extendPeriodModal.classList.remove("hidden");
}

async function handleSaveExtendPeriod() {
  const asmtId = extendModalAsmtId?.value;
  if (!asmtId) return;

  const customVal = extendCustomDatetimeInput?.value;
  if (!customVal) {
    alert("Please pick a custom deadline or choose a preset.");
    return;
  }

  const newIso = new Date(customVal).toISOString();
  if (saveExtendPeriodBtn) {
    saveExtendPeriodBtn.disabled = true;
    saveExtendPeriodBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Saving...`;
  }

  await updateAssessment(asmtId, { deadline: newIso, due_date: newIso });
  const asmt = (state.assessments || []).find((a) => a.id === asmtId);
  if (asmt) {
    asmt.deadline = newIso;
    asmt.due_date = newIso;
  }

  if (saveExtendPeriodBtn) {
    saveExtendPeriodBtn.disabled = false;
    saveExtendPeriodBtn.innerHTML = `<i class="fa-solid fa-calendar-check"></i> Apply Extension`;
  }

  extendPeriodModal?.classList.add("hidden");
  renderQuestionsConfigView();
  renderAdminAssessmentConfigTable2();
  renderAssessmentCards();
}

function renderAdminLearnersTable() {
  if (!adminLearnersTableBody) return;

  if (!state.allLearners || state.allLearners.length === 0) {
    adminLearnersTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="py-12 text-center text-slate-400">
          <i class="fa-solid fa-users text-3xl mb-2 text-slate-300 block"></i>
          <p class="font-bold text-slate-700 text-sm">No Registered Learners Found</p>
          <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Live database mode is active. When learners sign in with their authorized Google Accounts, their registered profiles and assessment submissions will automatically appear here in real-time.
          </p>
        </td>
      </tr>
    `;
    return;
  }

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
          No learners found matching the selected class filter (${escapeHtml(filterVal)}).
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
// Admin Continuous Assessment Broadsheet Excel Export Handler
// Generates official broadsheet compliant with BECE 2026 stanine grading:
// Columns: S/N, Name of Learner, Class Score (50%), Exams Score (50%), Total, Rank, Remarks (Grade)
// ------------------------------------------------------------------------------
async function handleExcelExport() {
  const filterVal = adminClassFilter?.value || "ALL";
  const btn = adminExportExcelBtn;
  const topBtn = adminTopExportExcelBtn;
  const btnText = adminExportExcelBtnText;
  const originalHtml = btnText ? btnText.textContent : "Download Excel";

  try {
    if (btn) {
      btn.disabled = true;
      if (btnText) {
        btnText.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-xs"></i> Generating...`;
      }
    }
    if (topBtn) topBtn.disabled = true;

    // Fetch freshest database records for learners, all submissions, and assessments
    const [learners, submissions, asmts] = await Promise.all([
      fetchAllLearners(),
      fetchAllSubmissions(),
      fetchAssessments(),
    ]);

    if (!learners || learners.length === 0) {
      alert("No registered learners found in the database to export.\n\nPlease ensure students have registered or created profiles in Supabase.");
      return;
    }

    // Call pure TypeScript Excel generator
    const { filename, totalExported } = exportBroadsheetExcel(learners, asmts, submissions, filterVal);

    // Notify user
    setTimeout(() => {
      alert(`Broadsheet Excel file successfully generated!\n\nFile: ${filename}\nTotal Learners Included: ${totalExported}\nGrading: BECE 2026 Stanine Standard\nScore Weighting: Class Score (50%) + Exam Score (50%) = 100%`);
    }, 200);
  } catch (err) {
    console.error("Excel generation error:", err);
    alert("Could not generate Excel broadsheet: " + (err.message || "Unknown error"));
  } finally {
    if (btn) {
      btn.disabled = false;
      if (btnText) {
        btnText.textContent = originalHtml || "Download Excel";
      }
    }
    if (topBtn) topBtn.disabled = false;
  }
}

// ------------------------------------------------------------------------------
// Clear Mock Data & Start Testing Live Data Handler
// ------------------------------------------------------------------------------
async function handleClearMockData() {
  const confirmed = confirm(
    "CLEAR MOCK DATA CONFIRMATION:\n\nAre you sure you want to clear all mock demonstration data and browser storage?\n\nThis will remove demo students, mock submissions, and fallback sessions so the portal loads and records pure live data from your Supabase backend."
  );
  if (!confirmed) return;

  clearAllMockData();
  state.user = null;
  state.profile = null;
  state.allLearners = [];
  state.submissions = [];
  state.assessments = [];

  if (adminLearnersTableBody) {
    adminLearnersTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="py-12 text-center text-slate-400">
          <i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-indigo-500 block"></i>
          <span class="font-bold text-slate-700">Connecting to live Supabase database...</span>
        </td>
      </tr>
    `;
  }

  await checkAuthSession();

  if (state.activeView === "admin") {
    state.allLearners = await fetchAllLearners();
    renderAdminLearnersTable();
    renderAdminOverviewStats();
  }

  alert("Mock data cleared successfully!\n\nThe portal is now testing with pure live data from your Supabase database.");
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

  // Role Switcher & Routing Actions
  viewModeToggleBtn?.addEventListener("click", toggleViewMode);
  adminSwitchLearnerBtn?.addEventListener("click", () => navigateTo("/learner"));
  adminGatekeeperLearnerBtn?.addEventListener("click", () => {
    if (!state.user || state.user.id?.startsWith("demo-") || state.user.id === "lrn-001") {
      state.user = null;
      state.profile = null;
      localStorage.removeItem("jhs_demo_session");
      localStorage.removeItem("jhs_active_learner");
    }
    navigateTo("/learner");
  });
  document.getElementById("authToAdminBtn")?.addEventListener("click", () => navigateTo("/admin"));
  adminGatekeeperQuickBtn?.addEventListener("click", authenticateAsAdminEmail);
  adminGatekeeperGoogleBtn?.addEventListener("click", handleGoogleSignIn);
  brandLogoLink?.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo(state.activeView === "admin" ? "/admin" : "/learner");
  });

  // Admin Navigation Sub-Tabs Listeners
  adminTabOverview?.addEventListener("click", () => navigateTo("/admin"));
  adminTabQuestions?.addEventListener("click", () => navigateTo("/admin/questions"));
  adminTabAssessments?.addEventListener("click", () => navigateTo("/admin/assessments"));
  adminTabMarkingScheme?.addEventListener("click", () => navigateTo("/admin/marking-scheme"));
  adminTabBroadcast?.addEventListener("click", () => navigateTo("/admin/broadcast"));
  adminQuestionsNavBtn?.addEventListener("click", () => navigateTo("/admin/questions"));

  // Questions Configuration Listeners
  addNewQuestionBtn?.addEventListener("click", () => openQuestionEditor());
  questionTrackFilter?.addEventListener("change", (e) => {
    state.questionTrackFilter = e.target.value;
    renderQuestionsConfigView();
  });
  document.querySelectorAll(".question-cat-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".question-cat-filter").forEach((b) => {
        b.className = "question-cat-filter px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer";
      });
      btn.className = "question-cat-filter px-3 py-1.5 rounded-xl bg-slate-900 text-white transition cursor-pointer font-bold";
      state.questionCatFilter = btn.getAttribute("data-category");
      renderQuestionsConfigView();
    });
  });

  // Question Editor Modal Listeners
  closeQuestionEditorBtn?.addEventListener("click", () => questionEditorModal?.classList.add("hidden"));
  cancelQuestionEditorBtn?.addEventListener("click", () => questionEditorModal?.classList.add("hidden"));
  questionEditorForm?.addEventListener("submit", handleQuestionEditorSubmit);

  // Extend Period Modal Listeners
  closeExtendPeriodBtn?.addEventListener("click", () => extendPeriodModal?.classList.add("hidden"));
  cancelExtendPeriodBtn?.addEventListener("click", () => extendPeriodModal?.classList.add("hidden"));
  saveExtendPeriodBtn?.addEventListener("click", handleSaveExtendPeriod);
  document.querySelectorAll(".quick-extend-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const hours = parseInt(btn.getAttribute("data-hours"), 10) || 24;
      const newDate = new Date(Date.now() + hours * 3600 * 1000);
      if (extendCustomDatetimeInput) {
        extendCustomDatetimeInput.value = newDate.toISOString().slice(0, 16);
      }
    });
  });

  // Assessments 2 Auto-Balance
  adminAutoBalanceBtn2?.addEventListener("click", autoBalanceAssessmentWeights2);

  // Embedded Marking Scheme Listeners
  embeddedAnswerKeySelect?.addEventListener("change", (e) => renderEmbeddedAnswerKeyView(e.target.value));
  printAnswerKeyBtn2?.addEventListener("click", () => window.print());

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

  // Admin Learners Directory Class Filter, Excel Export & Mock Data Clearing
  adminClassFilter?.addEventListener("change", renderAdminLearnersTable);
  adminExportExcelBtn?.addEventListener("click", handleExcelExport);
  adminTopExportExcelBtn?.addEventListener("click", handleExcelExport);
  adminClearMockBtn?.addEventListener("click", handleClearMockData);

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

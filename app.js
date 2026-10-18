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
  enrollLearner,
  updateLearnerRecord,
  deleteLearnerRecord,
  recordLearnerScore,
  batchEnrollLearners,
  isLearnerOnline,
  setUserOnlineStatus,
  subscribeToAdminRealtime,
  ADMIN_CONTACT,
  subscribeToChatRealtime,
  subscribeToLearnersRealtime,
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
  adminRealtimeUnsub: null,
  adminLivePollerInterval: null,
  learnerPresenceInterval: null,
  lastStatsSnapshot: {
    online: -1,
    registered: -1,
    assessments: -1,
    notifications: -1,
    subs: -1,
  },
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
const kpiOnlineSubtext = document.getElementById("kpiOnlineSubtext");
const kpiTotalStudents = document.getElementById("kpiTotalStudents");
const kpiRegisteredSubtext = document.getElementById("kpiRegisteredSubtext");
const kpiActiveAsmtCount = document.getElementById("kpiActiveAsmtCount");
const kpiActiveAsmtSubtext = document.getElementById("kpiActiveAsmtSubtext");
const kpiNotifsSent = document.getElementById("kpiNotifsSent");
const kpiNotifsSubtext = document.getElementById("kpiNotifsSubtext");
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
const adminEnrollStudentBtn = document.getElementById("adminEnrollStudentBtn");
const adminRecordMarksBtn = document.getElementById("adminRecordMarksBtn");

// Enroll Student Modal Elements
const enrollStudentModal = document.getElementById("enrollStudentModal");
const closeEnrollModalBtn = document.getElementById("closeEnrollModalBtn");
const cancelEnrollBtn = document.getElementById("cancelEnrollBtn");
const enrollStudentForm = document.getElementById("enrollStudentForm");
const enrollFullName = document.getElementById("enrollFullName");
const enrollRole = document.getElementById("enrollRole");
const enrollClassLevel = document.getElementById("enrollClassLevel");
const enrollGender = document.getElementById("enrollGender");
const enrollStudentId = document.getElementById("enrollStudentId");
const enrollDob = document.getElementById("enrollDob");
const enrollEmail = document.getElementById("enrollEmail");
const quickSeedRosterBtn = document.getElementById("quickSeedRosterBtn");

// Edit User Profile Modal Elements (Admin Full CRUD)
const editLearnerModal = document.getElementById("editLearnerModal");
const closeEditLearnerModalBtn = document.getElementById("closeEditLearnerModalBtn");
const cancelEditLearnerBtn = document.getElementById("cancelEditLearnerBtn");
const editLearnerForm = document.getElementById("editLearnerForm");
const editLearnerId = document.getElementById("editLearnerId");
const editLearnerFullName = document.getElementById("editLearnerFullName");
const editLearnerRole = document.getElementById("editLearnerRole");
const editLearnerClassLevel = document.getElementById("editLearnerClassLevel");
const editLearnerGender = document.getElementById("editLearnerGender");
const editLearnerStudentId = document.getElementById("editLearnerStudentId");
const editLearnerDob = document.getElementById("editLearnerDob");
const editLearnerIsOnline = document.getElementById("editLearnerIsOnline");
const editLearnerEmail = document.getElementById("editLearnerEmail");
const submitEditLearnerBtn = document.getElementById("submitEditLearnerBtn");
const adminDeleteUserFromModalBtn = document.getElementById("adminDeleteUserFromModalBtn");

// Active Learners Online Modal Elements
const kpiCardOnline = document.getElementById("kpiCardOnline");
const activeLearnersModal = document.getElementById("activeLearnersModal");
const closeActiveLearnersModalBtn = document.getElementById("closeActiveLearnersModalBtn");
const closeActiveLearnersModalBtn2 = document.getElementById("closeActiveLearnersModalBtn2");
const activeLearnersListView = document.getElementById("activeLearnersListView");
const activeLearnersListContainer = document.getElementById("activeLearnersListContainer");
const activeLearnersSearchInput = document.getElementById("activeLearnersSearchInput");
const activeLearnersClassFilter = document.getElementById("activeLearnersClassFilter");
const activeLearnersModalCountText = document.getElementById("activeLearnersModalCountText");
const activeLearnersModalCountBadge = document.getElementById("activeLearnersModalCountBadge");
const activeLearnerDetailView = document.getElementById("activeLearnerDetailView");
const activeLearnerDetailContent = document.getElementById("activeLearnerDetailContent");
const backToActiveListBtn = document.getElementById("backToActiveListBtn");

// Record Score Modal Elements
const recordScoreModal = document.getElementById("recordScoreModal");
const closeRecordScoreModalBtn = document.getElementById("closeRecordScoreModalBtn");
const cancelRecordScoreBtn = document.getElementById("cancelRecordScoreBtn");
const recordScoreForm = document.getElementById("recordScoreForm");
const recordScoreLearnerSelect = document.getElementById("recordScoreLearnerSelect");
const recordScoreAsmtSelect = document.getElementById("recordScoreAsmtSelect");
const recordScoreVal = document.getElementById("recordScoreVal");
const recordScoreMaxVal = document.getElementById("recordScoreMaxVal");
const recordScoreRemarks = document.getElementById("recordScoreRemarks");

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
const chatSwitchContactBtn = document.getElementById("chatSwitchContactBtn");
const chatContactsDrawer = document.getElementById("chatContactsDrawer");
const chatCloseContactsBtn = document.getElementById("chatCloseContactsBtn");
const chatContactSearchInput = document.getElementById("chatContactSearchInput");
const chatContactsListContainer = document.getElementById("chatContactsListContainer");

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
  // Strictly purge any legacy cached assessments that contain Creative Arts or Math
  try {
    const cachedAsmts = localStorage.getItem("jhs_local_assessments");
    if (cachedAsmts && (cachedAsmts.includes("Creative") || cachedAsmts.includes("Art") || cachedAsmts.includes("Math"))) {
      localStorage.removeItem("jhs_local_assessments");
    }
  } catch (e) {}

  initAvatarPresets();
  initQuotes();
  initCountdownTimer();
  attachEventListeners();
  window.addEventListener("popstate", () => handleRoute());
  window.addEventListener("beforeunload", () => {
    if (state.user?.id && !state.isAdmin) {
      setUserOnlineStatus(state.user.id, false);
    }
  });

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

// Early global exports for inline HTML event handlers
window.openActiveLearnersModal = openActiveLearnersModal;
window.closeActiveLearnersModal = closeActiveLearnersModal;
window.showActiveLearnerDetail = showActiveLearnerDetail;
window.renderActiveLearnersList = renderActiveLearnersList;

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

      // Determine Admin Status via Email or Profile Role
      state.isAdmin = isUserAdmin(user, profile);

      if (state.isAdmin) {
        // If user is designated Admin, ensure profile role is set to admin
        if (!profile || profile.role !== "admin") {
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
        // NON-ADMIN LEARNER:
        // Strictly verify that learner has registered their official details
        const isRegistered = Boolean(profile && profile.onboarding_completed && profile.date_of_birth && profile.class_level);
        if (!isRegistered) {
          profile = profile || {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "",
            email: user.email,
            gender: "Male",
            date_of_birth: "",
            class_level: "Basic 9A",
            role: "learner",
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || AVATAR_PRESETS[0],
            onboarding_completed: false,
          };
          state.profile = profile;

          // Immediately trigger registration form for learner
          setTimeout(() => {
            showOnboardingModal(user, profile);
          }, 200);
        } else {
          state.profile = profile;
        }
      }
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
  if (state.user?.id) {
    try {
      await setUserOnlineStatus(state.user.id, false);
    } catch (e) {}
  }
  if (state.learnerPresenceInterval) {
    clearInterval(state.learnerPresenceInterval);
    state.learnerPresenceInterval = null;
  }
  stopAdminRealtimeEngine();

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

  // Manage Admin Switcher Visibility: Strictly Visible ONLY for Authorized Admin
  if (adminToggleContainer && viewModeToggleBtn) {
    if (state.isAdmin) {
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
    } else {
      adminToggleContainer.classList.add("hidden");
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
    // Strictly Pure Computing only
    if (asmt.subject && asmt.subject !== "Computing") return false;
    const titleLower = (asmt.title || "").toLowerCase();
    if (titleLower.includes("creative") || titleLower.includes("art") || titleLower.includes("math")) return false;

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

    // Action Button (with direct Google Forms CAT launch if applicable)
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
      if (asmt.assessment_url) {
        actionBtn = `
          <div class="flex flex-col gap-1.5 w-full">
            <a href="${asmt.assessment_url}" target="_blank" rel="noopener noreferrer" class="w-full py-2 px-3 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-all flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> Take on Google Form
            </a>
            <button class="start-quiz-btn w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5" data-asmt-id="${asmt.id}">
              <i class="fa-solid fa-laptop-code text-indigo-600 text-xs"></i> Take in Portal
            </button>
          </div>
        `;
      } else {
        actionBtn = `
          <button class="start-quiz-btn w-full py-2 px-3 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5" data-asmt-id="${asmt.id}">
            <i class="fa-solid fa-play text-xs"></i> Start Assessment (CAT)
          </button>
        `;
      }
    } else {
      actionBtn = `
        <button disabled class="w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-lock text-slate-400 text-xs"></i> Closed by Administrator
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

    // Fetch latest live data from database immediately upon entering admin route
    const [asmts, learners, subs, notifs] = await Promise.all([
      fetchAssessments(),
      fetchAllLearners(),
      fetchAllSubmissions(),
      fetchNotifications(),
    ]);
    state.assessments = asmts || [];
    state.allLearners = learners || [];
    state.submissions = subs || [];
    state.notifications = notifs || [];

    // Start Realtime WebSockets & Adaptive Hot-Reload Polling Engine for Admin
    startAdminRealtimeEngine();
    startUserPresenceHeartbeat();

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
  stopAdminRealtimeEngine();
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
  await initChat();

  // Start learner presence pulse so admin sees learner online in real time
  startLearnerPresenceHeartbeat();
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

function triggerCardHotReload(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  card.classList.add("ring-2", "ring-emerald-500", "scale-[1.02]", "bg-emerald-50/20");
  setTimeout(() => {
    card.classList.remove("ring-2", "ring-emerald-500", "scale-[1.02]", "bg-emerald-50/20");
  }, 1200);
}

function showHotReloadIndicator() {
  const pulseEl = document.getElementById("adminHotReloadPulse");
  const timeEl = document.getElementById("adminLastSyncTime");
  if (pulseEl) {
    pulseEl.classList.remove("hidden");
    setTimeout(() => pulseEl.classList.add("hidden"), 2000);
  }
  if (timeEl) {
    timeEl.textContent = `Synced: ${new Date().toLocaleTimeString()}`;
  }
}

async function performAdminHotReloadCheck() {
  try {
    const [latestLearners, latestAsmts, latestNotes, latestSubs] = await Promise.all([
      fetchAllLearners(),
      fetchAssessments(),
      fetchNotifications(),
      fetchAllSubmissions(),
    ]);

    const prev = state.lastStatsSnapshot || { online: -1, registered: -1, assessments: -1, notifications: -1, subs: -1 };

    const students = (latestLearners || []).filter(
      (l) => (l.role || "learner") === "learner" && (l.email || "").toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase()
    );

    const onlineCount = students.filter(isLearnerOnline).length;

    const registeredCount = students.length;
    const availableAsmtsCount = (latestAsmts || []).filter((a) => a.status === "AVAILABLE").length;
    const notifsCount = (latestNotes || []).length;
    const subsCount = (latestSubs || []).length;

    const hasChanged =
      onlineCount !== prev.online ||
      registeredCount !== prev.registered ||
      availableAsmtsCount !== prev.assessments ||
      notifsCount !== prev.notifications ||
      subsCount !== prev.subs;

    if (hasChanged) {
      if (prev.online !== -1) {
        if (onlineCount !== prev.online) triggerCardHotReload("kpiCardOnline");
        if (registeredCount !== prev.registered) triggerCardHotReload("kpiCardRegistered");
        if (availableAsmtsCount !== prev.assessments) triggerCardHotReload("kpiCardAssessments");
        if (notifsCount !== prev.notifications) triggerCardHotReload("kpiCardNotifications");
      }

      state.allLearners = latestLearners;
      state.assessments = latestAsmts;
      state.notifications = latestNotes;
      state.submissions = latestSubs;
      state.lastStatsSnapshot = {
        online: onlineCount,
        registered: registeredCount,
        assessments: availableAsmtsCount,
        notifications: notifsCount,
        subs: subsCount,
      };

      await renderAdminOverviewStats(true);
      renderAdminLearnersTable();
      if (activeLearnersModal && !activeLearnersModal.classList.contains("hidden") && !activeLearnersListView?.classList.contains("hidden")) {
        renderActiveLearnersList();
      }
      showHotReloadIndicator();
    }
  } catch (err) {
    console.warn("Hot reload check error:", err);
  }
}

function startAdminRealtimeEngine() {
  if (state.adminRealtimeUnsub) {
    try { state.adminRealtimeUnsub(); } catch (e) {}
    state.adminRealtimeUnsub = null;
  }

  state.adminRealtimeUnsub = subscribeToAdminRealtime(async (event) => {
    console.log("Supabase Realtime event on admin:", event);
    await performAdminHotReloadCheck();
  });

  if (state.adminLivePollerInterval) {
    clearInterval(state.adminLivePollerInterval);
  }
  state.adminLivePollerInterval = setInterval(async () => {
    if (state.activeView === "admin") {
      await performAdminHotReloadCheck();
    }
  }, 3500);
}

function stopAdminRealtimeEngine() {
  if (state.adminRealtimeUnsub) {
    try { state.adminRealtimeUnsub(); } catch (e) {}
    state.adminRealtimeUnsub = null;
  }
  if (state.adminLivePollerInterval) {
    clearInterval(state.adminLivePollerInterval);
    state.adminLivePollerInterval = null;
  }
}

function startUserPresenceHeartbeat() {
  if (state.learnerPresenceInterval) {
    clearInterval(state.learnerPresenceInterval);
    state.learnerPresenceInterval = null;
  }

  const activeId = (state.isAdmin && state.activeView === "admin")
    ? ADMIN_CONTACT.id
    : (state.profile?.id || state.user?.id);

  if (!activeId || String(activeId).startsWith("demo-")) return;

  setUserOnlineStatus(activeId, true);

  state.learnerPresenceInterval = setInterval(async () => {
    const currentId = (state.isAdmin && state.activeView === "admin")
      ? ADMIN_CONTACT.id
      : (state.profile?.id || state.user?.id);

    if (currentId && !String(currentId).startsWith("demo-")) {
      await setUserOnlineStatus(currentId, true);
    }
  }, 20000);
}

const startLearnerPresenceHeartbeat = startUserPresenceHeartbeat;

async function renderAdminOverviewStats(isHotReload = false) {
  if (!isHotReload) {
    state.allLearners = await fetchAllLearners();
    state.assessments = await fetchAssessments();
    state.notifications = await fetchNotifications();
  }

  // Filter students (exclude primary admin account)
  const students = (state.allLearners || []).filter(
    (l) => (l.role || "learner") === "learner" && (l.email || "").toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase()
  );

  // 1. Online Learners KPI (active heartbeat in last 90 seconds)
  const onlineCount = students.filter(isLearnerOnline).length;

  if (kpiOnlineCount) kpiOnlineCount.textContent = String(onlineCount);
  if (kpiOnlineSubtext) {
    kpiOnlineSubtext.innerHTML = `<i class="fa-solid fa-circle-check text-[10px]"></i> ${onlineCount} learner(s) active now`;
  }

  // 2. Registered Learners KPI
  if (kpiTotalStudents) kpiTotalStudents.textContent = String(students.length);
  const count9A = students.filter((l) => (l.class_level || "").includes("9A") || (l.class_level || "").includes("3A")).length;
  const count9B = students.filter((l) => (l.class_level || "").includes("9B") || (l.class_level || "").includes("3B")).length;
  const otherCount = students.length - count9A - count9B;
  if (kpiRegisteredSubtext) {
    kpiRegisteredSubtext.textContent = `${count9A} in Basic 9A • ${count9B} in Basic 9B${otherCount > 0 ? ` • ${otherCount} other` : ""}`;
  }

  // 3. Active Computing Assessments KPI
  const availableAsmts = (state.assessments || []).filter((a) => a.status === "AVAILABLE");
  if (kpiActiveAsmtCount) kpiActiveAsmtCount.textContent = String(availableAsmts.length);
  const cats = availableAsmts.filter((a) => a.assessment_type === "CAT").length;
  const projects = availableAsmts.filter((a) => a.assessment_type === "PROJECT_WORK").length;
  const exams = availableAsmts.filter((a) => a.assessment_type === "EXAM").length;
  if (kpiActiveAsmtSubtext) {
    kpiActiveAsmtSubtext.textContent = `${cats} CATs • ${projects} Projects • ${exams} Exam`;
  }

  // 4. Notifications KPI
  const notifCount = (state.notifications || []).length;
  if (kpiNotifsSent) kpiNotifsSent.textContent = String(notifCount);
  if (kpiNotifsSubtext) {
    kpiNotifsSubtext.textContent = `${notifCount} broadcast announcement(s)`;
  }

  state.lastStatsSnapshot = {
    online: onlineCount,
    registered: students.length,
    assessments: availableAsmts.length,
    notifications: notifCount,
    subs: (state.submissions || []).length,
  };

  const timeEl = document.getElementById("adminLastSyncTime");
  if (timeEl) {
    timeEl.textContent = `Synced: ${new Date().toLocaleTimeString()}`;
  }
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
    if (filterVal === "ONLINE") return isLearnerOnline(l);
    if (filterVal === "STAFF") return (l.role === "teacher" || l.role === "admin" || (l.email && l.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()));
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
    const isOnline = isLearnerOnline(learner);
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

    const roleBadge = learner.role === "admin"
      ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-wider">Admin</span>`
      : (learner.role === "teacher"
          ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-wider">Teacher</span>`
          : "");

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
                ${roleBadge}
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
          <div class="flex items-center justify-end gap-1.5">
            <button
              class="admin-record-student-mark-btn inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
              data-student-id="${learner.id}"
              title="Record Assessment Mark for this student"
            >
              <i class="fa-solid fa-pen-to-square"></i>
              <span>Mark</span>
            </button>
            <button
              class="admin-edit-student-btn inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
              data-student-id="${learner.id}"
              title="Edit this user's details, role, class level, or DOB"
            >
              <i class="fa-solid fa-user-pen"></i>
              <span>Edit</span>
            </button>
            <button
              class="admin-chat-student-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
              data-student-id="${learner.id}"
              title="Start 1-on-1 chat"
            >
              <i class="fa-solid fa-comments"></i>
              <span>Chat</span>
            </button>
            <button
              class="admin-delete-student-btn inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
              data-student-id="${learner.id}"
              data-student-name="${escapeHtml(learner.full_name)}"
              title="Remove user record from database"
            >
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Attach Mark button handlers
  document.querySelectorAll(".admin-record-student-mark-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const studentId = btn.getAttribute("data-student-id");
      openRecordScoreModal(studentId);
    });
  });

  // Attach Edit button handlers
  document.querySelectorAll(".admin-edit-student-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const studentId = btn.getAttribute("data-student-id");
      if (studentId) openEditLearnerModal(studentId);
    });
  });

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

  // Attach Delete button handlers
  document.querySelectorAll(".admin-delete-student-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const studentId = btn.getAttribute("data-student-id");
      const name = btn.getAttribute("data-student-name") || "this user";
      handleDeleteLearner(studentId, name);
    });
  });
}

// ------------------------------------------------------------------------------
// Enroll Real Student & User Handlers
// ------------------------------------------------------------------------------
async function openEnrollStudentModal() {
  if (!enrollStudentModal) return;
  enrollStudentForm?.reset();

  const currentClass = enrollClassLevel?.value || "Basic 9A";
  const nextSeq = await getNextStudentSequence(currentClass);
  if (enrollStudentId) {
    enrollStudentId.value = generateStudentId(currentClass, nextSeq);
  }

  enrollStudentModal.classList.remove("hidden");
  enrollFullName?.focus();
}

async function handleEnrollStudentSubmit(e) {
  e.preventDefault();
  const name = enrollFullName?.value?.trim();
  const roleVal = enrollRole?.value || "learner";
  const classLvl = enrollClassLevel?.value || "Basic 9A";
  const gender = enrollGender?.value || "Male";
  const studentIdVal = enrollStudentId?.value?.trim() || generateStudentId(classLvl, await getNextStudentSequence(classLvl));
  const dob = enrollDob?.value || null;
  const emailVal = enrollEmail?.value?.trim() || null;

  if (!name) {
    alert("Please enter the user's full name.");
    return;
  }

  try {
    const submitBtn = document.getElementById("submitEnrollBtn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Creating User...`;
    }

    await enrollLearner({
      full_name: name,
      role: roleVal,
      student_id: studentIdVal,
      class_level: classLvl,
      gender: gender,
      date_of_birth: dob,
      email: emailVal,
    });

    enrollStudentModal?.classList.add("hidden");
    state.allLearners = await fetchAllLearners();
    renderAdminLearnersTable();
    renderAdminOverviewStats();
    alert(`User "${name}" (${roleVal}) successfully created!`);
  } catch (err) {
    console.error("Enrollment error:", err);
    alert("Failed to create user: " + (err.message || "Unknown error"));
  } finally {
    const submitBtn = document.getElementById("submitEnrollBtn");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Create User`;
    }
  }
}

// ------------------------------------------------------------------------------
// Edit User Profile (Admin Full CRUD)
// ------------------------------------------------------------------------------
function openEditLearnerModal(learnerId) {
  if (!editLearnerModal) return;
  const target = (state.allLearners || []).find((l) => l.id === learnerId);
  if (!target) {
    alert("User record could not be found.");
    return;
  }

  editLearnerForm?.reset();
  if (editLearnerId) editLearnerId.value = target.id;
  if (editLearnerFullName) editLearnerFullName.value = target.full_name || "";
  if (editLearnerRole) editLearnerRole.value = target.role || "learner";
  if (editLearnerClassLevel) editLearnerClassLevel.value = target.class_level || "Basic 9A";
  if (editLearnerGender) editLearnerGender.value = target.gender || "Male";
  if (editLearnerStudentId) editLearnerStudentId.value = target.student_id || "";
  if (editLearnerDob) editLearnerDob.value = target.date_of_birth ? target.date_of_birth.substring(0, 10) : "";
  if (editLearnerIsOnline) editLearnerIsOnline.value = target.is_online ? "true" : "false";
  if (editLearnerEmail) editLearnerEmail.value = target.email || "";

  editLearnerModal.classList.remove("hidden");
  editLearnerFullName?.focus();
}

async function handleEditLearnerSubmit(e) {
  e.preventDefault();
  const userId = editLearnerId?.value?.trim();
  if (!userId) return;

  const fullName = editLearnerFullName?.value?.trim();
  const role = editLearnerRole?.value || "learner";
  const classLevel = editLearnerClassLevel?.value || "Basic 9A";
  const gender = editLearnerGender?.value || "Male";
  const studentIdVal = editLearnerStudentId?.value?.trim() || null;
  const dob = editLearnerDob?.value || null;
  const isOnline = editLearnerIsOnline?.value === "true";
  const emailVal = editLearnerEmail?.value?.trim() || null;

  if (!fullName) {
    alert("Please enter the user's full name.");
    return;
  }

  const btn = submitEditLearnerBtn;
  const origBtnText = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Saving...`;
  }

  try {
    const updates = {
      full_name: fullName,
      role: role,
      class_level: classLevel,
      gender: gender,
      student_id: studentIdVal,
      is_online: isOnline,
      email: emailVal,
    };
    if (dob) {
      updates.date_of_birth = dob;
    }

    await updateLearnerRecord(userId, updates);

    editLearnerModal?.classList.add("hidden");
    state.allLearners = await fetchAllLearners();
    renderAdminLearnersTable();
    renderAdminOverviewStats();
    alert(`User "${fullName}" successfully updated!`);
  } catch (err) {
    console.error("User update error:", err);
    alert("Failed to update user: " + (err.message || "Unknown error"));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origBtnText;
    }
  }
}

// ------------------------------------------------------------------------------
// Delete User (Admin Full CRUD)
// ------------------------------------------------------------------------------
async function handleDeleteLearner(learnerId, learnerName) {
  if (!learnerId) return;

  // Protect designated primary admin from deletion
  const target = (state.allLearners || []).find((l) => l.id === learnerId);
  if (target && target.email && target.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
    alert("The primary administrator account cannot be deleted.");
    return;
  }

  const confirmed = confirm(
    `PERMANENTLY DELETE USER:\n\nAre you sure you want to permanently delete "${learnerName}"?\n\nThis will remove their profile, assessment submissions, and broadsheet records from the live Supabase database.\n\nThis action cannot be undone. Proceed?`
  );
  if (!confirmed) return;

  try {
    await deleteLearnerRecord(learnerId);

    // Hide edit modal if open
    editLearnerModal?.classList.add("hidden");

    // Refresh directory
    state.allLearners = await fetchAllLearners();
    renderAdminLearnersTable();
    renderAdminOverviewStats();
    alert(`User "${learnerName}" was permanently deleted from the database.`);
  } catch (err) {
    console.error("Delete user error:", err);
    alert("Failed to delete user: " + (err.message || "Unknown error"));
  }
}

// ------------------------------------------------------------------------------
// Active Learners Online: Roster List & Detail Drilldown Modal
// ------------------------------------------------------------------------------
async function openActiveLearnersModal() {
  const modalEl = activeLearnersModal || document.getElementById("activeLearnersModal");
  if (!modalEl) return;

  // Make modal visible immediately
  modalEl.style.display = "flex";
  modalEl.classList.remove("hidden");

  // Reset to list view
  const detailView = activeLearnerDetailView || document.getElementById("activeLearnerDetailView");
  const listView = activeLearnersListView || document.getElementById("activeLearnersListView");
  const searchInput = activeLearnersSearchInput || document.getElementById("activeLearnersSearchInput");
  const classFilter = activeLearnersClassFilter || document.getElementById("activeLearnersClassFilter");

  if (detailView) {
    detailView.style.display = "none";
    detailView.classList.add("hidden");
  }
  if (listView) {
    listView.style.display = "block";
    listView.classList.remove("hidden");
  }
  if (searchInput) searchInput.value = "";
  if (classFilter) classFilter.value = "ALL";

  try {
    if (!state.allLearners || state.allLearners.length === 0) {
      state.allLearners = await fetchAllLearners();
    }
  } catch (e) {
    console.warn("Could not fetch learners on modal open:", e);
  }

  try {
    renderActiveLearnersList();
  } catch (e) {
    console.error("renderActiveLearnersList error:", e);
  }
}

function closeActiveLearnersModal() {
  const modalEl = activeLearnersModal || document.getElementById("activeLearnersModal");
  if (modalEl) {
    modalEl.style.display = "none";
    modalEl.classList.add("hidden");
  }
}

function renderActiveLearnersList() {
  const listContainer = activeLearnersListContainer || document.getElementById("activeLearnersListContainer");
  if (!listContainer) return;
  const searchInput = activeLearnersSearchInput || document.getElementById("activeLearnersSearchInput");
  const classFilter = activeLearnersClassFilter || document.getElementById("activeLearnersClassFilter");
  const countText = activeLearnersModalCountText || document.getElementById("activeLearnersModalCountText");
  const countBadge = activeLearnersModalCountBadge || document.getElementById("activeLearnersModalCountBadge");

  const searchVal = (searchInput?.value || "").toLowerCase().trim();
  const classFilterVal = classFilter?.value || "ALL";

  // Filter for active online learners (must have heartbeat within last 90s)
  let onlineLearners = (state.allLearners || []).filter((l) => {
    const isStudent = (l.role || "learner") === "learner" && (l.email || "").toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase();
    if (!isStudent) return false;
    return isLearnerOnline(l);
  });

  const totalOnlineCount = onlineLearners.length;
  if (countText) {
    countText.textContent = `${totalOnlineCount} Active Now`;
  }
  if (countBadge) {
    countBadge.innerHTML = `
      <span class="w-1.5 h-1.5 rounded-full ${totalOnlineCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}"></span>
      <span>${totalOnlineCount} Active Now</span>
    `;
  }

  // Apply filters
  if (classFilterVal !== "ALL") {
    onlineLearners = onlineLearners.filter((l) => l.class_level === classFilterVal);
  }
  if (searchVal) {
    onlineLearners = onlineLearners.filter((l) =>
      (l.full_name || "").toLowerCase().includes(searchVal) ||
      (l.student_id || "").toLowerCase().includes(searchVal) ||
      (l.class_level || "").toLowerCase().includes(searchVal) ||
      (l.email || "").toLowerCase().includes(searchVal)
    );
  }

  if (onlineLearners.length === 0) {
    listContainer.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-xl">
          <i class="fa-solid fa-users-slash"></i>
        </div>
        <p class="font-bold text-slate-700 text-sm">No Active Learners Online</p>
        <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          No learners matching the criteria are connected right now. When students log into the portal, their active session and presence indicators update here in real-time.
        </p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = onlineLearners.map((learner) => {
    const subs = learner.submissions || [];
    const subCount = subs.length;
    const age = calculateAge(learner.date_of_birth);

    return `
      <div
        class="active-learner-item-row bg-white hover:bg-emerald-50/50 border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-3.5 sm:p-4 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer shadow-2xs hover:shadow-sm group"
        data-learner-id="${learner.id}"
        title="Click to view full profile & academic details for ${escapeHtml(learner.full_name)}"
      >
        <div class="flex items-center gap-3.5">
          <div class="relative shrink-0">
            <img src="${learner.avatar_url || AVATAR_PRESETS[0]}" alt="Avatar" class="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-500/40 group-hover:ring-emerald-500 transition-all shadow-xs" />
            <span class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center">
              <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            </span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-900 group-hover:text-emerald-800 transition-colors text-sm sm:text-base">${escapeHtml(learner.full_name)}</span>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span class="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">${escapeHtml(learner.student_id || generateStudentId(learner.class_level, 1))}</span>
              <span class="font-semibold text-slate-700">${learner.class_level || "Basic 9A"}</span>
              ${age != null ? `<span>&bull;</span><span>${age} yrs</span>` : ""}
              <span>&bull;</span>
              <span class="text-slate-400 truncate max-w-[150px] sm:max-w-xs">${escapeHtml(learner.email || "No email")}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
          <div class="text-left sm:text-right text-xs">
            <span class="font-bold text-slate-800 block">${subCount} submission(s)</span>
            <span class="text-[11px] text-emerald-600 font-medium">Active now (${formatTimeAgo(learner.last_seen)})</span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white group-hover:bg-emerald-700 shadow-xs transition cursor-pointer"
          >
            <span>View Details</span>
            <i class="fa-solid fa-arrow-right text-[10px]"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");

  // Attach selection click listeners
  document.querySelectorAll(".active-learner-item-row").forEach((row) => {
    row.addEventListener("click", () => {
      const learnerId = row.getAttribute("data-learner-id");
      const targetLearner = (state.allLearners || []).find((l) => l.id === learnerId);
      if (targetLearner) {
        showActiveLearnerDetail(targetLearner);
      }
    });
  });
}

function showActiveLearnerDetail(learner) {
  const detailContent = activeLearnerDetailContent || document.getElementById("activeLearnerDetailContent");
  const detailView = activeLearnerDetailView || document.getElementById("activeLearnerDetailView");
  const listView = activeLearnersListView || document.getElementById("activeLearnersListView");
  if (!detailContent || !detailView || !listView) return;

  detailContent.innerHTML = renderActiveLearnerDetailHtml(learner);
  listView.style.display = "none";
  listView.classList.add("hidden");
  detailView.style.display = "block";
  detailView.classList.remove("hidden");

  // Wire action buttons inside detail view
  document.querySelectorAll(".active-modal-chat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeActiveLearnersModal();
      openChatWithUser(learner);
    });
  });

  document.querySelectorAll(".active-modal-mark-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeActiveLearnersModal();
      openRecordScoreModal(learner.id);
    });
  });

  document.querySelectorAll(".active-modal-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeActiveLearnersModal();
      openEditLearnerModal(learner.id);
    });
  });
}

function renderActiveLearnerDetailHtml(learner) {
  const subs = learner.submissions || [];
  const subCount = subs.length;
  const avgScore = subCount > 0
    ? (subs.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0) / subCount).toFixed(1)
    : "0.0";
  const lastScore = subCount > 0 ? `${subs[0].score}/${subs[0].max_score || 20}` : "None";
  const age = calculateAge(learner.date_of_birth);

  return `
    <!-- Top Identity Card -->
    <div class="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="relative">
            <img src="${learner.avatar_url || AVATAR_PRESETS[0]}" alt="Avatar" class="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-400 shadow-md" />
            <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-slate-900 flex items-center justify-center">
              <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            </span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-base sm:text-lg font-bold">${escapeHtml(learner.full_name)}</h4>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">Online Now</span>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1">
              <span class="font-mono bg-white/10 px-2 py-0.5 rounded font-bold text-emerald-300">${escapeHtml(learner.student_id || generateStudentId(learner.class_level, 1))}</span>
              <span>&bull;</span>
              <span class="font-semibold text-white">${learner.class_level || "Basic 9A"}</span>
              <span>&bull;</span>
              <span>${learner.gender || "Gender: N/A"}</span>
              ${age != null ? `<span>&bull;</span><span>${age} yrs</span>` : ""}
            </div>
            <div class="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <i class="fa-regular fa-envelope text-[11px]"></i> ${escapeHtml(learner.email || "No email provided")}
            </div>
          </div>
        </div>

        <!-- Quick Action Buttons inside Card -->
        <div class="flex flex-wrap sm:flex-col gap-2 shrink-0">
          <button
            class="active-modal-chat-btn inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer shadow-sm"
            data-learner-id="${learner.id}"
          >
            <i class="fa-solid fa-comments"></i> Start Live Chat
          </button>
          <button
            class="active-modal-mark-btn inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer"
            data-learner-id="${learner.id}"
          >
            <i class="fa-solid fa-pen-to-square"></i> Record Marks
          </button>
          <button
            class="active-modal-edit-btn inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer"
            data-learner-id="${learner.id}"
          >
            <i class="fa-solid fa-user-pen"></i> Edit Profile
          </button>
        </div>
      </div>
    </div>

    <!-- 4 KPI Metrics for this Learner -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
        <span class="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Submissions</span>
        <span class="text-lg font-extrabold text-slate-900">${subCount}</span>
        <span class="text-[10px] text-slate-500 block">Assessment(s)</span>
      </div>
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
        <span class="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Average Score</span>
        <span class="text-lg font-extrabold text-indigo-600">${avgScore}</span>
        <span class="text-[10px] text-slate-500 block">Out of 20 marks</span>
      </div>
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
        <span class="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Latest Score</span>
        <span class="text-lg font-extrabold text-emerald-600">${lastScore}</span>
        <span class="text-[10px] text-slate-500 block">Recent submission</span>
      </div>
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
        <span class="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Presence</span>
        <span class="text-sm font-bold text-emerald-600 flex items-center justify-center gap-1 mt-1">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active
        </span>
        <span class="text-[10px] text-slate-400 block mt-0.5">${formatTimeAgo(learner.last_seen)}</span>
      </div>
    </div>

    <!-- Personal & Register Details -->
    <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
      <h5 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
        <i class="fa-solid fa-id-card text-indigo-600"></i> Official Academic &amp; Demographic Details
      </h5>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
        <div>
          <span class="text-slate-400 text-[11px] block">Date of Birth:</span>
          <span class="font-semibold text-slate-800">${learner.date_of_birth ? formatDateOnly(learner.date_of_birth) : "Not recorded"}</span>
        </div>
        <div>
          <span class="text-slate-400 text-[11px] block">Account Role:</span>
          <span class="font-semibold text-slate-800 capitalize">${learner.role || "learner"}</span>
        </div>
        <div>
          <span class="text-slate-400 text-[11px] block">Onboarding Status:</span>
          <span class="font-semibold ${learner.onboarding_completed ? 'text-emerald-600' : 'text-amber-600'}">
            ${learner.onboarding_completed ? 'Completed' : 'Pending'}
          </span>
        </div>
        <div>
          <span class="text-slate-400 text-[11px] block">Enrolled Date:</span>
          <span class="font-semibold text-slate-800">${learner.created_at ? formatDateOnly(learner.created_at) : "N/A"}</span>
        </div>
        <div>
          <span class="text-slate-400 text-[11px] block">Last Activity:</span>
          <span class="font-semibold text-slate-800">${learner.last_seen ? new Date(learner.last_seen).toLocaleTimeString() : "Just now"}</span>
        </div>
        <div>
          <span class="text-slate-400 text-[11px] block">Subject Curriculum:</span>
          <span class="font-semibold text-indigo-700">NaCCA Computing</span>
        </div>
      </div>
    </div>

    <!-- Submissions History Section -->
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="flex items-center justify-between mb-2.5">
        <h5 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-list-check text-emerald-600"></i> Assessment Submissions &amp; Grades (${subCount})
        </h5>
      </div>
      ${subCount === 0 ? `
        <div class="py-6 text-center text-slate-400 text-xs">
          <i class="fa-solid fa-file-circle-question text-2xl text-slate-300 block mb-1"></i>
          This learner has not submitted any online assessment tasks yet this term.
        </div>
      ` : `
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-200 text-slate-400 font-bold text-[10px] uppercase">
                <th class="py-2 px-2">Task</th>
                <th class="py-2 px-2">Score</th>
                <th class="py-2 px-2">Status</th>
                <th class="py-2 px-2">Submitted</th>
                <th class="py-2 px-2">Remarks</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${subs.map((s) => `
                <tr class="hover:bg-slate-50">
                  <td class="py-2.5 px-2 font-semibold text-slate-800">${escapeHtml(s.assessments?.title || s.assessment_id)}</td>
                  <td class="py-2.5 px-2 font-bold text-indigo-700 font-mono">${s.score}/${s.max_score || 20}</td>
                  <td class="py-2.5 px-2"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">${s.status || "GRADED"}</span></td>
                  <td class="py-2.5 px-2 text-slate-500 text-[11px]">${formatDateOnly(s.submitted_at)}</td>
                  <td class="py-2.5 px-2 text-slate-500 italic text-[11px]">${escapeHtml(s.teacher_remarks || "Marked.")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// Expose Active Learners Modal handlers globally on window
window.openActiveLearnersModal = openActiveLearnersModal;
window.closeActiveLearnersModal = closeActiveLearnersModal;
window.showActiveLearnerDetail = showActiveLearnerDetail;
window.renderActiveLearnersList = renderActiveLearnersList;
window.startAdminDemoMode = startAdminDemoMode;

// Authentic Ghanaian Basic 9 Student Roster Seed
async function handleQuickSeedRoster() {
  const confirmed = confirm(
    "POPULATE OFFICIAL GHANAIAN CLASS ROSTER:\n\nThis will insert official Basic 9A (25 learners) and Basic 9B (25 learners) records with authentic Ghanaian names and generated Student IDs into your live Supabase database.\n\nProceed?"
  );
  if (!confirmed) return;

  const btn = quickSeedRosterBtn;
  const originalText = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Inserting Roster...`;
  }

  const standardRoster = [
    // Basic 9A (25 Learners)
    { full_name: "Kwame Mensah Frimpong", class_level: "Basic 9A", gender: "Male", date_of_birth: "2011-10-14" },
    { full_name: "Akosua Adobea Ansah", class_level: "Basic 9A", gender: "Female", date_of_birth: "2011-08-22" },
    { full_name: "Kofi Boateng", class_level: "Basic 9A", gender: "Male", date_of_birth: "2011-03-15" },
    { full_name: "Abena Osei", class_level: "Basic 9A", gender: "Female", date_of_birth: "2011-12-05" },
    { full_name: "Yaw Antwi", class_level: "Basic 9A", gender: "Male", date_of_birth: "2011-05-19" },
    { full_name: "Efua Danso", class_level: "Basic 9A", gender: "Female", date_of_birth: "2011-07-09" },
    { full_name: "Kweku Asamoah", class_level: "Basic 9A", gender: "Male", date_of_birth: "2011-02-18" },
    { full_name: "Yaa Serwaa", class_level: "Basic 9A", gender: "Female", date_of_birth: "2011-11-28" },
    { full_name: "Kwesi Appiah", class_level: "Basic 9A", gender: "Male", date_of_birth: "2011-04-03" },
    { full_name: "Akua Boadiwaa", class_level: "Basic 9A", gender: "Female", date_of_birth: "2011-09-17" },
    { full_name: "Kobina Dadzie", class_level: "Basic 9A", gender: "Male", date_of_birth: "2011-01-25" },
    { full_name: "Adjoa Kwartemaa", class_level: "Basic 9A", gender: "Female", date_of_birth: "2011-06-12" },
    { full_name: "Ekow Quansah", class_level: "Basic 9A", gender: "Male", date_of_birth: "2011-08-30" },
    { full_name: "Ama Agyemang", class_level: "Basic 9A", gender: "Female", date_of_birth: "2011-03-21" },
    { full_name: "Fiifi Essien", class_level: "Basic 9A", gender: "Male", date_of_birth: "2011-10-05" },
    { full_name: "Nana Ama Konadu", class_level: "Basic 9A", gender: "Female", date_of_birth: "2011-05-14" },
    { full_name: "Kwabena Badu", class_level: "Basic 9A", gender: "Male", date_of_birth: "2011-07-27" },
    { full_name: "Maame Serwah", class_level: "Basic 9A", gender: "Female", date_of_birth: "2011-12-19" },
    { full_name: "Paa Kwesi Ofori", class_level: "Basic 9A", gender: "Male", date_of_birth: "2011-02-08" },
    { full_name: "Afia Pokuaa", class_level: "Basic 9A", gender: "Female", date_of_birth: "2011-09-02" },
    { full_name: "Kodwo Nyamekye", class_level: "Basic 9A", gender: "Male", date_of_birth: "2011-04-16" },
    { full_name: "Esi Mansah", class_level: "Basic 9A", gender: "Female", date_of_birth: "2011-11-11" },
    { full_name: "Jojo Turkson", class_level: "Basic 9A", gender: "Male", date_of_birth: "2011-01-07" },
    { full_name: "Araba Baidoo", class_level: "Basic 9A", gender: "Female", date_of_birth: "2011-06-25" },
    { full_name: "Kwaku Darko", class_level: "Basic 9A", gender: "Male", date_of_birth: "2011-08-18" },

    // Basic 9B (25 Learners)
    { full_name: "Selorm Agbenu", class_level: "Basic 9B", gender: "Male", date_of_birth: "2011-02-14" },
    { full_name: "Eyram Dzifa Doe", class_level: "Basic 9B", gender: "Female", date_of_birth: "2011-07-19" },
    { full_name: "Mawuli Gbeho", class_level: "Basic 9B", gender: "Male", date_of_birth: "2011-09-23" },
    { full_name: "Enam Akpalu", class_level: "Basic 9B", gender: "Female", date_of_birth: "2011-04-12" },
    { full_name: "Elikplim Ametefe", class_level: "Basic 9B", gender: "Male", date_of_birth: "2011-11-05" },
    { full_name: "Kafui Sedziafa", class_level: "Basic 9B", gender: "Female", date_of_birth: "2011-01-30" },
    { full_name: "Senyo Kpodo", class_level: "Basic 9B", gender: "Male", date_of_birth: "2011-06-17" },
    { full_name: "Delali Nyavor", class_level: "Basic 9B", gender: "Female", date_of_birth: "2011-08-08" },
    { full_name: "Fafa Tsikata", class_level: "Basic 9B", gender: "Female", date_of_birth: "2011-12-02" },
    { full_name: "Makafui Dotse", class_level: "Basic 9B", gender: "Male", date_of_birth: "2011-03-29" },
    { full_name: "Nii Laryea Vanderpuye", class_level: "Basic 9B", gender: "Male", date_of_birth: "2011-05-22" },
    { full_name: "Naa Ayeley Tagoe", class_level: "Basic 9B", gender: "Female", date_of_birth: "2011-10-18" },
    { full_name: "Kpakpo Addo", class_level: "Basic 9B", gender: "Male", date_of_birth: "2011-04-26" },
    { full_name: "Naa Dedei Ashitey", class_level: "Basic 9B", gender: "Female", date_of_birth: "2011-09-14" },
    { full_name: "Nii Ayitey Hammond", class_level: "Basic 9B", gender: "Male", date_of_birth: "2011-01-11" },
    { full_name: "Naa Shormeh Aryee", class_level: "Basic 9B", gender: "Female", date_of_birth: "2011-07-03" },
    { full_name: "Nii Okaija Adjei", class_level: "Basic 9B", gender: "Male", date_of_birth: "2011-11-20" },
    { full_name: "Naa Lamiley Mills", class_level: "Basic 9B", gender: "Female", date_of_birth: "2011-03-08" },
    { full_name: "Tetteh Nortey", class_level: "Basic 9B", gender: "Male", date_of_birth: "2011-08-15" },
    { full_name: "Korkor Lamptey", class_level: "Basic 9B", gender: "Female", date_of_birth: "2011-06-01" },
    { full_name: "Abdul-Rashid Yakubu", class_level: "Basic 9B", gender: "Male", date_of_birth: "2011-02-28" },
    { full_name: "Amina Alhassan", class_level: "Basic 9B", gender: "Female", date_of_birth: "2011-10-31" },
    { full_name: "Mohammed Fuseini", class_level: "Basic 9B", gender: "Male", date_of_birth: "2011-05-09" },
    { full_name: "Zainab Iddrisu", class_level: "Basic 9B", gender: "Female", date_of_birth: "2011-12-25" },
    { full_name: "Ibrahim Sulemana", class_level: "Basic 9B", gender: "Male", date_of_birth: "2011-04-01" },
  ];

  try {
    const inserted = await batchEnrollLearners(standardRoster);
    enrollStudentModal?.classList.add("hidden");
    state.allLearners = await fetchAllLearners();
    renderAdminLearnersTable();
    renderAdminOverviewStats();
    alert(`Successfully enrolled ${inserted?.length || 50} official students into Supabase!\n\nAll metrics, presence, and broadsheets now reflect live student data.`);
  } catch (err) {
    console.error("Batch roster error:", err);
    alert("Could not populate roster: " + (err.message || "Unknown error"));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

// ------------------------------------------------------------------------------
// Record Real Assessment Marks Handlers
// ------------------------------------------------------------------------------
function openRecordScoreModal(preselectedLearnerId = null) {
  if (!recordScoreModal) return;
  recordScoreForm?.reset();

  // Populate learners dropdown
  if (recordScoreLearnerSelect) {
    const students = (state.allLearners || []).filter(
      (l) => (l.role || "learner") === "learner" && (l.email || "").toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase()
    );
    recordScoreLearnerSelect.innerHTML = students.map((l) => `
      <option value="${l.id}" ${preselectedLearnerId === l.id ? "selected" : ""}>
        ${escapeHtml(l.full_name)} (${l.class_level || "Basic 9A"} • ${escapeHtml(l.student_id || "")})
      </option>
    `).join("");
  }

  // Populate assessments dropdown
  if (recordScoreAsmtSelect) {
    recordScoreAsmtSelect.innerHTML = (state.assessments || []).map((a) => `
      <option value="${a.id}" data-max="${a.max_score || 20}">
        ${escapeHtml(a.title)} (${a.class_level} • Max: ${a.max_score || 20} pts)
      </option>
    `).join("");

    recordScoreAsmtSelect.onchange = () => {
      const selected = recordScoreAsmtSelect.options[recordScoreAsmtSelect.selectedIndex];
      const max = selected?.getAttribute("data-max") || 20;
      if (recordScoreMaxVal) recordScoreMaxVal.value = max;
      if (recordScoreVal) recordScoreVal.max = max;
    };
    recordScoreAsmtSelect.onchange(null);
  }

  recordScoreModal.classList.remove("hidden");
  recordScoreVal?.focus();
}

async function handleRecordScoreSubmit(e) {
  e.preventDefault();
  const learnerId = recordScoreLearnerSelect?.value;
  const asmtId = recordScoreAsmtSelect?.value;
  const score = parseFloat(recordScoreVal?.value);
  const maxScore = parseFloat(recordScoreMaxVal?.value) || 20;
  const remarks = recordScoreRemarks?.value?.trim() || "Marked and recorded.";

  if (!learnerId || !asmtId || isNaN(score)) {
    alert("Please select a student, assessment, and valid mark.");
    return;
  }

  try {
    const submitBtn = document.getElementById("submitRecordScoreBtn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Saving...`;
    }

    await recordLearnerScore({
      learner_id: learnerId,
      assessment_id: asmtId,
      score: score,
      max_score: maxScore,
      teacher_remarks: remarks,
    });

    recordScoreModal?.classList.add("hidden");
    state.allLearners = await fetchAllLearners();
    state.submissions = await fetchAllSubmissions();
    renderAdminLearnersTable();
    renderAdminOverviewStats();
    alert("Assessment mark recorded successfully into live database!");
  } catch (err) {
    console.error("Record score error:", err);
    alert("Failed to save mark: " + (err.message || "Unknown error"));
  } finally {
    const submitBtn = document.getElementById("submitRecordScoreBtn");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Mark`;
    }
  }
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
// ------------------------------------------------------------------------------
// Realtime Floating Chat Widget Controller (User-to-User & User-with-Admin)
// ------------------------------------------------------------------------------
function getMyUserId() {
  const isCurrentUserAdmin = state.isAdmin || (state.user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
  if (isCurrentUserAdmin) return ADMIN_CONTACT.id;
  if (state.profile?.id && state.profile.id !== "admin-master-debrah") return state.profile.id;
  if (state.user?.id && !state.user.id.startsWith("admin-")) return state.user.id;
  return "30d8e3f6-a5c4-47d2-af35-97cd81bbc0bf";
}

function isMessageAddressedToMe(msg, myId) {
  if (!msg) return false;
  if (msg.sender_id === myId) return false;

  const isCurrentUserAdmin = state.isAdmin || (state.user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

  if (isCurrentUserAdmin) {
    return (
      msg.recipient_id === ADMIN_CONTACT.id ||
      msg.recipient_id === myId ||
      msg.recipient_role === "admin" ||
      !msg.recipient_id
    );
  } else {
    return (
      msg.recipient_id === myId ||
      (msg.sender_role === "admin" && (!msg.recipient_id || msg.recipient_id === myId))
    );
  }
}

function updateChatUnreadDot() {
  const myId = getMyUserId();
  const unreadMessages = (state.chatMessages || []).filter((m) => {
    return !m.read && isMessageAddressedToMe(m, myId);
  });

  const totalUnread = unreadMessages.length;
  const isChatOpen = chatWindow && !chatWindow.classList.contains("hidden");

  if (chatUnreadDot) {
    if (totalUnread > 0 && !isChatOpen) {
      chatUnreadDot.textContent = totalUnread > 9 ? "9+" : String(totalUnread);
      chatUnreadDot.classList.remove("hidden");
      chatUnreadDot.classList.add("flex");
    } else {
      chatUnreadDot.classList.add("hidden");
      chatUnreadDot.classList.remove("flex");
      chatUnreadDot.textContent = "";
    }
  }

  // Update Contacts drawer button badge
  const contactsBadge = document.getElementById("chatContactsUnreadBadge");
  if (contactsBadge) {
    const otherUnread = unreadMessages.filter(
      (m) => !state.activeChatPartner || (m.sender_id !== state.activeChatPartner.id && !(state.activeChatPartner.role === "admin" && m.sender_role === "admin"))
    ).length;

    if (otherUnread > 0) {
      contactsBadge.textContent = otherUnread > 9 ? "9+" : String(otherUnread);
      contactsBadge.classList.remove("hidden");
      contactsBadge.classList.add("inline-flex");
    } else {
      contactsBadge.classList.add("hidden");
      contactsBadge.classList.remove("inline-flex");
      contactsBadge.textContent = "";
    }
  }
}

let globalUnlockedAudioCtx = null;
function getUnlockedAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!globalUnlockedAudioCtx) {
      globalUnlockedAudioCtx = new AudioCtx();
    }
    if (globalUnlockedAudioCtx.state === "suspended") {
      globalUnlockedAudioCtx.resume().catch(() => {});
    }
    return globalUnlockedAudioCtx;
  } catch (e) {
    return null;
  }
}

// User-gesture audio unlocker for mobile and modern desktop browsers
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    const ctx = getUnlockedAudioContext();
    if (ctx && ctx.state === "running") {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    }
  };
  window.addEventListener("click", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
}

function generateChimeWavDataUrl() {
  const sampleRate = 22050;
  const durationSec = 0.45;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    if (t < 0.22) {
      const env1 = Math.max(0, 1 - (t / 0.22));
      sample += Math.sin(2 * Math.PI * 659.25 * t) * 0.4 * env1;
    }
    if (t >= 0.08) {
      const t2 = t - 0.08;
      const env2 = Math.max(0, 1 - (t2 / 0.35));
      sample += Math.sin(2 * Math.PI * 880 * t) * 0.5 * env2;
    }
    sample = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa !== "undefined" ? btoa(binary) : (typeof Buffer !== "undefined" ? Buffer.from(binary, "binary").toString("base64") : "");
  return "data:audio/wav;base64," + base64;
}

function generateVoiceNoteWavDataUrl(durationSec = 2.5) {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);

  const baseFreqs = [261.63, 329.63, 392.00, 523.25];
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteIdx = Math.min(Math.floor((t / durationSec) * baseFreqs.length), baseFreqs.length - 1);
    const freq = baseFreqs[noteIdx];
    const vibrato = Math.sin(2 * Math.PI * 5 * t) * 2;
    const fund = Math.sin(2 * Math.PI * (freq + vibrato) * t);
    const h2 = 0.5 * Math.sin(2 * Math.PI * 2 * (freq + vibrato) * t);
    const h3 = 0.25 * Math.sin(2 * Math.PI * 3 * (freq + vibrato) * t);
    const env = Math.min(1, t / 0.05) * Math.max(0, 1 - (t / durationSec));
    const sample = Math.max(-1, Math.min(1, (fund + h2 + h3) * 0.45 * env));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa !== "undefined" ? btoa(binary) : (typeof Buffer !== "undefined" ? Buffer.from(binary, "binary").toString("base64") : "");
  return "data:audio/wav;base64," + base64;
}

let cachedChimeDataUrl = null;

function playNotificationChime() {
  try {
    const ctx = getUnlockedAudioContext();
    if (ctx && ctx.state === "running") {
      const now = ctx.currentTime;
      // Note 1 (E5: 659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Note 2 (A5: 880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.09);
      gain2.gain.setValueAtTime(0.35, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.38);
      return;
    }
  } catch (e) {
    // Web Audio blocked or not running, proceed to HTML5 Audio fallback
  }

  try {
    if (!cachedChimeDataUrl) {
      cachedChimeDataUrl = generateChimeWavDataUrl();
    }
    const audio = new Audio(cachedChimeDataUrl);
    audio.volume = 0.5;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Notification audio autoplay blocked by browser policy:", err);
      });
    }
  } catch (e) {
    // Autoplay policy or unsupported
  }
}

let chatToastTimeout = null;
function showIncomingChatToast(msg) {
  const toast = document.getElementById("chatIncomingToast");
  const avatar = document.getElementById("chatToastAvatar");
  const sender = document.getElementById("chatToastSender");
  const preview = document.getElementById("chatToastPreview");
  const openBtn = document.getElementById("chatToastOpenBtn");
  if (!toast) return;

  if (avatar) {
    avatar.src = msg.sender_role === "admin" ? TEACHER_AVATAR : (msg.sender_avatar || AVATAR_PRESETS[0]);
  }
  if (sender) sender.textContent = msg.sender_name || "New Direct Message";
  if (preview) preview.textContent = msg.message || "Shared an attachment";

  toast.classList.remove("hidden");

  if (openBtn) {
    openBtn.onclick = () => {
      toast.classList.add("hidden");
      const senderContact = (state.allLearners || []).find((l) => l.id === msg.sender_id) ||
        (msg.sender_role === "admin" ? ADMIN_CONTACT : null);
      if (senderContact) {
        openChatWithUser(senderContact);
      } else {
        openChatBtn?.click();
      }
    };
  }

  if (chatToastTimeout) clearTimeout(chatToastTimeout);
  chatToastTimeout = setTimeout(() => {
    toast?.classList.add("hidden");
  }, 6000);
}

async function toggleChatContactsDrawer(forceShow) {
  if (!chatContactsDrawer) return;
  const shouldShow = forceShow !== undefined ? forceShow : chatContactsDrawer.classList.contains("hidden");
  if (shouldShow) {
    chatContactsDrawer.classList.remove("hidden");
    if (!state.allLearners || state.allLearners.length === 0) {
      state.allLearners = await fetchAllLearners();
    }
    renderChatContactsList();
    chatContactSearchInput?.focus();
  } else {
    chatContactsDrawer.classList.add("hidden");
  }
}

window.toggleChatContactsDrawer = toggleChatContactsDrawer;

function renderChatContactsList() {
  if (!chatContactsListContainer) return;
  const myId = getMyUserId();
  const search = (chatContactSearchInput?.value || "").toLowerCase().trim();

  let html = "";

  // 1. Academic Staff (Master Debrah) - Shown if current viewer is in learner view or not admin
  if (!state.isAdmin || state.activeView === "learner") {
    const adminLearner = (state.allLearners || []).find(
      (l) => l.id === ADMIN_CONTACT.id || (l.role || "").toLowerCase() === "admin" || (l.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()
    ) || ADMIN_CONTACT;
    const isAdminOnline = isLearnerOnline(adminLearner);

    const isCurrentPartner = state.activeChatPartner?.id === ADMIN_CONTACT.id;
    const unreadAdminCount = (state.chatMessages || []).filter(
      (m) => (m.sender_role === "admin" || m.sender_id === ADMIN_CONTACT.id) && !m.read && isMessageAddressedToMe(m, myId)
    ).length;

    const adminMatches =
      !search ||
      ADMIN_CONTACT.full_name.toLowerCase().includes(search) ||
      "admin".includes(search) ||
      "teacher".includes(search) ||
      "computing".includes(search);

    if (adminMatches) {
      html += `
        <div class="px-2 pt-1 pb-1">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Academic Staff</span>
          <div
            class="chat-contact-item flex items-center justify-between p-2.5 rounded-xl border ${isCurrentPartner ? 'bg-indigo-50/90 border-indigo-200 ring-1 ring-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50'} transition cursor-pointer group shadow-2xs"
            data-partner-type="admin"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="relative shrink-0">
                <img src="${TEACHER_AVATAR}" alt="Teacher" class="w-9 h-9 rounded-full object-cover ring-2 ${isAdminOnline ? 'ring-emerald-400' : 'ring-slate-300'} shadow-xs" />
                <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${isAdminOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'} ring-2 ring-white"></span>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-xs text-slate-900 truncate">${ADMIN_CONTACT.full_name}</span>
                  <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700 uppercase">Staff</span>
                </div>
                <div class="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span class="${isAdminOnline ? 'text-emerald-600 font-bold' : 'text-slate-400'}">${isAdminOnline ? '● Online' : (adminLearner.last_seen ? 'Offline (' + formatTimeAgo(adminLearner.last_seen) + ')' : 'Offline')}</span>
                  <span>&bull;</span>
                  <span class="truncate">Head of Computing</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              ${unreadAdminCount > 0 ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shadow-xs animate-pulse">${unreadAdminCount} new</span>` : ''}
              ${isCurrentPartner ? `<span class="text-xs font-bold text-indigo-600"><i class="fa-solid fa-check"></i></span>` : `<i class="fa-solid fa-chevron-right text-[10px] text-slate-400 group-hover:text-slate-600"></i>`}
            </div>
          </div>
        </div>
      `;
    }
  }

  // 2. Registered Learners / Classmates
  const students = (state.allLearners || []).filter((l) => {
    const isStudent = (l.role || "learner") === "learner" && (l.email || "").toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase();
    if (!isStudent) return false;
    if (l.id === myId) return false;
    if (search) {
      return (
        (l.full_name || "").toLowerCase().includes(search) ||
        (l.student_id || "").toLowerCase().includes(search) ||
        (l.class_level || "").toLowerCase().includes(search) ||
        (l.email || "").toLowerCase().includes(search)
      );
    }
    return true;
  });

  html += `
    <div class="px-2 pt-2">
      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
        ${state.isAdmin && state.activeView === "admin" ? "Ghana Basic 9 Students" : "Classmates & Peer Learners"} (${students.length})
      </span>
  `;

  if (students.length === 0) {
    html += `
      <div class="py-6 text-center text-slate-400 text-xs">
        <i class="fa-solid fa-user-slash mb-1 block text-base text-slate-300"></i>
        No learners matching "${escapeHtml(search)}".
      </div>
    `;
  } else {
    students.forEach((student) => {
      const isCurrent = state.activeChatPartner?.id === student.id;
      const isOnline = isLearnerOnline(student);
      const unreadCount = (state.chatMessages || []).filter(
        (m) => m.sender_id === student.id && !m.read && isMessageAddressedToMe(m, myId)
      ).length;

      html += `
        <div
          class="chat-contact-item flex items-center justify-between p-2 rounded-xl border mb-1.5 ${isCurrent ? 'bg-indigo-50/90 border-indigo-200 ring-1 ring-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50'} transition cursor-pointer group shadow-2xs"
          data-learner-id="${student.id}"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="relative shrink-0">
              <img src="${student.avatar_url || AVATAR_PRESETS[0]}" alt="Avatar" class="w-8 h-8 rounded-full object-cover ring-2 ${isOnline ? 'ring-emerald-400' : 'ring-slate-200'} shadow-2xs" />
              <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'} ring-1.5 ring-white"></span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-xs text-slate-900 truncate">${escapeHtml(student.full_name)}</span>
                <span class="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700">${escapeHtml(student.student_id || generateStudentId(student.class_level, 1))}</span>
              </div>
              <div class="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span class="font-medium">${student.class_level || "Basic 9"}</span>
                <span>&bull;</span>
                <span class="${isOnline ? 'text-emerald-600 font-bold' : 'text-slate-400'}">${isOnline ? '● Online' : (student.last_seen ? 'Offline (' + formatTimeAgo(student.last_seen) + ')' : 'Offline')}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            ${unreadCount > 0 ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shadow-xs animate-pulse">${unreadCount} new</span>` : ''}
            ${isCurrent ? `<span class="text-xs font-bold text-indigo-600"><i class="fa-solid fa-check"></i></span>` : `<i class="fa-solid fa-chevron-right text-[10px] text-slate-400 group-hover:text-slate-600"></i>`}
          </div>
        </div>
      `;
    });
  }

  html += `</div>`;
  chatContactsListContainer.innerHTML = html;

  // Wire selection
  chatContactsListContainer.querySelectorAll(".chat-contact-item").forEach((el) => {
    el.addEventListener("click", () => {
      const partnerType = el.getAttribute("data-partner-type");
      if (partnerType === "admin") {
        openChatWithUser(ADMIN_CONTACT);
      } else {
        const learnerId = el.getAttribute("data-learner-id");
        const target = (state.allLearners || []).find((l) => l.id === learnerId);
        if (target) openChatWithUser(target);
      }
      toggleChatContactsDrawer(false);
    });
  });
}

let chatPresenceRefreshInterval = null;

async function initChat() {
  // Ensure chat widget launcher is always visible
  const chatContainer = document.getElementById("floatingChatContainer");
  if (chatContainer) chatContainer.classList.remove("hidden");

  if (!state.allLearners || state.allLearners.length === 0) {
    state.allLearners = await fetchAllLearners();
  }

  const isCurrentUserAdmin = state.isAdmin || (state.user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

  if (!state.activeChatPartner) {
    if (isCurrentUserAdmin) {
      const firstStudent = (state.allLearners || []).find(
        (l) => (l.role || "learner") === "learner" && (l.email || "").toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase()
      );
      state.activeChatPartner = firstStudent || null;
    } else {
      state.activeChatPartner = ADMIN_CONTACT;
    }
  }

  state.chatMessages = await fetchChatMessages();
  updateChatUnreadDot();
  renderChatPartnerHeader();
  renderChatMessages();

  // Realtime Live Presence Subscription for All Learners & Admin
  subscribeToLearnersRealtime((updatedLearner) => {
    const idx = (state.allLearners || []).findIndex((l) => l.id === updatedLearner.id);
    if (idx !== -1) {
      state.allLearners[idx] = { ...state.allLearners[idx], ...updatedLearner };
    } else {
      state.allLearners.push(updatedLearner);
    }
    renderChatPartnerHeader();
    if (chatContactsDrawer && !chatContactsDrawer.classList.contains("hidden")) {
      renderChatContactsList();
    }
  });

  // Refresh presence timers every 20 seconds
  if (chatPresenceRefreshInterval) clearInterval(chatPresenceRefreshInterval);
  chatPresenceRefreshInterval = setInterval(() => {
    renderChatPartnerHeader();
    if (chatContactsDrawer && !chatContactsDrawer.classList.contains("hidden")) {
      renderChatContactsList();
    }
  }, 20000);

function isSameChatMessage(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  if (a.temp_id && (a.temp_id === b.id || a.temp_id === b.temp_id)) return true;
  if (b.temp_id && (b.temp_id === a.id || b.temp_id === a.temp_id)) return true;

  // Semantic matching between optimistic/broadcast message and Postgres CDC row
  const sameSender = a.sender_id === b.sender_id || (a.sender_role === "admin" && b.sender_role === "admin");
  const sameType = (a.media_type || "text") === (b.media_type || "text");
  const sameMessage = (a.message || "").trim() === (b.message || "").trim();

  // Media match (voice note audio or shared file/image)
  const bothAudio = a.media_type === "audio" && b.media_type === "audio";
  const sameMedia = bothAudio || (a.media_url && b.media_url && (a.media_url === b.media_url || a.media_url.slice(0, 100) === b.media_url.slice(0, 100)));

  // Created within 6 seconds of each other
  const timeA = new Date(a.created_at || Date.now()).getTime();
  const timeB = new Date(b.created_at || Date.now()).getTime();
  const timeClose = Math.abs(timeA - timeB) < 6000;

  if (sameSender && sameType && timeClose && (sameMedia || sameMessage)) {
    return true;
  }
  return false;
}

function upsertChatMessage(newMsg) {
  if (!state.chatMessages) state.chatMessages = [];
  const existingIdx = state.chatMessages.findIndex((m) => isSameChatMessage(m, newMsg));
  if (existingIdx !== -1) {
    state.chatMessages[existingIdx] = {
      ...state.chatMessages[existingIdx],
      ...newMsg,
      id: (newMsg.id && !newMsg.id.startsWith("msg-")) ? newMsg.id : state.chatMessages[existingIdx].id,
    };
    return false; // updated existing
  } else {
    state.chatMessages.push(newMsg);
    return true; // newly inserted
  }
}

  // Subscribe to live Realtime Chat channel (Instant WebSocket Broadcast + DB CDC)
  subscribeToChatRealtime(
    (newMsg) => {
      const myId = getMyUserId();

      // Deduplicate/merge message seamlessly
      const isNew = upsertChatMessage(newMsg);

      const isForMe = isMessageAddressedToMe(newMsg, myId);
      const isChatOpen = chatWindow && !chatWindow.classList.contains("hidden");
      const partner = state.activeChatPartner;
      const isCurrentPartner = partner && (
        newMsg.sender_id === partner.id ||
        (partner.role === "admin" && newMsg.sender_role === "admin") ||
        (newMsg.sender_id === myId && newMsg.recipient_id === partner.id)
      );

      if (isChatOpen && isCurrentPartner) {
        renderChatMessages();
        if (isForMe) {
          markCurrentChatAsSeen();
        }
      } else {
        if (isForMe && isNew) {
          // Instant sound alert only on newly arrived messages (not on duplicate updates)
          playNotificationChime();
          // Instant toast notification preview
          showIncomingChatToast(newMsg);
          // Instant unread badge on floating chatbot icon
          updateChatUnreadDot();
          if (chatContactsDrawer && !chatContactsDrawer.classList.contains("hidden")) {
            renderChatContactsList();
          }
        }
      }
    },
    (updateData) => {
      if (updateData?.viewerId) {
        // Broadcast read receipt
        const { viewerId, partnerId, read_at } = updateData;
        let modified = false;
        state.chatMessages.forEach((m) => {
          if (
            (m.recipient_id === viewerId || (viewerId === ADMIN_CONTACT.id && m.recipient_role === "admin")) &&
            (!partnerId || m.sender_id === partnerId)
          ) {
            m.read = true;
            m.read_at = read_at || new Date().toISOString();
            modified = true;
          }
        });
        if (modified) {
          renderChatMessages();
          updateChatUnreadDot();
        }
      } else if (updateData?.id) {
        // Single message updated
        const idx = state.chatMessages.findIndex((m) => m.id === updateData.id);
        if (idx !== -1) {
          state.chatMessages[idx] = { ...state.chatMessages[idx], ...updateData };
          renderChatMessages();
          updateChatUnreadDot();
        }
      }
    }
  );
}

function renderChatPartnerHeader() {
  const myAvatar = state.isAdmin && state.activeView === "admin" ? TEACHER_AVATAR : (state.profile?.avatar_url || AVATAR_PRESETS[0]);
  if (chatUserAvatar) chatUserAvatar.src = myAvatar;

  const partner = state.activeChatPartner;
  if (!partner) {
    if (chatPartnerName) chatPartnerName.textContent = "Select a Chat Partner";
    if (chatPartnerAvatar) chatPartnerAvatar.src = AVATAR_PRESETS[0];
    if (chatPartnerStatus) {
      chatPartnerStatus.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-indigo-300"></span> Click Contacts to choose classmate or teacher`;
    }
    return;
  }

  const isPartnerAdmin = partner.role === "admin" || partner.id === ADMIN_CONTACT.id;
  if (chatPartnerName) {
    chatPartnerName.textContent = isPartnerAdmin
      ? "Master Debrah (Admin & Teacher)"
      : `${partner.full_name} (${partner.class_level || 'Basic 9'})`;
  }
  if (chatPartnerAvatar) {
    chatPartnerAvatar.src = isPartnerAdmin ? TEACHER_AVATAR : (partner.avatar_url || AVATAR_PRESETS[0]);
  }
  if (chatPartnerStatus) {
    const livePartner = isPartnerAdmin
      ? ((state.allLearners || []).find((l) => l.id === ADMIN_CONTACT.id || (l.role || "").toLowerCase() === "admin" || (l.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) || ADMIN_CONTACT)
      : ((state.allLearners || []).find((l) => l.id === partner.id) || partner);

    const isOnline = isLearnerOnline(livePartner);
    if (isOnline) {
      chatPartnerStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> <span class="text-emerald-200 font-bold">Online</span> • ${isPartnerAdmin ? "Head of Computing" : (livePartner.class_level || "Basic 9")}`;
    } else {
      const timeAgo = livePartner.last_seen ? formatTimeAgo(livePartner.last_seen) : "offline";
      chatPartnerStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-300 opacity-60"></span> <span class="text-indigo-200">Offline (${timeAgo})</span> • ${isPartnerAdmin ? "Head of Computing" : (livePartner.class_level || "Basic 9")}`;
    }
  }
}

function updateChatLauncherButton() {
  const isChatOpen = chatWindow && !chatWindow.classList.contains("hidden");
  const icon = openChatBtn?.querySelector("i");
  if (!icon || !openChatBtn) return;

  if (isChatOpen) {
    openChatBtn.classList.add("chat-open");
    openChatBtn.setAttribute("title", "Close Chat (Esc)");
    openChatBtn.setAttribute("aria-label", "Close Chat");
    icon.className = "fa-solid fa-xmark text-xl";
    openChatBtn.classList.remove("ring-indigo-100", "bg-indigo-600", "hover:bg-indigo-700");
    openChatBtn.classList.add("ring-slate-300", "bg-slate-800", "hover:bg-slate-900");
  } else {
    openChatBtn.classList.remove("chat-open");
    openChatBtn.setAttribute("title", "Chat with Teacher / Admin");
    openChatBtn.setAttribute("aria-label", "Chat with Teacher / Admin");
    icon.className = "fa-solid fa-comments text-lg sm:text-xl";
    openChatBtn.classList.remove("ring-slate-300", "bg-slate-800", "hover:bg-slate-900");
    openChatBtn.classList.add("ring-indigo-100", "bg-indigo-600", "hover:bg-indigo-700");
  }
  updateChatUnreadDot();
}

function toggleChatWindow(forceShow) {
  if (!chatWindow) return;
  const shouldOpen = forceShow !== undefined ? forceShow : chatWindow.classList.contains("hidden");
  if (shouldOpen) {
    chatWindow.classList.remove("hidden");
    markCurrentChatAsSeen();
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    chatMessageInput?.focus();
  } else {
    chatWindow.classList.add("hidden");
    if (chatContactsDrawer) chatContactsDrawer.classList.add("hidden");
  }
  updateChatLauncherButton();
}

function openChatWithUser(student) {
  state.activeChatPartner = student;
  renderChatPartnerHeader();
  if (chatContactsDrawer) chatContactsDrawer.classList.add("hidden");
  toggleChatWindow(true);
  chatMessageInput?.focus();
  markCurrentChatAsSeen();
  renderChatMessages();
}

window.openChatWithUser = openChatWithUser;
window.toggleChatWindow = toggleChatWindow;
window.updateChatLauncherButton = updateChatLauncherButton;
window.playNotificationChime = playNotificationChime;
window.showIncomingChatToast = showIncomingChatToast;
window.updateChatUnreadDot = updateChatUnreadDot;
window.generateVoiceNoteWavDataUrl = generateVoiceNoteWavDataUrl;
window.generateChimeWavDataUrl = generateChimeWavDataUrl;
window.getUnlockedAudioContext = getUnlockedAudioContext;
window.state = state;

async function markCurrentChatAsSeen() {
  const myId = getMyUserId();
  const partner = state.activeChatPartner;
  const partnerId = partner?.id || null;
  const viewerRole = state.isAdmin && state.activeView === "admin" ? "admin" : "learner";

  await markChatMessagesAsRead(myId, partnerId, viewerRole);

  let changed = false;
  state.chatMessages.forEach((m) => {
    const matchesPartner = partnerId
      ? m.sender_id === partnerId || (m.sender_role === "admin" && partnerId === ADMIN_CONTACT.id)
      : true;
    if (matchesPartner && !m.read) {
      m.read = true;
      m.read_at = new Date().toISOString();
      changed = true;
    }
  });
  if (changed) {
    renderChatMessages();
    updateChatUnreadDot();
  }
}

function bindChatMediaTriggers() {
  if (!chatMessagesContainer) return;

  chatMessagesContainer.querySelectorAll(".audio-play-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const container = btn.closest(".chat-voice-card") || btn.closest("div");
      const audio = container?.querySelector(".chat-audio-element");
      if (!audio) return;

      const icon = btn.querySelector("i");

      // Auto-recover if audio src is a broken or expired blob: URL from another session
      if (!audio.src || audio.src.startsWith("blob:") || audio.src.includes("freesound.org")) {
        audio.src = generateVoiceNoteWavDataUrl(3);
      }

      if (audio.paused) {
        if (activePlayingAudio && activePlayingAudio !== audio) {
          activePlayingAudio.pause();
          activePlayingAudio.currentTime = 0;
          document.querySelectorAll(".audio-play-toggle-btn i").forEach((ic) => {
            ic.className = "fa-solid fa-play text-xs ml-0.5";
          });
          document.querySelectorAll(".chat-voice-card").forEach((card) => {
            card.classList.remove("audio-playing");
          });
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              activePlayingAudio = audio;
              if (icon) icon.className = "fa-solid fa-pause text-xs";
              container?.classList.add("audio-playing");
            })
            .catch((err) => {
              console.warn("Audio playback err, falling back to clean wave audio:", err);
              audio.src = generateVoiceNoteWavDataUrl(3);
              audio.play().then(() => {
                activePlayingAudio = audio;
                if (icon) icon.className = "fa-solid fa-pause text-xs";
                container?.classList.add("audio-playing");
              }).catch((e2) => console.warn("Fallback play error:", e2));
            });
        }
      } else {
        audio.pause();
        if (icon) icon.className = "fa-solid fa-play text-xs ml-0.5";
        container?.classList.remove("audio-playing");
      }

      audio.onended = () => {
        if (icon) icon.className = "fa-solid fa-play text-xs ml-0.5";
        container?.classList.remove("audio-playing");
      };
      audio.onpause = () => {
        if (icon) icon.className = "fa-solid fa-play text-xs ml-0.5";
        container?.classList.remove("audio-playing");
      };
    });
  });

  chatMessagesContainer.querySelectorAll(".chat-lightbox-trigger").forEach((imgEl) => {
    imgEl.addEventListener("click", () => {
      const url = imgEl.getAttribute("data-img-url");
      const caption = imgEl.getAttribute("data-img-caption");
      openMediaLightbox(url, caption);
    });
  });
}

function renderChatMessages() {
  if (!chatMessagesContainer) return;

  const myId = getMyUserId();
  const partner = state.activeChatPartner;
  const currentName = state.profile?.full_name || (state.isAdmin && state.activeView === "admin" ? "Master Debrah" : "Kwame Mensah");
  const myAvatar = state.isAdmin && state.activeView === "admin" ? TEACHER_AVATAR : (state.profile?.avatar_url || AVATAR_PRESETS[0]);

  if (!partner) {
    chatMessagesContainer.innerHTML = `
      <div class="py-14 text-center text-slate-400">
        <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 text-xl shadow-xs">
          <i class="fa-solid fa-address-book"></i>
        </div>
        <p class="font-bold text-slate-800 text-sm">No Conversation Selected</p>
        <p class="text-xs text-slate-400 mt-1 max-w-xs mx-auto mb-3">
          Click the Contacts button above to pick a classmate or academic staff to start chatting.
        </p>
        <button
          type="button"
          onclick="window.toggleChatContactsDrawer && window.toggleChatContactsDrawer(true)"
          class="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition cursor-pointer"
        >
          <i class="fa-solid fa-users mr-1"></i> Browse Contacts
        </button>
      </div>
    `;
    return;
  }

  const isPartnerAdmin = partner.role === "admin" || partner.id === ADMIN_CONTACT.id;
  const defaultPartnerAvatar = isPartnerAdmin ? TEACHER_AVATAR : (partner.avatar_url || AVATAR_PRESETS[0]);

  const isCurrentUserAdmin = state.isAdmin || (state.user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

  // Scoped message filter for this 1-on-1 thread
  const threadMessages = state.chatMessages.filter((msg) => {
    if (isCurrentUserAdmin) {
      if (isPartnerAdmin) return false;
      return (
        (msg.sender_id === partner.id && (msg.recipient_id === myId || msg.recipient_id === ADMIN_CONTACT.id || msg.recipient_role === "admin" || !msg.recipient_id)) ||
        ((msg.sender_id === myId || msg.sender_role === "admin") && (msg.recipient_id === partner.id || !msg.recipient_id))
      );
    } else {
      if (isPartnerAdmin) {
        return (
          (msg.sender_id === myId && (msg.recipient_id === ADMIN_CONTACT.id || msg.recipient_role === "admin" || !msg.recipient_id)) ||
          ((msg.sender_role === "admin" || msg.sender_id === ADMIN_CONTACT.id) && (msg.recipient_id === myId || !msg.recipient_id))
        );
      } else {
        return (
          (msg.sender_id === myId && msg.recipient_id === partner.id) ||
          (msg.sender_id === partner.id && msg.recipient_id === myId)
        );
      }
    }
  });

  if (threadMessages.length === 0) {
    chatMessagesContainer.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 text-xl shadow-xs">
          <i class="fa-solid fa-comments"></i>
        </div>
        <p class="font-bold text-slate-800 text-sm">Start conversation with ${escapeHtml(partner.full_name)}</p>
        <p class="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          ${isPartnerAdmin ? 'Ask questions about Computing CATs, algorithm tasks, or homework guidance.' : 'Chat with your classmate about assessment tasks, study notes, or questions.'}
        </p>
      </div>
    `;
    return;
  }

  const messageCardsHtml = threadMessages.map((msg) => {
    const isMe = msg.sender_id === myId || (state.isAdmin ? msg.sender_role === "admin" : (msg.sender_role === "learner" && msg.sender_name.includes(currentName)));
    const senderAvatar = isMe ? myAvatar : (msg.sender_role === "admin" ? TEACHER_AVATAR : (partner.avatar_url || defaultPartnerAvatar));

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
      const safeAudioSrc = (msg.media_url && !msg.media_url.startsWith('blob:') && !msg.media_url.includes('freesound.org'))
        ? msg.media_url
        : generateVoiceNoteWavDataUrl(3);
      mediaContent = `
        <div class="chat-voice-card mt-2 p-2 rounded-xl ${isMe ? 'bg-indigo-700/60 border border-indigo-400/30' : 'bg-slate-100 border border-slate-200'} flex items-center gap-2.5">
          <button type="button" class="audio-play-toggle-btn w-8 h-8 rounded-full ${isMe ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'} flex items-center justify-center shrink-0 shadow-xs hover:scale-105 transition cursor-pointer" title="Play / Pause Audio">
            <i class="fa-solid fa-play text-xs ml-0.5"></i>
          </button>
          <audio src="${safeAudioSrc}" preload="auto" class="chat-audio-element hidden"></audio>
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
              <span class="font-mono font-bold">${msg.audio_duration || '0:03'}</span>
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
              <span class="font-bold text-[10px] text-indigo-200">You (${state.isAdmin && state.activeView === "admin" ? 'Admin' : 'Student'})</span>
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
  const lastMsg = threadMessages[threadMessages.length - 1];
  const partnerName = partner.full_name || "Partner";
  let threadSeenFooter = "";
  if (lastMsg && (lastMsg.sender_id === myId || (state.isAdmin ? lastMsg.sender_role === "admin" : (lastMsg.sender_role === "learner" && lastMsg.sender_name.includes(currentName))))) {
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

  // Re-bind media click triggers
  bindChatMediaTriggers();
}

function openMediaLightbox(url, caption) {
  if (!mediaLightboxModal) return;
  if (lightboxImg && url) lightboxImg.src = url;
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

let isSendingAudio = false;

async function sendAudioRecording() {
  if (isSendingAudio || !isRecordingAudio) return;
  isSendingAudio = true;
  if (sendRecordBtn) {
    sendRecordBtn.setAttribute("disabled", "true");
    sendRecordBtn.classList.add("opacity-50", "pointer-events-none");
  }

  try {
    if (recordingInterval) clearInterval(recordingInterval);
    const durationSec = recordingSeconds > 0 ? recordingSeconds : 3;
    const durationStr = formatRecordingTime(durationSec);

    // Default to synthesized clean voice note data URI (100% portable & self-contained)
    let finalAudioUrl = generateVoiceNoteWavDataUrl(durationSec);

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      try {
        mediaRecorder.stop();
        await new Promise((resolve) => {
          mediaRecorder.onstop = () => {
            if (audioChunks.length > 0) {
              const blob = new Blob(audioChunks, { type: "audio/webm" });
              const reader = new FileReader();
              reader.onloadend = () => {
                if (reader.result && typeof reader.result === "string" && reader.result.startsWith("data:")) {
                  finalAudioUrl = reader.result;
                }
                resolve();
              };
              reader.onerror = () => {
                resolve();
              };
              reader.readAsDataURL(blob);
            } else {
              resolve();
            }
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

    const myId = getMyUserId();
    const partner = state.activeChatPartner;
    const partnerId = partner?.id || null;
    const isPartnerAdmin = partner?.role === "admin" || partner?.id === ADMIN_CONTACT.id;

    const senderRole = state.isAdmin && state.activeView === "admin" ? "admin" : "learner";
    const senderName = state.isAdmin && state.activeView === "admin"
      ? `${state.profile?.full_name || "Master Debrah"} (Admin)`
      : `${state.profile?.full_name || "Student Learner"}`;

    const payload = {
      sender_id: myId,
      recipient_id: partnerId,
      sender_name: senderName,
      sender_role: senderRole,
      message: `Voice Note (${durationStr})`,
      media_type: "audio",
      media_url: finalAudioUrl,
      media_name: `Voice_Note_${Date.now()}.mp3`,
      audio_duration: durationStr,
      read: false,
    };

    const newMsg = await sendChatMessage(payload);
    upsertChatMessage(newMsg);
    renderChatMessages();
  } finally {
    isSendingAudio = false;
    if (sendRecordBtn) {
      sendRecordBtn.removeAttribute("disabled");
      sendRecordBtn.classList.remove("opacity-50", "pointer-events-none");
    }
  }
}

async function handleChatInputSubmit(e) {
  e.preventDefault();
  const text = chatMessageInput?.value.trim();
  const hasAttachment = Boolean(currentAttachment);

  if (!text && !hasAttachment) return;

  const myId = getMyUserId();
  const partner = state.activeChatPartner;
  const partnerId = partner?.id || null;
  const isPartnerAdmin = partner?.role === "admin" || partner?.id === ADMIN_CONTACT.id;

  const senderRole = state.isAdmin && state.activeView === "admin" ? "admin" : "learner";
  const senderName = state.isAdmin && state.activeView === "admin"
    ? `${state.profile?.full_name || "Master Debrah"} (Admin)`
    : `${state.profile?.full_name || "Student Learner"}`;

  chatMessageInput.value = "";

  const payload = {
    sender_id: myId,
    recipient_id: partnerId,
    sender_name: senderName,
    sender_role: senderRole,
    message: text || (currentAttachment ? `Shared ${currentAttachment.name}` : ""),
    media_type: currentAttachment ? currentAttachment.type : "text",
    media_url: currentAttachment ? currentAttachment.dataUrl : null,
    media_name: currentAttachment ? currentAttachment.name : null,
    media_size: currentAttachment ? currentAttachment.size : null,
    read: false,
  };

  clearAttachment();

  const newMsg = await sendChatMessage(payload);
  upsertChatMessage(newMsg);
  renderChatMessages();
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
  openChatBtn?.addEventListener("click", () => toggleChatWindow());
  closeChatBtn?.addEventListener("click", () => toggleChatWindow(false));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && chatWindow && !chatWindow.classList.contains("hidden")) {
      toggleChatWindow(false);
    }
  });
  chatSwitchContactBtn?.addEventListener("click", () => toggleChatContactsDrawer());
  chatCloseContactsBtn?.addEventListener("click", () => toggleChatContactsDrawer(false));
  chatContactSearchInput?.addEventListener("input", () => renderChatContactsList());
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

  // Admin Real Data: Enrollment & Marks Recording Modals
  adminEnrollStudentBtn?.addEventListener("click", openEnrollStudentModal);
  closeEnrollModalBtn?.addEventListener("click", () => enrollStudentModal?.classList.add("hidden"));
  cancelEnrollBtn?.addEventListener("click", () => enrollStudentModal?.classList.add("hidden"));
  enrollStudentForm?.addEventListener("submit", handleEnrollStudentSubmit);
  quickSeedRosterBtn?.addEventListener("click", handleQuickSeedRoster);

  // Admin Real Data: Edit User Modal & Handlers
  closeEditLearnerModalBtn?.addEventListener("click", () => editLearnerModal?.classList.add("hidden"));
  cancelEditLearnerBtn?.addEventListener("click", () => editLearnerModal?.classList.add("hidden"));
  editLearnerForm?.addEventListener("submit", handleEditLearnerSubmit);
  adminDeleteUserFromModalBtn?.addEventListener("click", () => {
    const userId = editLearnerId?.value;
    const name = editLearnerFullName?.value || "this user";
    if (userId) handleDeleteLearner(userId, name);
  });

  // Admin Real Data: Active Learners Online Modal & KPI Card
  document.getElementById("kpiCardOnline")?.addEventListener("click", openActiveLearnersModal);
  document.getElementById("kpiOnlineActionBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    openActiveLearnersModal();
  });
  document.getElementById("closeActiveLearnersModalBtn")?.addEventListener("click", closeActiveLearnersModal);
  document.getElementById("closeActiveLearnersModalBtn2")?.addEventListener("click", closeActiveLearnersModal);
  document.getElementById("activeLearnersModal")?.addEventListener("click", (e) => {
    if (e.target === document.getElementById("activeLearnersModal")) closeActiveLearnersModal();
  });
  document.getElementById("backToActiveListBtn")?.addEventListener("click", () => {
    const detailView = activeLearnerDetailView || document.getElementById("activeLearnerDetailView");
    const listView = activeLearnersListView || document.getElementById("activeLearnersListView");
    if (detailView) {
      detailView.style.display = "none";
      detailView.classList.add("hidden");
    }
    if (listView) {
      listView.style.display = "block";
      listView.classList.remove("hidden");
    }
    renderActiveLearnersList();
  });
  document.getElementById("activeLearnersSearchInput")?.addEventListener("input", renderActiveLearnersList);
  document.getElementById("activeLearnersClassFilter")?.addEventListener("change", renderActiveLearnersList);

  adminRecordMarksBtn?.addEventListener("click", () => openRecordScoreModal());
  closeRecordScoreModalBtn?.addEventListener("click", () => recordScoreModal?.classList.add("hidden"));
  cancelRecordScoreBtn?.addEventListener("click", () => recordScoreModal?.classList.add("hidden"));
  recordScoreForm?.addEventListener("submit", handleRecordScoreSubmit);
}

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
  updateChatMessage,
  deleteChatMessage,
  toggleMessageReaction,
  markChatMessagesAsRead,
  isUserAdmin,
  PRIMARY_ADMIN_EMAIL,
  ADMIN_EMAILS,
  generateStudentId,
  getNextStudentSequence,
  calculateAge,
  isBirthdayToday,
  clearAllMockData,
  purgeAllTestDataFromDatabase,
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
  broadcastCallSignal,
  subscribeToLearnersRealtime,
  GOOGLE_DRIVE_TARGET_EMAIL,
  GOOGLE_DRIVE_TARGET_FOLDER,
  saveCallRecording,
  fetchCallRecordings,
  syncCallRecordingToGoogleDrive,
  storeRecordingBlobInVault,
  getRecordingBlobFromVault,
  testGoogleDriveWebhook,
  syncAllPendingVaultRecordings,
  getGoogleDriveWebhookUrl,
  deleteRecordingBlobFromVault,
  deleteCallRecording,
  grantSubmissionRetake,
  dispatchEmailNotification,
  triggerWebPushNotification,
  getDispatchedEmails,
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
  isIdentityOrRegistrationQuestion,
  filterValidCurriculumQuestions,
} from "./questionsData.js";

import { QueryClient, MutationObserver, QueryObserver } from "@tanstack/query-core";

import {
  generateLearnerAIPotentials,
  evaluateNextTestOutcome,
  getActiveTarget,
  renderAIPotentialCardHTML,
  renderAssuranceCardHTML,
} from "./aiPedagogicalEngine";

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
  questionSittingFilter: "",
  questionSearchQuery: "",
  questionsCollapsedAll: false,
  collapsedQuestionKeys: new Set<string>(),
  allLearners: [],
  learnerSearchQuery: "",
  adminLearnersCurrentPage: 1,
  adminLearnersCustomPageSize: null as number | null,
  notifications: [],
  readNotificationIds: new Set(JSON.parse(localStorage.getItem("jhs_read_notifications") || "[]")),
  notificationFilter: "all", // 'all' | 'unread'
  expandedNotifIds: new Set<string>(),
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
const authLoaderSection = document.getElementById("authLoaderSection");
const authLoaderSigningIn = document.getElementById("authLoaderSigningIn");
const authLoaderSuccess = document.getElementById("authLoaderSuccess");
const authLoaderTitle = document.getElementById("authLoaderTitle");
const authLoaderSubtitle = document.getElementById("authLoaderSubtitle");
const authLoaderSuccessTitle = document.getElementById("authLoaderSuccessTitle");
const authLoaderSuccessSubtitle = document.getElementById("authLoaderSuccessSubtitle");
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
const notifTabAll = document.getElementById("notifTabAll");
const notifTabUnread = document.getElementById("notifTabUnread");
const notifCountAll = document.getElementById("notifCountAll");
const notifCountUnread = document.getElementById("notifCountUnread");

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
const adminLiveUsersBadge = document.getElementById("adminLiveUsersBadge");
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
const adminLearnerSearchInput = document.getElementById("adminLearnerSearchInput") as HTMLInputElement | null;
const adminLearnersTableBody = document.getElementById("adminLearnersTableBody");
const adminLearnersCardsMobile = document.getElementById("adminLearnersCardsMobile");
const adminSwitchLearnerBtn = document.getElementById("adminSwitchLearnerBtn");
const adminNewBroadcastBtn = document.getElementById("adminNewBroadcastBtn");
const adminManageAssessmentsBtn = document.getElementById("adminManageAssessmentsBtn");
const adminAddNewAsmtBtn2 = document.getElementById("adminAddNewAsmtBtn2");
const adminExportExcelBtn = document.getElementById("adminExportExcelBtn");
const adminExportExcelBtnText = document.getElementById("adminExportExcelBtnText");
const adminTopExportExcelBtn = document.getElementById("adminTopExportExcelBtn");
const adminEnrollStudentBtn = document.getElementById("adminEnrollStudentBtn");
const adminRecordMarksBtn = document.getElementById("adminRecordMarksBtn");
const adminPurgeTestDataBtn = document.getElementById("adminPurgeTestDataBtn");

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
const quizPrevBtn = document.getElementById("quizPrevBtn");
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
const newAsmtTitle = document.getElementById("newAsmtTitle") as HTMLInputElement | null;
const newAsmtSubject = document.getElementById("newAsmtSubject") as HTMLSelectElement | null;
const newAsmtClass = document.getElementById("newAsmtClass") as HTMLSelectElement | null;
const newAsmtType = document.getElementById("newAsmtType") as HTMLSelectElement | null;
const newAsmtWeight = document.getElementById("newAsmtWeight") as HTMLInputElement | null;
const newAsmtDuration = document.getElementById("newAsmtDuration") as HTMLInputElement | null;
const newAsmtStatus = document.getElementById("newAsmtStatus") as HTMLSelectElement | null;
const newAsmtUnlockTime = document.getElementById("newAsmtUnlockTime") as HTMLInputElement | null;
const newAsmtDeadline = document.getElementById("newAsmtDeadline") as HTMLInputElement | null;

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
const questionTrackFilter = document.getElementById("questionTrackFilter") as HTMLSelectElement | null;
const adminQuestionSittingsContainer = document.getElementById("adminQuestionSittingsContainer");
const questionSittingsTabsRail = document.getElementById("questionSittingsTabsRail");
const questionActiveSittingLabel = document.getElementById("questionActiveSittingLabel");
const questionSittingSelect = document.getElementById("questionSittingSelect") as HTMLSelectElement | null;
const questionSearchInput = document.getElementById("questionSearchInput") as HTMLInputElement | null;
const toggleExpandAllQuestionsBtn = document.getElementById("toggleExpandAllQuestionsBtn");
const toggleExpandAllQuestionsBtnText = document.getElementById("toggleExpandAllQuestionsBtnText");
const catCountAll = document.getElementById("catCountAll");
const catCountCAT = document.getElementById("catCountCAT");
const catCountQuiz = document.getElementById("catCountQuiz");
const catCountProject = document.getElementById("catCountProject");
const catCountExam = document.getElementById("catCountExam");

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
const extendModalAsmtId = document.getElementById("extendModalAsmtId") as HTMLInputElement | null;
const extendModalAsmtTitle = document.getElementById("extendModalAsmtTitle");
const extendModalCurrentDeadline = document.getElementById("extendModalCurrentDeadline");
const extendDurationInput = document.getElementById("extendDurationInput") as HTMLInputElement | null;
const extendUnlockDatetimeInput = document.getElementById("extendUnlockDatetimeInput") as HTMLInputElement | null;
const extendCustomDatetimeInput = document.getElementById("extendCustomDatetimeInput") as HTMLInputElement | null;
const closeExtendPeriodBtn = document.getElementById("closeExtendPeriodBtn");
const cancelExtendPeriodBtn = document.getElementById("cancelExtendPeriodBtn");
const saveExtendPeriodBtn = document.getElementById("saveExtendPeriodBtn") as HTMLButtonElement | null;

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
const chatContactSearchInput = document.getElementById("chatContactSearchInput") as HTMLInputElement | null;
const chatContactsListContainer = document.getElementById("chatContactsListContainer");

const chatReplyBar = document.getElementById("chatReplyBar");
const chatReplySender = document.getElementById("chatReplySender");
const chatReplySnippet = document.getElementById("chatReplySnippet");
const chatCancelReplyBtn = document.getElementById("chatCancelReplyBtn");
const chatEditBar = document.getElementById("chatEditBar");
const chatEditSnippet = document.getElementById("chatEditSnippet");
const chatCancelEditBtn = document.getElementById("chatCancelEditBtn");

// Lightbox Modal Elements
const mediaLightboxModal = document.getElementById("mediaLightboxModal");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxVideo = document.getElementById("lightboxVideo") as HTMLVideoElement | null;
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxDownloadBtn = document.getElementById("lightboxDownloadBtn");
const closeLightboxBtn = document.getElementById("closeLightboxBtn");

// WhatsApp Chat Reply & Edit State
let activeReplyingTo: any = null;
let activeEditingMessage: any = null;

// Realtime 1-on-1 Voice & Video Call Elements
const chatStartVoiceCallBtn = document.getElementById("chatStartVoiceCallBtn");
const chatStartVideoCallBtn = document.getElementById("chatStartVideoCallBtn");
const videoCallModal = document.getElementById("videoCallModal");
const callRemoteAvatar = document.getElementById("callRemoteAvatar") as HTMLImageElement | null;
const callRemoteName = document.getElementById("callRemoteName");
const callRemoteRoleBadge = document.getElementById("callRemoteRoleBadge");
const callTypeBadge = document.getElementById("callTypeBadge");
const callTypeBadgeIcon = document.getElementById("callTypeBadgeIcon");
const callTypeBadgeText = document.getElementById("callTypeBadgeText");
const callStatusIndicator = document.getElementById("callStatusIndicator");
const callStatusText = document.getElementById("callStatusText");
const callDurationTimer = document.getElementById("callDurationTimer");
const callToggleModeBtn = document.getElementById("callToggleModeBtn");
const callToggleModeText = document.getElementById("callToggleModeText");
const callMinimizeBtn = document.getElementById("callMinimizeBtn");

// Voice Call Stage Elements
const callVoiceStage = document.getElementById("callVoiceStage");
const callVoiceAvatar = document.getElementById("callVoiceAvatar") as HTMLImageElement | null;
const callVoicePartnerName = document.getElementById("callVoicePartnerName");
const callVoiceSubtitle = document.getElementById("callVoiceSubtitle");

// Video Call Stage Elements
const callVideoStage = document.getElementById("callVideoStage");
const callRemoteVideo = document.getElementById("callRemoteVideo") as HTMLVideoElement | null;
const callRemoteCameraOffPlaceholder = document.getElementById("callRemoteCameraOffPlaceholder");
const callRemoteCameraOffAvatar = document.getElementById("callRemoteCameraOffAvatar") as HTMLImageElement | null;
const callRemoteCameraOffName = document.getElementById("callRemoteCameraOffName");

const callScreenShareBanner = document.getElementById("callScreenShareBanner");
const callStopShareTopBtn = document.getElementById("callStopShareTopBtn");
const callWaitingOverlay = document.getElementById("callWaitingOverlay");
const callWaitingAvatar = document.getElementById("callWaitingAvatar") as HTMLImageElement | null;
const callWaitingName = document.getElementById("callWaitingName");
const callWaitingStatusText = document.getElementById("callWaitingStatusText");

const localVideoContainer = document.getElementById("localVideoContainer");
const callLocalVideo = document.getElementById("callLocalVideo") as HTMLVideoElement | null;
const callLocalCameraOffOverlay = document.getElementById("callLocalCameraOffOverlay");
const callLocalMutedBadge = document.getElementById("callLocalMutedBadge");
const callToggleMirrorBtn = document.getElementById("callToggleMirrorBtn");

const callToggleMicBtn = document.getElementById("callToggleMicBtn");
const callToggleCameraBtn = document.getElementById("callToggleCameraBtn");
const callShareScreenBtn = document.getElementById("callShareScreenBtn");
const callEndBtn = document.getElementById("callEndBtn");

// Video Upgrade Notice & Modal Elements
const callVideoUpgradeNotice = document.getElementById("callVideoUpgradeNotice");
const callVideoUpgradeNoticeText = document.getElementById("callVideoUpgradeNoticeText");
const cancelVideoUpgradeRequestBtn = document.getElementById("cancelVideoUpgradeRequestBtn");

const videoUpgradeRequestModal = document.getElementById("videoUpgradeRequestModal");
const videoUpgradeRequesterAvatar = document.getElementById("videoUpgradeRequesterAvatar") as HTMLImageElement | null;
const videoUpgradeRequesterName = document.getElementById("videoUpgradeRequesterName");
const acceptVideoWithCameraBtn = document.getElementById("acceptVideoWithCameraBtn");
const acceptVideoCameraOffBtn = document.getElementById("acceptVideoCameraOffBtn");
const declineVideoUpgradeBtn = document.getElementById("declineVideoUpgradeBtn");

// In-Call Live Reactions & Raised Hand Elements
const callReactionsContainer = document.getElementById("callReactionsContainer");
const callRaisedHandBanner = document.getElementById("callRaisedHandBanner");
const callRaisedHandText = document.getElementById("callRaisedHandText");
const callLowerHandBtn = document.getElementById("callLowerHandBtn");
const callReactionBtn = document.getElementById("callReactionBtn");
const callReactionPicker = document.getElementById("callReactionPicker");

const incomingCallModal = document.getElementById("incomingCallModal");
const incomingCallerAvatar = document.getElementById("incomingCallerAvatar") as HTMLImageElement | null;
const incomingCallerName = document.getElementById("incomingCallerName");
const incomingCallTypeLabel = document.getElementById("incomingCallTypeLabel");
const incomingCallTypeIcon = document.getElementById("incomingCallTypeIcon");
const incomingCallTypeText = document.getElementById("incomingCallTypeText");
const declineIncomingCallBtn = document.getElementById("declineIncomingCallBtn");
const acceptIncomingCallBtn = document.getElementById("acceptIncomingCallBtn");
const acceptIncomingCallIcon = document.getElementById("acceptIncomingCallIcon");
const acceptIncomingCallText = document.getElementById("acceptIncomingCallText");

// WebRTC STUN Server Configuration
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

interface ActiveCallState {
  callId: string | null;
  partner: any | null;
  callType: "voice" | "video";
  pc: RTCPeerConnection | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenStream: MediaStream | null;
  isCaller: boolean;
  status: "idle" | "calling" | "incoming" | "connected" | "ended";
  isMuted: boolean;
  isCameraOff: boolean;
  isRemoteCameraOff: boolean;
  isScreenSharing: boolean;
  pendingVideoUpgradeRequest: any | null;
  timerId: any | null;
  inviteHeartbeatTimer: any | null;
  secondsElapsed: number;
  stopRingTone: (() => void) | null;
  pendingSignal: any | null;
  recorder: MediaRecorder | null;
  recordedChunks: Blob[];
  recordingStartedAt: number | null;
  isConference: boolean;
  conferenceTitle: string;
  isGridView: boolean;
  conferenceParticipants: Array<{
    id: string;
    name: string;
    avatar: string;
    role: string;
    classLevel?: string;
    isMuted: boolean;
    isCameraOff: boolean;
    isSpeaking?: boolean;
    stream?: MediaStream | null;
  }>;
}

const activeCall: ActiveCallState = {
  callId: null,
  partner: null,
  callType: "voice",
  pc: null,
  localStream: null,
  remoteStream: null,
  screenStream: null,
  isCaller: false,
  status: "idle",
  isMuted: false,
  isCameraOff: false,
  isRemoteCameraOff: false,
  isScreenSharing: false,
  pendingVideoUpgradeRequest: null,
  timerId: null,
  inviteHeartbeatTimer: null,
  secondsElapsed: 0,
  stopRingTone: null,
  pendingSignal: null,
  recorder: null,
  recordedChunks: [],
  recordingStartedAt: null,
  isConference: false,
  conferenceTitle: "Basic 9 Computing Group Conference",
  isGridView: true,
  conferenceParticipants: [],
};

// Conference Calling Elements
const chatStartConferenceCallBtn = document.getElementById("chatStartConferenceCallBtn");
const callConferenceBadge = document.getElementById("callConferenceBadge");
const callParticipantCountText = document.getElementById("callParticipantCountText");
const callTopAddParticipantBtn = document.getElementById("callTopAddParticipantBtn");
const callAddParticipantBtn = document.getElementById("callAddParticipantBtn");
const callToggleGridBtn = document.getElementById("callToggleGridBtn");
const callConferenceStage = document.getElementById("callConferenceStage");
const callConferenceGrid = document.getElementById("callConferenceGrid");
const conferenceRoomTitleDisplay = document.getElementById("conferenceRoomTitleDisplay");
const conferenceActiveCountDisplay = document.getElementById("conferenceActiveCountDisplay");
const callConferenceDrawer = document.getElementById("callConferenceDrawer");
const callCloseConferenceDrawerBtn = document.getElementById("callCloseConferenceDrawerBtn");
const callConferenceRoomCode = document.getElementById("callConferenceRoomCode");
const callCopyLinkBtn = document.getElementById("callCopyLinkBtn");
const callCopyLinkBtnText = document.getElementById("callCopyLinkBtnText");
const callConferenceSearchInput = document.getElementById("callConferenceSearchInput") as HTMLInputElement | null;
const callConferenceContactsList = document.getElementById("callConferenceContactsList");

// Call Recording & Google Drive Cloud Backup Elements (Completely invisible in UI during calls)
const callRecordingSavedToast = document.getElementById("callRecordingSavedToast");
const callRecordingSavedToastText = document.getElementById("callRecordingSavedToastText");
const closeRecordingSavedToastBtn = document.getElementById("closeRecordingSavedToastBtn");

// Call Recording Player Modal Elements
const callRecordingPlayerModal = document.getElementById("callRecordingPlayerModal");
const closeRecordingPlayerBtn = document.getElementById("closeRecordingPlayerBtn");
const playerVideoEl = document.getElementById("playerVideoEl") as HTMLVideoElement | null;
const playerAudioEl = document.getElementById("playerAudioEl") as HTMLAudioElement | null;
const playerAudioStage = document.getElementById("playerAudioStage");
const playerModalTitle = document.getElementById("playerModalTitle");
const playerModalSubtitle = document.getElementById("playerModalSubtitle");
const playerModalDriveInfo = document.getElementById("playerModalDriveInfo");
const playerDownloadBtn = document.getElementById("playerDownloadBtn") as HTMLAnchorElement | null;
const playerDriveOpenBtn = document.getElementById("playerDriveOpenBtn") as HTMLAnchorElement | null;
const playerAudioAvatar = document.getElementById("playerAudioAvatar") as HTMLImageElement | null;
const playerAudioParticipants = document.getElementById("playerAudioParticipants");
const playerAudioMeta = document.getElementById("playerAudioMeta");
const playerTypeIcon = document.getElementById("playerTypeIcon");

// Admin Call Recordings View Elements
const adminTabRecordings = document.getElementById("adminTabRecordings");
const adminSubViewRecordings = document.getElementById("adminSubViewRecordings");
const adminRecordingsContainer = document.getElementById("adminRecordingsContainer");
const adminRefreshRecordingsBtn = document.getElementById("adminRefreshRecordingsBtn");
const adminOpenGoogleDriveBtn = document.getElementById("adminOpenGoogleDriveBtn");
const recordingsTypeFilter = document.getElementById("recordingsTypeFilter") as HTMLSelectElement | null;
const recordingsSearchInput = document.getElementById("recordingsSearchInput") as HTMLInputElement | null;
const statTotalRecordings = document.getElementById("statTotalRecordings");
const adminOpenDriveConfigModalBtn = document.getElementById("adminOpenDriveConfigModalBtn");
const driveWebhookConfigModal = document.getElementById("driveWebhookConfigModal");
const closeDriveWebhookModalBtn = document.getElementById("closeDriveWebhookModalBtn");
const driveWebhookUrlInput = document.getElementById("driveWebhookUrlInput") as HTMLInputElement | null;
const saveDriveWebhookBtn = document.getElementById("saveDriveWebhookBtn");
const syncVaultRecordingsToDriveBtn = document.getElementById("syncVaultRecordingsToDriveBtn");
const driveWebhookStatusAlert = document.getElementById("driveWebhookStatusAlert");
const driveWebhookStatusIcon = document.getElementById("driveWebhookStatusIcon");
const driveWebhookStatusTitle = document.getElementById("driveWebhookStatusTitle");
const driveWebhookStatusText = document.getElementById("driveWebhookStatusText");
const driveBackupHealthStat = document.getElementById("driveBackupHealthStat");
const backupHealthCard = document.getElementById("backupHealthCard");

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
  // Strictly purge any legacy cached assessments that contain Creative Arts, Math, Quiz, Project, or Exams
  try {
    const cachedAsmts = localStorage.getItem("jhs_local_assessments");
    if (cachedAsmts && (cachedAsmts.includes("Creative") || cachedAsmts.includes("Art") || cachedAsmts.includes("Math") || cachedAsmts.includes("Quiz") || cachedAsmts.includes("Project") || cachedAsmts.includes("Exam") || cachedAsmts.includes("Term"))) {
      localStorage.removeItem("jhs_local_assessments");
    }
    const configuredQ = localStorage.getItem("jhs_configured_questions");
    if (configuredQ && (configuredQ.includes("asmt-007") || configuredQ.includes("asmt-008") || configuredQ.includes("asmt-009") || configuredQ.includes("asmt-003"))) {
      localStorage.removeItem("jhs_configured_questions");
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
(window as any).openActiveLearnersModal = openActiveLearnersModal;
(window as any).closeActiveLearnersModal = closeActiveLearnersModal;
(window as any).showActiveLearnerDetail = showActiveLearnerDetail;
(window as any).renderActiveLearnersList = renderActiveLearnersList;
(window as any).showAuthLoaderSigningIn = showAuthLoaderSigningIn;
(window as any).showAuthLoaderSuccess = showAuthLoaderSuccess;
(window as any).hideAuthLoader = hideAuthLoader;
(window as any).handleClearMockData = handleClearMockData;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => startApplication());
} else {
  startApplication();
}

// ------------------------------------------------------------------------------
// Dynamic Google Auth Loader Controller
// ------------------------------------------------------------------------------
function showAuthLoaderSigningIn(title = "Signing in....", subtitle = "Connecting to your Google account and verifying your learner credentials...") {
  const loaderSection = document.getElementById("authLoaderSection");
  const signingInEl = document.getElementById("authLoaderSigningIn");
  const successEl = document.getElementById("authLoaderSuccess");
  const titleEl = document.getElementById("authLoaderTitle");
  const subtitleEl = document.getElementById("authLoaderSubtitle");

  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;

  signingInEl?.classList.remove("hidden");
  successEl?.classList.add("hidden");

  // Keep landing and dashboard hidden so the landing image never shows
  authSection?.classList.add("hidden");
  dashboardSection?.classList.add("hidden");
  adminDashboardSection?.classList.add("hidden");
  adminGatekeeperSection?.classList.add("hidden");
  adminGatekeeperSection?.classList.remove("flex");

  loaderSection?.classList.remove("hidden");
  document.documentElement.classList.add("google-signing-in");
}

function showAuthLoaderSuccess(title = "Successfully signed in", subtitle = "Authentication confirmed! Taking you to your dashboard...") {
  const loaderSection = document.getElementById("authLoaderSection");
  const signingInEl = document.getElementById("authLoaderSigningIn");
  const successEl = document.getElementById("authLoaderSuccess");
  const titleEl = document.getElementById("authLoaderSuccessTitle");
  const subtitleEl = document.getElementById("authLoaderSuccessSubtitle");

  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;

  signingInEl?.classList.add("hidden");
  successEl?.classList.remove("hidden");

  loaderSection?.classList.remove("hidden");
}

function hideAuthLoader() {
  const loaderSection = document.getElementById("authLoaderSection");
  loaderSection?.classList.add("hidden");
  document.documentElement.classList.remove("google-signing-in");
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

    const previewLoader = urlParams.get("preview_loader");
    if (previewLoader === "signing_in") {
      showAuthLoaderSigningIn("Signing in....", "Connecting to your Google account and verifying your learner credentials...");
      return;
    }
    if (previewLoader === "success") {
      showAuthLoaderSuccess("Successfully signed in", "Authentication confirmed! Taking you to your dashboard...");
      return;
    }

    const isGoogleOAuthReturning = Boolean(
      (typeof window !== "undefined" && (
        (window.location.hash && (window.location.hash.includes("access_token") || window.location.hash.includes("refresh_token"))) ||
        (window.location.search && window.location.search.includes("code="))
      )) ||
      sessionStorage.getItem("jhs_google_auth_in_progress") === "true"
    );

    if (isGoogleOAuthReturning && !oauthError) {
      showAuthLoaderSigningIn("Signing in....", "Verifying your Google credentials...");
    }

    if (oauthError || oauthDesc) {
      sessionStorage.removeItem("jhs_google_auth_in_progress");
      hideAuthLoader();
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

      // If completing Google sign-in / OAuth redirect: show "Successfully signed in" before sending to dashboard
      if (isGoogleOAuthReturning) {
        const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Learner";
        showAuthLoaderSuccess("Successfully signed in", `Welcome back, ${displayName}! Preparing your dashboard...`);
        await new Promise((resolve) => setTimeout(resolve, 1400));
        sessionStorage.removeItem("jhs_google_auth_in_progress");
        hideAuthLoader();
      }
    } else {
      state.user = null;
      state.profile = null;
      state.isAdmin = false;
      sessionStorage.removeItem("jhs_google_auth_in_progress");
      hideAuthLoader();
    }

    const savedView = localStorage.getItem("jhs_view_mode");
    state.activeView = savedView === "admin" ? "admin" : "learner";

    if (state.user) {
      try {
        await initNotifications();
      } catch (err) {
        console.warn("Notifications init error:", err);
      }
      try {
        await initChat();
      } catch (err) {
        console.warn("Chat init error:", err);
      }
      try {
        checkForPendingActiveCallOnLogin();
      } catch (err) {
        console.warn("Call check error:", err);
      }
    }

    await handleRoute();
  } catch (err) {
    console.error("Error checking auth session:", err);
    state.user = null;
    state.profile = null;
    state.isAdmin = false;
    sessionStorage.removeItem("jhs_google_auth_in_progress");
    hideAuthLoader();
    await handleRoute();
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
  hideAuthLoader();
  updateActiveTestBanner();
  document.getElementById("mainHeader")?.classList.remove("hidden");
  document.getElementById("mainFooter")?.classList.remove("hidden");

  authSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  adminDashboardSection.classList.add("hidden");
  adminGatekeeperSection.classList.add("hidden");
  adminGatekeeperSection.classList.remove("flex");
  adminToggleContainer.classList.add("hidden");
  floatingChatContainer.classList.remove("hidden");

  authNavContainer.innerHTML = `
    <button id="headerSignInBtn" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-all whitespace-nowrap cursor-pointer">
      <i class="fa-brands fa-google text-xs"></i> Sign In
    </button>
  `;
  document.getElementById("headerSignInBtn")?.addEventListener("click", handleGoogleSignIn);
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
    sessionStorage.setItem("jhs_google_auth_in_progress", "true");
    showAuthLoaderSigningIn("Signing in....", "Connecting to your Google account...");

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
    sessionStorage.removeItem("jhs_google_auth_in_progress");
    hideAuthLoader();
    renderAuthLanding();
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
        <span id="googleSignInBtnText">Sign in with Google</span>
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

async function startDemoMode() {
  showAuthLoaderSigningIn("Signing in....", "Authenticating Kwame Mensah Frimpong (Basic 9A)...");
  await new Promise((resolve) => setTimeout(resolve, 800));

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

  showAuthLoaderSuccess("Successfully signed in", "Welcome Kwame Mensah Frimpong! Loading your dashboard...");
  await new Promise((resolve) => setTimeout(resolve, 1400));
  hideAuthLoader();

  initNotifications();
  initChat();
  navigateTo("/learner");
}

async function startDemoMode9B() {
  showAuthLoaderSigningIn("Signing in....", "Authenticating Ama Serwaa Asante (Basic 9B)...");
  await new Promise((resolve) => setTimeout(resolve, 800));

  const demoUser = {
    id: "demo-learner-9b-001",
    email: "ama.asante@ghana-edu.gov.gh",
    user_metadata: {
      full_name: "Ama Serwaa Asante",
      avatar_url: AVATAR_PRESETS[1],
    },
  };

  const demoProfile = {
    id: "demo-learner-9b-001",
    student_id: "JHS26-B9B-001",
    full_name: "Ama Serwaa Asante",
    email: "ama.asante@ghana-edu.gov.gh",
    gender: "Female",
    date_of_birth: "2011-05-20",
    class_level: "Basic 9B",
    role: "learner",
    avatar_url: AVATAR_PRESETS[1],
    onboarding_completed: true,
  };

  localStorage.setItem("jhs_demo_session", JSON.stringify(demoUser));
  localStorage.setItem("jhs_active_learner", JSON.stringify(demoProfile));
  localStorage.setItem("jhs_view_mode", "learner");

  state.user = demoUser;
  state.profile = demoProfile;
  state.isAdmin = false;
  state.activeView = "learner";

  showAuthLoaderSuccess("Successfully signed in", "Welcome Ama Serwaa Asante! Loading your dashboard...");
  await new Promise((resolve) => setTimeout(resolve, 1400));
  hideAuthLoader();

  initNotifications();
  initChat();
  navigateTo("/learner");
}

async function startAdminDemoMode() {
  showAuthLoaderSigningIn("Signing in....", "Authenticating Master Debrah (Admin)...");
  await new Promise((resolve) => setTimeout(resolve, 800));

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

  showAuthLoaderSuccess("Successfully signed in", "Welcome Master Debrah! Opening Admin Console...");
  await new Promise((resolve) => setTimeout(resolve, 1400));
  hideAuthLoader();

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
  updateActiveTestBanner();
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
      <div class="flex items-center gap-1 sm:gap-2 p-1 pr-1.5 sm:pr-2.5 rounded-full bg-slate-100 border border-slate-200">
        <img src="${profile?.avatar_url || AVATAR_PRESETS[0]}" alt="Avatar" class="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-1 ring-indigo-500 shrink-0" />
        <div class="flex items-center gap-1">
          <span class="text-xs font-semibold text-slate-800 hidden xs:inline max-w-[75px] sm:max-w-none truncate">${state.activeView === "admin" ? "Master Debrah" : (profile?.full_name || "Kwame Mensah Frimpong")}</span>
          ${roleBadge}
        </div>
      </div>
      <button id="headerSignOutBtn" class="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer shrink-0" title="Sign Out">
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
        if (viewModeLabel) viewModeLabel.textContent = "Learner";
        viewModeToggleBtn.className = "inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all cursor-pointer";
        viewModeToggleBtn.innerHTML = `<i class="fa-solid fa-graduation-cap text-indigo-600 text-xs"></i> <span class="hidden sm:inline">Learner Portal</span><span class="sm:hidden text-[11px]">Learner</span>`;
        viewModeToggleBtn.title = "Switch to Learner Portal";
      } else {
        if (viewModeLabel) viewModeLabel.textContent = "Admin";
        viewModeToggleBtn.className = "inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-2xs transition-all cursor-pointer";
        viewModeToggleBtn.innerHTML = `<i class="fa-solid fa-shield-halved text-indigo-400 text-xs"></i> <span class="hidden sm:inline">Admin Console</span><span class="sm:hidden text-[11px]">Admin</span>`;
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

function setOnboardingFormLockdown(isBusy) {
  const form = document.getElementById("onboardingForm");
  const saveBtn = document.getElementById("saveOnboardingBtn");
  const closeBtn = document.getElementById("closeOnboardingModalBtn");
  const avatarFile = document.getElementById("regAvatarFile");
  const avatarPresetsContainer = document.getElementById("avatarPresets");
  const uploadLabels = document.querySelectorAll('label[for="regAvatarFile"]');

  if (form) {
    if (isBusy) {
      form.classList.add("form-saving-lockdown");
    } else {
      form.classList.remove("form-saving-lockdown");
    }
  }

  if (saveBtn) {
    saveBtn.disabled = isBusy;
    if (isBusy) {
      saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving Profile...`;
    } else {
      saveBtn.innerHTML = `<i class="fa-solid fa-check mr-2"></i> Save Profile & Enter Dashboard`;
    }
  }

  if (closeBtn) closeBtn.disabled = isBusy;
  if (regFullName) regFullName.disabled = isBusy;
  if (regGender) regGender.disabled = isBusy;
  if (regClass) regClass.disabled = isBusy;
  if (avatarFile) avatarFile.disabled = isBusy;

  // Immutability guard for Date of Birth:
  const isDobImmutable = Boolean(state.profile?.onboarding_completed && state.profile?.date_of_birth);
  if (regDob) {
    regDob.disabled = isBusy || isDobImmutable;
  }

  // Disable upload labels (camera hover and upload button)
  uploadLabels.forEach((lbl) => {
    if (isBusy) {
      lbl.classList.add("pointer-events-none", "opacity-40", "cursor-not-allowed");
    } else {
      lbl.classList.remove("pointer-events-none", "opacity-40", "cursor-not-allowed");
    }
  });

  // Disable preset avatar picker buttons
  if (avatarPresetsContainer) {
    avatarPresetsContainer.querySelectorAll("button").forEach((btn) => {
      btn.disabled = isBusy;
      if (isBusy) {
        btn.classList.add("pointer-events-none", "opacity-40", "cursor-not-allowed");
      } else {
        btn.classList.remove("pointer-events-none", "opacity-40", "cursor-not-allowed");
      }
    });
  }
}

function showClassChangeWarningModal(oldClass, newClass, onConfirm, onCancel) {
  const modal = document.getElementById("classChangeWarningModal");
  const oldSpan = document.getElementById("classChangeOldClass");
  const newSpan = document.getElementById("classChangeNewClass");
  const confirmBtn = document.getElementById("confirmClassChangeBtn");
  const cancelBtn = document.getElementById("cancelClassChangeBtn");

  if (!modal) {
    const ok = confirm(
      `⚠️ ACADEMIC CLASS CHANGE WARNING:\n\nYou are changing your class stream from ${oldClass} to ${newClass}.\n\n` +
      `• You may lose previously accumulated continuous assessment data, marks, and rank for ${oldClass}.\n` +
      `• Under Ghana Education Service (GES) examination regulations, any fraudulent stream switching will be penalized severely.\n\n` +
      `Do you confirm this change?`
    );
    if (ok) onConfirm();
    else onCancel();
    return;
  }

  if (oldSpan) oldSpan.textContent = oldClass;
  if (newSpan) newSpan.textContent = newClass;

  modal.classList.remove("hidden");

  const cleanup = () => {
    modal.classList.add("hidden");
    confirmBtn?.removeEventListener("click", handleConfirm);
    cancelBtn?.removeEventListener("click", handleCancel);
  };

  const handleConfirm = () => {
    cleanup();
    onConfirm();
  };

  const handleCancel = () => {
    cleanup();
    onCancel();
  };

  confirmBtn?.addEventListener("click", handleConfirm, { once: true });
  cancelBtn?.addEventListener("click", handleCancel, { once: true });
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

  // Class Change Academic Warning Check:
  const prevClass = state.profile?.class_level;
  if (prevClass && prevClass !== classVal && !(window as any).__confirmedClassChange) {
    showClassChangeWarningModal(
      prevClass,
      classVal,
      () => {
        (window as any).__confirmedClassChange = true;
        handleOnboardingSubmit(e);
      },
      () => {
        regClass.value = prevClass;
        (window as any).__confirmedClassChange = false;
      }
    );
    return;
  }
  (window as any).__confirmedClassChange = false;

  // Lock down entire form and image selectors while saving
  setOnboardingFormLockdown(true);

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
    setOnboardingFormLockdown(false);
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
  if (adminLiveUsersBadge) adminLiveUsersBadge.textContent = "0";
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
  const mobileContainer = document.getElementById("adminLearnersCardsMobile");
  if (mobileContainer) {
    mobileContainer.innerHTML = Array(3).fill(`
      <div class="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3 animate-pulse">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-slate-200 shrink-0"></div>
          <div class="space-y-1.5 flex-1">
            <div class="h-4 w-32 bg-slate-200 rounded"></div>
            <div class="h-3 w-24 bg-slate-100 rounded"></div>
          </div>
        </div>
        <div class="h-10 bg-slate-100 rounded-xl"></div>
        <div class="grid grid-cols-4 gap-1 pt-1">
          <div class="h-8 bg-slate-200 rounded-xl"></div>
          <div class="h-8 bg-slate-200 rounded-xl"></div>
          <div class="h-8 bg-slate-200 rounded-xl"></div>
          <div class="h-8 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
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

  // Fetch Assessments & Submissions with smooth minimum skeleton pulse window
  const [asmts, subs] = await Promise.all([
    fetchAssessments(),
    fetchLearnerSubmissions(profile?.id || user?.id),
    new Promise((resolve) => setTimeout(resolve, 400)),
  ]);
  state.assessments = asmts || [];
  state.submissions = subs || [];

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

  // Filter assessments strictly for this learner's class & Computing subject
  const myClassAssessments = state.assessments.filter((a) => {
    if (a.subject && a.subject !== "Computing") return false;
    const titleLower = (a.title || "").toLowerCase();
    if (titleLower.includes("creative") || titleLower.includes("art") || titleLower.includes("math")) return false;
    if (a.class_level === "Basic 9A" && learnerClass !== "Basic 9A") return false;
    if (a.class_level === "Basic 9B" && learnerClass !== "Basic 9B") return false;
    return true;
  });

  // Completed Count
  dashCompletedCount.textContent = state.submissions.length;
  dashTotalTests.textContent = `/ ${myClassAssessments.length} Tasks`;
  if (dashCompletedProgressBar && myClassAssessments.length > 0) {
    const pct = Math.min(100, Math.round((state.submissions.length / myClassAssessments.length) * 100));
    dashCompletedProgressBar.style.width = `${pct}%`;
  }

  // Available / Open Tasks Count (only unlocked items for student's class)
  const openCount = myClassAssessments.filter((a) => {
    const isScheduled = a.unlock_time && new Date(a.unlock_time) > new Date();
    const isExpired = a.deadline && new Date(a.deadline) < new Date();
    return a.status === "AVAILABLE" && !isScheduled && !isExpired;
  }).length;
  dashAvailableCount.textContent = openCount;
  const availBar = document.getElementById("dashAvailableProgressBar");
  if (availBar && myClassAssessments.length > 0) {
    const availPct = Math.min(100, Math.round((openCount / myClassAssessments.length) * 100));
    availBar.style.width = `${availPct}%`;
  }

  // Last Test Done
  const lastTestPct = document.getElementById("dashLastTestPct");
  const lastTestFeedbackPrompt = document.getElementById("dashLastTestFeedbackPrompt");

  if (state.submissions.length > 0) {
    const lastSub = state.submissions[0];
    const asmt = lastSub.assessments || {};
    dashLastTestTitle.textContent = asmt.title || "Recent Assessment";
    dashLastTestScore.textContent = `${lastSub.score} / ${lastSub.max_score || 20}`;
    dashLastTestDate.textContent = formatDateTime(lastSub.submitted_at);

    if (lastTestPct && lastSub.max_score) {
      const pct = Math.round((parseFloat(lastSub.score) / parseFloat(lastSub.max_score)) * 100);
      lastTestPct.textContent = `(${pct}%)`;
      lastTestPct.classList.remove("hidden");
    }
    if (lastTestFeedbackPrompt) {
      lastTestFeedbackPrompt.innerHTML = "Feedback &rarr;";
    }

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
    dashLastTestScore.textContent = "-- / --";
    dashLastTestDate.textContent = "Pending";
    if (lastTestPct) lastTestPct.classList.add("hidden");
    if (lastTestFeedbackPrompt) {
      lastTestFeedbackPrompt.innerHTML = "Explore CATs &rarr;";
    }
    if (dashLastTestRank) dashLastTestRank.classList.add("hidden");
    dashLastTestRemarks.textContent = "Take an available CAT below to record your first score.";
    lastTestCard.onclick = null;
  }

  // Update Hub Filter Counts strictly scoped to student's class
  countAll.textContent = myClassAssessments.length;
  countAvailable.textContent = openCount;
  countClosed.textContent = myClassAssessments.filter((a) => {
    const isScheduled = a.unlock_time && new Date(a.unlock_time) > new Date();
    const isExpired = a.deadline && new Date(a.deadline) < new Date();
    return a.status === "CLOSED" || isScheduled || isExpired;
  }).length;
  countGraded.textContent = graded.length;

  // Render AI Personalized Milestone Target Banner
  renderAiMilestoneQuestBanner();
}

function renderAiMilestoneQuestBanner() {
  const banner = document.getElementById("aiTargetMilestoneBanner");
  if (!banner) return;

  const learnerName = state.profile?.full_name?.split(" ")[0] || "Learner";

  if (state.submissions && state.submissions.length > 0) {
    const lastSub = state.submissions[0];
    const asmt = lastSub.assessments || {};

    let targetProfile = getActiveTarget();
    if (!targetProfile || targetProfile.status !== "ACTIVE_TARGET") {
      targetProfile = generateLearnerAIPotentials(learnerName, lastSub, asmt.title || "Computing CAT");
    }

    const titleEl = document.getElementById("aiBannerTitle");
    const msgEl = document.getElementById("aiBannerMessage");
    const valEl = document.getElementById("aiBannerTargetVal");
    const badgeEl = document.getElementById("aiBannerBadge");
    const detailsBtn = document.getElementById("viewAiQuestDetailsBtn");

    if (titleEl) titleEl.textContent = targetProfile.motivationalNotice.title;
    if (msgEl) msgEl.textContent = targetProfile.motivationalNotice.message;
    if (valEl) valEl.textContent = `${targetProfile.targetScore.toFixed(1)} / ${targetProfile.maxScore}`;
    if (badgeEl) badgeEl.textContent = targetProfile.motivationalNotice.badge;

    if (detailsBtn) {
      detailsBtn.onclick = () => openScoreDetailsModal(lastSub);
    }

    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}

// ------------------------------------------------------------------------------
// Assessment Grid & Filter Rendering
// ------------------------------------------------------------------------------
function renderAssessmentCards() {
  updateActiveTestBanner();
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
    const isExpired = asmt.deadline && new Date(asmt.deadline) < new Date();
    const isAvailable = asmt.status === "AVAILABLE" && !isScheduled && !isExpired;

    if (filterStatus === "AVAILABLE") return isAvailable;
    if (filterStatus === "CLOSED") return asmt.status === "CLOSED" || isScheduled || isExpired;
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
    const isExpired = asmt.deadline && new Date(asmt.deadline) < new Date();
    const isAvailable = asmt.status === "AVAILABLE" && !isScheduled && !isExpired;
    const hasScore = sub && sub.status === "GRADED";
    const duration = asmt.time_limit_minutes || 15;

    // Subject styles - Exclusively Computing
    const subjectClass = "bg-blue-50 text-blue-700 border-blue-200";
    const subjectIcon = "fa-laptop-code";

    // Status Pill
    let statusBadge = "";
    if (sub && sub.retake_granted === true) {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse shadow-2xs">
          <i class="fa-solid fa-rotate-right text-amber-600"></i> Retake Authorized
        </span>
      `;
    } else if (hasScore) {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <i class="fa-solid fa-lock text-indigo-500"></i> Graded &amp; Locked
        </span>
      `;
    } else if (isExpired) {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
          <i class="fa-solid fa-hourglass-end text-rose-600"></i> Validity Expired
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
    if (sub && sub.retake_granted === true) {
      actionBtn = `
        <button class="start-quiz-btn w-full py-2 px-3 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5" data-asmt-id="${asmt.id}" data-is-retake="true">
          <i class="fa-solid fa-rotate-right text-xs"></i> Start Assessment Retake
        </button>
        <button class="view-score-btn w-full mt-1.5 py-1.5 px-3 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1" data-sub-id="${sub.id}">
          <i class="fa-solid fa-clock-rotate-left text-[10px]"></i> View Previous Attempt (${sub.score}/${asmt.max_score})
        </button>
      `;
    } else if (hasScore) {
      actionBtn = `
        <button class="view-score-btn w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5" data-sub-id="${sub.id}">
          <i class="fa-solid fa-file-lines text-indigo-600 text-xs"></i> View Score &amp; Feedback
        </button>
      `;
    } else if (isExpired) {
      actionBtn = `
        <button disabled class="w-full py-2 px-3 rounded-lg text-xs font-bold bg-rose-50 text-rose-500 border border-rose-200 cursor-not-allowed flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-ban text-rose-400 text-xs"></i> Validity Period Expired
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
          <i class="fa-solid fa-play text-xs"></i> Start Assessment (${duration}m)
        </button>
      `;
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

          <!-- Metrics 2x2 Chip Grid (High-Density Mobile & Desktop) -->
          <div class="grid grid-cols-2 gap-2 py-2.5 my-3 border-y border-slate-100 text-[11px]">
            <div class="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50/80 border border-slate-100/90">
              <div class="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <i class="fa-regular fa-clock text-[10px]"></i>
              </div>
              <div class="min-w-0">
                <span class="text-[9.5px] uppercase font-bold text-slate-400 block leading-tight">Duration</span>
                <span class="font-bold text-slate-800 text-[11px] truncate block">${duration} mins</span>
              </div>
            </div>

            <div class="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50/80 border border-slate-100/90">
              <div class="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-bullseye text-[10px]"></i>
              </div>
              <div class="min-w-0">
                <span class="text-[9.5px] uppercase font-bold text-slate-400 block leading-tight">Max Score</span>
                <span class="font-bold text-slate-800 text-[11px] truncate block">${asmt.max_score} marks</span>
              </div>
            </div>

            <div class="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50/80 border border-slate-100/90">
              <div class="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-scale-balanced text-[10px]"></i>
              </div>
              <div class="min-w-0">
                <span class="text-[9.5px] uppercase font-bold text-slate-400 block leading-tight">Weight</span>
                <span class="font-bold text-purple-700 text-[11px] truncate block">${asmt.weight ? parseFloat(asmt.weight) : 20}%</span>
              </div>
            </div>

            <div class="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50/80 border border-slate-100/90">
              <div class="w-6 h-6 rounded-md ${isExpired ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'} flex items-center justify-center shrink-0">
                <i class="fa-regular fa-calendar-check text-[10px]"></i>
              </div>
              <div class="min-w-0">
                <span class="text-[9.5px] uppercase font-bold text-slate-400 block leading-tight">Deadline</span>
                <span class="font-bold ${isExpired ? 'text-rose-600 font-extrabold' : 'text-slate-700'} text-[11px] truncate block">${formatDeadline(asmt.deadline)}</span>
              </div>
            </div>
          </div>

          ${
            hasScore
              ? `
            <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-50/80 border border-amber-200/80 mb-3 text-[11px]">
              <span class="text-amber-800 font-medium flex items-center gap-1.5">
                <i class="fa-solid fa-medal text-amber-500"></i> Class Position:
              </span>
              <span class="font-bold text-amber-900 bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
                ${cardOrdinal} of ${cardClassTotal} in ${learnerClass}
              </span>
            </div>
          `
              : ""
          }

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
  if (existingSub && !existingSub.retake_granted) {
    alert("You have already completed and submitted this assessment. Re-takes are locked to maintain assessment integrity.");
    return;
  }

  const isScheduled = asmt.unlock_time && new Date(asmt.unlock_time) > new Date();
  if (asmt.status === "CLOSED" || isScheduled) {
    alert("This assessment has been turned off / closed by the administrator or is locked until scheduled release.");
    return;
  }

  const isExpired = asmt.deadline && new Date(asmt.deadline) < new Date();
  if (isExpired && !existingSub?.retake_granted) {
    alert("The validity period for this assessment has expired. Submissions are no longer accepted.");
    return;
  }

  const learnerClass = state.profile?.class_level || "Basic 9A";
  const questionPack = getAssessmentQuestionPack(asmtId, learnerClass, asmt.title);
  // Anti-cheat intelligence: randomize both question order AND option order for each student paper
  const studentPaper = generateStudentPaper(questionPack);
  const sittingMinutes = asmt.time_limit_minutes || questionPack?.time_limit_minutes || 15;

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
    isRetake: !!(existingSub && existingSub.retake_granted),
  };

  if (quizTimerText) {
    quizTimerText.textContent = `${String(sittingMinutes).padStart(2, "0")}:00`;
  }

  if (quizSubjectBadge) quizSubjectBadge.textContent = asmt.subject;
  if (quizClassTrackBadge) quizClassTrackBadge.textContent = `${learnerClass} Track`;
  if (quizTitle) quizTitle.textContent = asmt.title;
  if (quizLearnerName) quizLearnerName.textContent = state.profile?.full_name || "Student Learner";
  if (quizStudentIdText) quizStudentIdText.textContent = state.profile?.student_id || generateStudentId(learnerClass, 1);
  const quizLearnerEmailEl = document.getElementById("quizLearnerEmail");
  if (quizLearnerEmailEl) quizLearnerEmailEl.textContent = state.profile?.email || state.user?.email || "student@ghana-edu.gov.gh";
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

  function syncQuizNavigationButtons(quizObj) {
    if (!quizObj || !quizObj.paper) return;
    const qItem = quizObj.paper[quizObj.currentIndex];
    const totalCount = quizObj.paper.length;
    const isLastQ = quizObj.currentIndex === totalCount - 1;

    const ans = quizObj.answers[qItem.id];
    const hasAns = ans !== undefined && ans !== null && typeof ans === "string" && ans.trim().length > 0;

    const targetBtn = isLastQ ? quizSubmitBtn : quizNextBtn;
    const otherBtn = isLastQ ? quizNextBtn : quizSubmitBtn;

    if (otherBtn) otherBtn.classList.add("hidden");
    if (targetBtn) {
      targetBtn.classList.remove("hidden");
      if (hasAns) {
        targetBtn.removeAttribute("disabled");
        targetBtn.classList.remove("opacity-40", "cursor-not-allowed", "pointer-events-none");
        targetBtn.classList.add("cursor-pointer");
      } else {
        targetBtn.setAttribute("disabled", "true");
        targetBtn.classList.add("opacity-40", "cursor-not-allowed", "pointer-events-none");
        targetBtn.classList.remove("cursor-pointer");
      }
    }
  }

  if (quizOptionsList) {
    const isFillBlank = currentQ.type === "fill_blank" || !currentQ.options || currentQ.options.length === 0;

    if (isFillBlank) {
      quizOptionsList.innerHTML = `
        <div class="space-y-3">
          <div class="p-4 sm:p-5 bg-slate-50/80 rounded-2xl border-2 border-slate-200 focus-within:border-indigo-600 focus-within:bg-indigo-50/20 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
            <label for="quizFillBlankInput" class="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center justify-between">
              <span><i class="fa-solid fa-pen-nib text-indigo-600 mr-1.5"></i>Your Answer (Fill in the Blank)</span>
              <span class="text-[11px] font-normal text-slate-400 lowercase">case-insensitive</span>
            </label>
            <input
              type="text"
              id="quizFillBlankInput"
              class="w-full px-4 py-3 bg-white rounded-xl border border-slate-300 text-slate-900 font-semibold text-sm sm:text-base placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm transition"
              placeholder="Type your answer here..."
              autocomplete="off"
              spellcheck="false"
              value="${escapeHtml(selectedAnswer || '')}"
            />
            <p class="text-[11px] text-slate-500 mt-2.5 flex items-center gap-1.5">
              <i class="fa-solid fa-circle-info text-indigo-500 shrink-0"></i>
              <span>Ensure accurate spelling. Type your answer to unlock the <strong>Next Question</strong> button.</span>
            </p>
          </div>
        </div>
      `;

      const inputEl = document.getElementById("quizFillBlankInput");
      if (inputEl) {
        setTimeout(() => inputEl.focus(), 60);

        inputEl.addEventListener("input", (e) => {
          quiz.answers[currentQ.id] = e.target.value.trim();
          syncQuizNavigationButtons(quiz);
        });

        inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const val = inputEl.value.trim();
            if (!val) {
              alert("Please type your answer before proceeding.");
              syncQuizNavigationButtons(quiz);
              return;
            }
            quiz.answers[currentQ.id] = val;
            if (quiz.currentIndex < quiz.paper.length - 1) {
              quiz.currentIndex++;
              renderQuizQuestion();
            } else {
              handleQuizSubmit();
            }
          }
        });
      }
    } else {
      // Multiple Choice Question Rendering
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

          // Enable Next / Submit button immediately when option is chosen
          syncQuizNavigationButtons(quiz);
        });
      });
    }
  }

  // Update Previous button state
  if (quizPrevBtn) {
    if (quiz.currentIndex === 0) {
      quizPrevBtn.setAttribute("disabled", "true");
      quizPrevBtn.className = "inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 bg-slate-50 text-slate-400 opacity-40 cursor-not-allowed transition";
    } else {
      quizPrevBtn.removeAttribute("disabled");
      quizPrevBtn.className = "inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer";
    }
  }

  // Initial sync of Next / Submit button state (disabled if not yet answered)
  syncQuizNavigationButtons(quiz);

  // Reset scroll position to top so new question is fully visible
  if (quizActiveBody) {
    quizActiveBody.scrollTop = 0;
  }
}

function handleQuizPrev() {
  const quiz = state.activeQuiz;
  if (!quiz) return;

  const inputEl = document.getElementById("quizFillBlankInput");
  if (inputEl) {
    quiz.answers[quiz.paper[quiz.currentIndex].id] = inputEl.value.trim();
  }

  if (quiz.currentIndex > 0) {
    quiz.currentIndex--;
    renderQuizQuestion();
  }
}

function handleQuizNext() {
  const quiz = state.activeQuiz;
  if (!quiz) return;

  const currentQ = quiz.paper[quiz.currentIndex];
  const inputEl = document.getElementById("quizFillBlankInput");
  if (inputEl) {
    quiz.answers[currentQ.id] = inputEl.value.trim();
  }

  const userAns = quiz.answers[currentQ.id];
  if (!userAns || (typeof userAns === "string" && userAns.trim() === "")) {
    alert("Please enter or select an answer to proceed.");
    return;
  }

  if (quiz.currentIndex < quiz.paper.length - 1) {
    quiz.currentIndex++;
    renderQuizQuestion();
  }
}

function normalizeQuizAnswer(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function handleQuizSubmit() {
  const quiz = state.activeQuiz;
  if (!quiz) return;
  if (quiz.isSubmitting) return;

  const currentQ = quiz.paper[quiz.currentIndex];
  const inputEl = document.getElementById("quizFillBlankInput");
  if (inputEl) {
    quiz.answers[currentQ.id] = inputEl.value.trim();
  }

  const userAns = quiz.answers[currentQ.id];
  if (!userAns || (typeof userAns === "string" && userAns.trim() === "")) {
    alert("Please provide an answer to complete the assessment.");
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
    if (studentChoice && typeof studentChoice === "string") {
      const rawChoice = studentChoice.trim().toLowerCase();
      const normChoice = normalizeQuizAnswer(studentChoice);

      const checkMatches = (target) => {
        if (!target) return false;
        const rawTarget = target.trim().toLowerCase();
        const normTarget = normalizeQuizAnswer(target);
        return rawChoice === rawTarget || normChoice === normTarget;
      };

      let isCorrect = false;
      if (q.correctAnswer && checkMatches(q.correctAnswer)) {
        isCorrect = true;
      } else if (Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.some((ans) => checkMatches(ans))) {
        isCorrect = true;
      }

      if (isCorrect) {
        correctCount++;
      }
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

  // ----------------------------------------------------------------------------
  // AI Pedagogical Assurance & Next Target Calibration Engine
  // ----------------------------------------------------------------------------
  const learnerName = state.profile?.full_name?.split(" ")[0] || "Learner";

  // 1. Evaluate previous target outcome (Celebratory vs Reassuring Assurance)
  const outcomeEvaluation = evaluateNextTestOutcome(score, maxScore, quiz.asmtTitle);
  const assuranceContainer = document.getElementById("quizResultAssuranceContainer");
  if (assuranceContainer) {
    if (outcomeEvaluation) {
      assuranceContainer.innerHTML = renderAssuranceCardHTML(outcomeEvaluation);
      assuranceContainer.classList.remove("hidden");

      // Broadcast intelligent in-app push notification
      window.dispatchEvent(
        new CustomEvent("jhs:push-notification", {
          detail: {
            title: outcomeEvaluation.assuranceTitle,
            body: outcomeEvaluation.assuranceMessage,
            timestamp: "Just now",
          },
        })
      );
    } else {
      assuranceContainer.innerHTML = "";
      assuranceContainer.classList.add("hidden");
    }
  }

  // 2. Unveil potentials & calibrate realistic target for the next sitting
  const newAiProfile = generateLearnerAIPotentials(
    learnerName,
    {
      score,
      max_score: maxScore,
      assessment_id: quiz.asmtId,
      learner_id: learnerId,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
    },
    quiz.asmtTitle
  );

  const quizResultAiContainer = document.getElementById("quizResultAiContainer");
  if (quizResultAiContainer) {
    quizResultAiContainer.innerHTML = renderAIPotentialCardHTML(newAiProfile);
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

function handleRequestCloseQuiz() {
  const quiz = state.activeQuiz;
  // If assessment sitting is active and results screen is not yet shown:
  if (quiz && quizResultScreen && quizResultScreen.classList.contains("hidden")) {
    const modal = document.getElementById("quizAbandonWarningModal");
    if (modal) {
      modal.classList.remove("hidden");
      return;
    }
    const ok = confirm(
      "CRITICAL EXAMINATION ALERT:\n\nIf you close this assessment now, your test sitting will be terminated and recorded as FAILED (0.0 Marks / F9 Grade).\n\nAre you sure you want to abandon this assessment and fail?"
    );
    if (ok) {
      handleConfirmAbandonQuiz();
    }
    return;
  }
  closeQuizRunner();
}

async function handleConfirmAbandonQuiz() {
  const modal = document.getElementById("quizAbandonWarningModal");
  if (modal) modal.classList.add("hidden");

  const quiz = state.activeQuiz;
  if (!quiz) {
    closeQuizRunner();
    return;
  }

  if (state.quizTimerInterval) {
    clearInterval(state.quizTimerInterval);
    state.quizTimerInterval = null;
  }

  const totalQuestions = quiz.paper ? quiz.paper.length : 10;
  const maxScore = quiz.asmtMaxScore || 20;
  const learnerId = state.profile?.id || state.user?.id || "lrn-001";
  const existingSubs = (state.submissions || []).filter((s) => s.assessment_id === quiz.asmtId);
  const rankNum = existingSubs.length + 1;

  try {
    await saveAssessmentSubmission({
      assessment_id: quiz.asmtId,
      learner_id: learnerId,
      score: 0,
      max_score: maxScore,
      correct_count: 0,
      incorrect_count: totalQuestions,
      answers: quiz.answers || {},
      submission_rank: rankNum,
      teacher_remarks: `Assessment sitting terminated early by learner. Graded as FAILED (0.0/${maxScore}) with penalty applied for abandoning test sitting.`,
    });

    state.submissions = await fetchLearnerSubmissions(learnerId);
  } catch (err) {
    console.error("Failed to record failed assessment:", err);
  }

  // Switch to result screen showing Failed (0 Marks)
  if (quizActiveBody) quizActiveBody.classList.add("hidden");
  if (quizActiveFooter) quizActiveFooter.classList.add("hidden");
  if (quizResultScreen) quizResultScreen.classList.remove("hidden");

  if (quizResultScore) quizResultScore.textContent = "0.0";
  if (quizResultMax) quizResultMax.textContent = `/ ${maxScore}`;
  if (quizResultPct) quizResultPct.textContent = "0.0%";
  if (quizCorrectCount) quizCorrectCount.textContent = "0";
  if (quizIncorrectCount) quizIncorrectCount.textContent = `${totalQuestions}`;
  if (quizResultRankText) quizResultRankText.textContent = `Turn-in Order: ${getOrdinalSuffix(rankNum)} (Terminated sitting)`;

  if (quizResultGradeBadge) {
    quizResultGradeBadge.className = "px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300";
    quizResultGradeBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i> Grade: F9 (Fail / Sitting Abandoned)`;
  }

  updateKpiMetrics();
  renderAssessmentCards();

  showPushToast(
    "Assessment Sitting Terminated",
    "Test was closed before completion. Graded as FAILED (0 Marks / F9) and recorded on your academic profile.",
    "error"
  );
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
        <td colspan="7" class="py-8 text-center text-slate-400">
          No assessment items configured.
        </td>
      </tr>
    `;
    return;
  }

  adminAsmtTableBody.innerHTML = asmts.map((asmt) => {
    const isScheduled = asmt.unlock_time && new Date(asmt.unlock_time) > new Date();
    const formattedUnlock = asmt.unlock_time ? new Date(asmt.unlock_time).toISOString().slice(0, 16) : "";
    const isExpired = asmt.deadline && new Date(asmt.deadline) < new Date();
    const formattedDeadline = asmt.deadline ? new Date(asmt.deadline).toISOString().slice(0, 16) : "";
    const duration = asmt.time_limit_minutes || 15;

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
        <td class="py-3.5 px-2">
          <div class="flex items-center gap-1">
            <input
              type="number"
              min="5"
              max="180"
              step="5"
              class="asmt-duration-input w-16 bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-xs font-bold text-slate-800 text-center focus:ring-2 focus:ring-indigo-500"
              value="${duration}"
              data-asmt-id="${asmt.id}"
            />
            <span class="text-slate-400 font-semibold text-[11px]">m</span>
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
              <span class="text-[10px] text-slate-400 w-11 shrink-0">Opens:</span>
              <input
                type="datetime-local"
                class="asmt-unlock-input bg-white border border-slate-200 rounded-lg py-0.5 px-1.5 text-[10px] text-slate-700 focus:ring-2 focus:ring-indigo-500"
                value="${formattedUnlock}"
                data-asmt-id="${asmt.id}"
              />
            </div>
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-slate-400 w-11 shrink-0">Expires:</span>
              <input
                type="datetime-local"
                class="asmt-deadline-input bg-white border border-slate-200 rounded-lg py-0.5 px-1.5 text-[10px] text-slate-700 focus:ring-2 focus:ring-indigo-500"
                value="${formattedDeadline}"
                data-asmt-id="${asmt.id}"
              />
            </div>
            ${isExpired ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"><i class="fa-solid fa-hourglass-end"></i> Validity Expired</span>` : isScheduled ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"><i class="fa-solid fa-clock"></i> Countdown Live</span>` : ''}
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

      const weightVal = parseFloat((row.querySelector(".asmt-weight-input") as HTMLInputElement)?.value) || 20;
      const durationVal = parseInt((row.querySelector(".asmt-duration-input") as HTMLInputElement)?.value, 10) || 15;
      const statusVal = (row.querySelector(".asmt-status-select") as HTMLSelectElement)?.value || "AVAILABLE";
      const unlockVal = (row.querySelector(".asmt-unlock-input") as HTMLInputElement)?.value;
      const unlockTime = unlockVal ? new Date(unlockVal).toISOString() : null;
      const deadlineVal = (row.querySelector(".asmt-deadline-input") as HTMLInputElement)?.value;
      const deadlineTime = deadlineVal ? new Date(deadlineVal).toISOString() : null;

      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i>`;

      const existingAsmt = (state.assessments || []).find((a) => a.id === asmtId);
      const wasClosed = existingAsmt && existingAsmt.status !== "AVAILABLE";

      updateAssessmentDuration(asmtId, durationVal);

      await updateAssessment(asmtId, {
        weight: weightVal,
        time_limit_minutes: durationVal,
        status: statusVal,
        unlock_time: unlockTime,
        deadline: deadlineTime,
        due_date: deadlineTime,
      });

      if (statusVal === "AVAILABLE" && wasClosed && asmtId) {
        notifyAssessmentActivated(asmtId);
      }

      state.assessments = await fetchAssessments();
      renderAdminAssessmentConfigTable();
      renderAdminAssessmentConfigTable2();
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
      renderAdminAssessmentConfigTable2();
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
  const duration = parseInt(newAsmtDuration?.value, 10) || 15;
  const status = newAsmtStatus?.value || "CLOSED";
  const unlockVal = newAsmtUnlockTime?.value;
  const unlockTime = unlockVal ? new Date(unlockVal).toISOString() : null;
  const deadlineVal = newAsmtDeadline?.value;
  const deadlineTime = deadlineVal ? new Date(deadlineVal).toISOString() : null;

  const createdAsmt = await createAssessment({
    title,
    subject,
    class_level: classLevel,
    assessment_type: type,
    max_score: 20,
    weight,
    time_limit_minutes: duration,
    status,
    unlock_time: unlockTime,
    deadline: deadlineTime,
    due_date: deadlineTime,
    description: `Official ${subject} assessment item for ${classLevel}.`,
  });

  // Auto-generate 10 curriculum-aligned test items and register question pack
  if (createdAsmt && createdAsmt.id) {
    const dynamicPack = generateDynamicTestItems(title, subject, classLevel);
    dynamicPack.time_limit_minutes = duration;
    ALL_OFFICIAL_QUESTION_PACKS[createdAsmt.id] = dynamicPack;
    updateAssessmentDuration(createdAsmt.id, duration);
    if (status === "AVAILABLE") {
      notifyAssessmentActivated(createdAsmt.id);
    }
  }

  addNewAssessmentForm.reset();
  if (newAsmtStatus) newAsmtStatus.value = "CLOSED";
  if (newAsmtWeight) newAsmtWeight.value = "20";
  if (newAsmtDuration) newAsmtDuration.value = "15";

  state.assessments = await fetchAssessments();
  renderAdminAssessmentConfigTable();
  renderAdminAssessmentConfigTable2();
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
    updateActiveTestBanner();
    document.getElementById("mainHeader")?.classList.remove("hidden");
    document.getElementById("mainFooter")?.classList.remove("hidden");

    adminGatekeeperSection?.classList.add("hidden");
    adminGatekeeperSection?.classList.remove("flex");
    authSection?.classList.add("hidden");
    dashboardSection?.classList.add("hidden");
    adminDashboardSection?.classList.remove("hidden");
    floatingChatContainer?.classList.remove("hidden");

    // Render Admin KPI & Learners Table Skeletons while fetching
    renderAdminKpiSkeletons();

    // Fetch latest live data from database immediately upon entering admin route
    const [asmts, learners, subs, notifs] = await Promise.all([
      fetchAssessments(),
      fetchAllLearners(),
      fetchAllSubmissions(),
      fetchNotifications(),
      new Promise((resolve) => setTimeout(resolve, 400)),
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
    } else if (path.includes("/admin/recordings")) {
      showAdminSubview("recordings");
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

  updateActiveTestBanner();
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
    { key: "recordings", el: adminTabRecordings, view: adminSubViewRecordings },
  ];

  tabs.forEach((t) => {
    if (t.key === subviewKey) {
      t.el?.classList.remove("text-slate-600", "hover:text-slate-900", "hover:bg-slate-100");
      t.el?.classList.add("text-white", "bg-slate-900", "border-slate-800");
      t.view?.classList.remove("hidden");
      try {
        t.el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      } catch (e) {}
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
  } else if (subviewKey === "recordings") {
    renderAdminCallRecordings();
  } else if (subviewKey === "overview") {
    renderAdminOverviewStats();
    renderAdminLearnersTable();
  }
}

async function authenticateAsAdminEmail() {
  showAuthLoaderSigningIn("Signing in....", "Authenticating Master Debrah (Admin)...");
  await new Promise((resolve) => setTimeout(resolve, 450));

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

  showAuthLoaderSuccess("Successfully signed in", "Welcome Master Debrah! Opening Admin Console...");
  await new Promise((resolve) => setTimeout(resolve, 850));
  hideAuthLoader();

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
      if (adminLiveUsersBadge) adminLiveUsersBadge.textContent = String(onlineCount);
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

  if (adminLiveUsersBadge) adminLiveUsersBadge.textContent = String(onlineCount);
  if (kpiOnlineCount) kpiOnlineCount.textContent = String(onlineCount);
  if (kpiOnlineSubtext) {
    kpiOnlineSubtext.innerHTML = `<i class="fa-solid fa-circle-check text-[10px]"></i> ${onlineCount} active online`;
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
  const searchQuery = (state.questionSearchQuery || "").trim().toLowerCase();

  // 1. Strict deduplication: Each assessment appears exactly once
  const uniqueAsmts: any[] = [];
  const seenKeys = new Set<string>();
  for (const a of state.assessments || []) {
    if (a.subject === "Mathematics") continue;
    const key = `${(a.title || "").trim().toLowerCase()}___${(a.class_level || "").trim().toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueAsmts.push(a);
    }
  }

  // 2. Dynamic Category Tab Badges
  const countAll = uniqueAsmts.length;
  const countCAT = uniqueAsmts.filter((a) => (a.assessment_type || "").toUpperCase().includes("CAT") || (a.title || "").toUpperCase().includes("CAT")).length;
  const countQuiz = uniqueAsmts.filter((a) => (a.assessment_type || "").toUpperCase().includes("QUIZ") || (a.title || "").toUpperCase().includes("QUIZ")).length;
  const countProject = uniqueAsmts.filter((a) => (a.assessment_type || "").toUpperCase().includes("PROJECT") || (a.title || "").toUpperCase().includes("PROJECT")).length;
  const countExam = uniqueAsmts.filter((a) => (a.assessment_type || "").toUpperCase().includes("EXAM") || (a.title || "").toUpperCase().includes("EXAM")).length;

  if (catCountAll) catCountAll.textContent = `${countAll}`;
  if (catCountCAT) catCountCAT.textContent = `${countCAT}`;
  if (catCountQuiz) catCountQuiz.textContent = `${countQuiz}`;
  if (catCountProject) catCountProject.textContent = `${countProject}`;
  if (catCountExam) catCountExam.textContent = `${countExam}`;

  // 3. Filter by Category & Track
  const matchingAsmts = uniqueAsmts.filter((a) => {
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

  // 4. Ensure a valid active sitting is selected (defaults to the first matching assessment tab)
  if (!state.questionSittingFilter || (state.questionSittingFilter !== "ALL" && !matchingAsmts.some((a) => a.id === state.questionSittingFilter))) {
    state.questionSittingFilter = matchingAsmts[0] ? matchingAsmts[0].id : "ALL";
  }

  // 5. Render Question Sittings Tabs Rail
  if (questionSittingsTabsRail) {
    if (matchingAsmts.length === 0) {
      questionSittingsTabsRail.innerHTML = `<span class="text-xs text-slate-400 py-1 px-2 italic">No question sets match the current filter.</span>`;
    } else {
      const activeFilter = state.questionSittingFilter;
      const tabsHtml = matchingAsmts.map((asmt) => {
        const pack = getAssessmentQuestionPack(asmt.id, asmt.class_level || "Basic 9A", asmt.title);
        const qCount = pack?.questions?.length || (Array.isArray(pack) ? pack.length : 0);
        const isSelected = activeFilter === asmt.id;
        const isAvailable = asmt.status === "AVAILABLE";

        return `
          <button
            type="button"
            class="question-sitting-tab group px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              isSelected
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }"
            data-sitting-id="${asmt.id}"
            title="Switch to ${escapeHtml(asmt.title)}"
          >
            <span class="w-2 h-2 rounded-full shrink-0 ${isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}"></span>
            <span class="whitespace-nowrap">${escapeHtml(asmt.title)}</span>
            <span class="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 ${
              isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-700'
            }">
              ${qCount} Qs
            </span>
          </button>
        `;
      }).join("");

      const isAllSelected = activeFilter === "ALL";
      const allTabHtml = `
        <button
          type="button"
          class="question-sitting-tab px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            isAllSelected
              ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-800/30'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }"
          data-sitting-id="ALL"
          title="View all sets stacked together"
        >
          <i class="fa-solid fa-layer-group text-[11px]"></i>
          <span>All Sets (${matchingAsmts.length})</span>
        </button>
      `;

      questionSittingsTabsRail.innerHTML = tabsHtml + allTabHtml;

      questionSittingsTabsRail.querySelectorAll(".question-sitting-tab").forEach((btn) => {
        btn.addEventListener("click", () => {
          const sittingId = btn.getAttribute("data-sitting-id") || "ALL";
          state.questionSittingFilter = sittingId;
          if (questionSittingSelect) {
            questionSittingSelect.value = sittingId;
          }
          renderQuestionsConfigView();
          btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        });
      });
    }
  }

  // 6. Update Active Sitting Label & Focus Sitting Dropdown
  if (questionActiveSittingLabel) {
    if (state.questionSittingFilter === "ALL") {
      questionActiveSittingLabel.textContent = `Showing all ${matchingAsmts.length} assessment sets`;
    } else {
      const activeAsmt = matchingAsmts.find((a) => a.id === state.questionSittingFilter) || matchingAsmts[0];
      if (activeAsmt) {
        const pack = getAssessmentQuestionPack(activeAsmt.id, activeAsmt.class_level || "Basic 9A", activeAsmt.title);
        const qCount = pack?.questions?.length || (Array.isArray(pack) ? pack.length : 0);
        questionActiveSittingLabel.textContent = `Active Set: ${activeAsmt.title} (${qCount} Questions)`;
      } else {
        questionActiveSittingLabel.textContent = "";
      }
    }
  }

  if (questionSittingSelect) {
    const currentVal = state.questionSittingFilter || "ALL";
    const optionsHtml = [
      ...matchingAsmts.map((asmt) => {
        const pack = getAssessmentQuestionPack(asmt.id, asmt.class_level || "Basic 9A", asmt.title);
        const qCount = pack?.questions?.length || (Array.isArray(pack) ? pack.length : 0);
        const isSel = currentVal === asmt.id ? "selected" : "";
        return `<option value="${asmt.id}" ${isSel}>${escapeHtml(asmt.title)} (${qCount} Qs)</option>`;
      }),
      `<option value="ALL" ${currentVal === "ALL" ? "selected" : ""}>All Sittings Stacked (${matchingAsmts.length})</option>`,
    ].join("");
    questionSittingSelect.innerHTML = optionsHtml;
  }

  // 7. Update Expand/Collapse Toggle Button Text
  if (toggleExpandAllQuestionsBtnText) {
    toggleExpandAllQuestionsBtnText.textContent = state.questionsCollapsedAll ? "Expand Questions" : "Collapse Questions";
  }

  // 8. Handle Empty State
  if (matchingAsmts.length === 0) {
    adminQuestionSittingsContainer.innerHTML = `
      <div class="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
        <i class="fa-solid fa-list-check text-4xl mb-3 text-indigo-400 block"></i>
        <h3 class="text-base font-bold text-slate-700">No assessment test items match current filters</h3>
        <p class="text-xs text-slate-400 mt-1">Select "All Items" or "All Tracks" to view all Computing assessment question sets.</p>
      </div>
    `;
    return;
  }

  // 9. Determine which sittings to display (Single active tab vs All)
  let displayAsmts = matchingAsmts;
  if (state.questionSittingFilter && state.questionSittingFilter !== "ALL") {
    const selected = matchingAsmts.find((a) => a.id === state.questionSittingFilter);
    if (selected) {
      displayAsmts = [selected];
    } else {
      displayAsmts = matchingAsmts[0] ? [matchingAsmts[0]] : [];
      state.questionSittingFilter = matchingAsmts[0]?.id || "ALL";
    }
  }

  adminQuestionSittingsContainer.innerHTML = displayAsmts.map((asmt) => {
    const pack = getAssessmentQuestionPack(asmt.id, asmt.class_level || "Basic 9A", asmt.title);
    let questions = pack?.questions || (Array.isArray(pack) ? pack : []);
    const totalQuestionsCount = questions.length;

    // Filter questions by real-time search query if active
    if (searchQuery) {
      questions = questions.filter((q: any) => {
        const prompt = (q.prompt || "").toLowerCase();
        const topic = (q.topic || "").toLowerCase();
        const options = (q.options || []).join(" ").toLowerCase();
        const expl = (q.explanation || "").toLowerCase();
        return prompt.includes(searchQuery) || topic.includes(searchQuery) || options.includes(searchQuery) || expl.includes(searchQuery);
      });
    }

    const duration = pack?.time_limit_minutes || asmt.time_limit_minutes || 15;
    const isActive = asmt.status === "AVAILABLE";
    const statusColor = isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200";
    const statusIcon = isActive ? "fa-solid fa-circle-check text-emerald-500" : "fa-solid fa-lock text-slate-400";
    const statusText = isActive ? "Active & Open" : "Inactive / Turned Off";

    const dueDateStr = asmt.deadline || asmt.due_date ? formatDateOnly(asmt.deadline || asmt.due_date) : "Open-ended";

    let typeColor = "bg-indigo-100 text-indigo-800 border-indigo-200";
    let typeIcon = "fa-clipboard-check";
    if (asmt.assessment_type === "EXAM") {
      typeColor = "bg-purple-100 text-purple-800 border-purple-200";
      typeIcon = "fa-graduation-cap";
    } else if (asmt.assessment_type === "QUIZ") {
      typeColor = "bg-amber-100 text-amber-800 border-amber-200";
      typeIcon = "fa-bolt";
    } else if (asmt.assessment_type === "PROJECT_WORK") {
      typeColor = "bg-sky-100 text-sky-800 border-sky-200";
      typeIcon = "fa-diagram-project";
    }

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
              ${searchQuery ? `<strong class="text-indigo-600">${questions.length} of ${totalQuestionsCount}</strong> items match search • ` : `${totalQuestionsCount} Question items configured • `}Max Score: ${asmt.max_score || 20} Marks • Deadline: <strong class="text-slate-700">${dueDateStr}</strong>
            </p>
          </div>

          <!-- Controls: Sitting Duration, On/Off, Extend Period, Add Question (Mobile-Optimized Grid & Flex) -->
          <div class="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 w-full lg:w-auto mt-3 lg:mt-0">
            <!-- Sitting Duration Controller -->
            <div class="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-start gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <div class="flex items-center gap-1.5">
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
              </div>
              <button
                type="button"
                class="save-duration-btn ml-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                data-asmt-id="${asmt.id}"
                title="Save sitting duration"
              >
                Save
              </button>
            </div>

            <!-- Active / Inactive Toggle (Turn Off / On) -->
            <button
              type="button"
              class="toggle-status-btn inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-2xs ${
                isActive
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
              }"
              data-asmt-id="${asmt.id}"
              data-current-status="${asmt.status}"
              title="${isActive ? 'Turn off assessment (Learners will not be able to start)' : 'Turn on assessment (Make available to learners)'}"
            >
              <i class="fa-solid ${isActive ? 'fa-toggle-on text-rose-600' : 'fa-toggle-off text-emerald-600'}"></i>
              <span>${isActive ? 'Turn Off' : 'Turn On'}</span>
            </button>

            <!-- Extend Period Button -->
            <button
              type="button"
              class="open-extend-modal-btn inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 shadow-2xs transition cursor-pointer"
              data-asmt-id="${asmt.id}"
              data-asmt-title="${escapeHtml(asmt.title)}"
              data-due-date="${asmt.deadline || asmt.due_date || ''}"
              title="Extend deadline period for this assessment"
            >
              <i class="fa-solid fa-clock-rotate-left text-amber-600"></i>
              <span>Extend</span>
            </button>

            <!-- Add Question to this specific sitting -->
            <button
              type="button"
              class="add-question-to-asmt-btn col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-2xs transition cursor-pointer"
              data-asmt-id="${asmt.id}"
            >
              <i class="fa-solid fa-plus text-indigo-400"></i>
              <span>Add Question</span>
            </button>
          </div>
        </div>

        <!-- Quick Question Jump Navigation Bar (Horizontal Touch Rail) -->
        ${questions.length > 0 ? `
          <div class="px-3.5 sm:px-6 py-2.5 bg-indigo-50/40 border-b border-slate-200/80 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar touch-pan-x">
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <i class="fa-solid fa-crosshairs text-indigo-500"></i> Jump:
              </span>
              ${questions.map((q, idx) => `
                <button
                  type="button"
                  class="q-jump-btn px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-indigo-600 hover:text-white border border-indigo-100 text-slate-700 transition cursor-pointer shadow-2xs shrink-0"
                  data-target-qid="q-card-${asmt.id}-${q.id}"
                  title="Scroll directly to Question ${idx + 1}"
                >
                  Q${idx + 1}
                </button>
              `).join("")}
            </div>
            <div class="text-[11px] text-slate-500 font-medium shrink-0 hidden sm:block">
              Showing <strong class="text-slate-800">${questions.length}</strong> configured items
            </div>
          </div>
        ` : ''}

        <!-- Questions List Body -->
        <div class="p-3.5 sm:p-6 space-y-3">
          ${questions.length === 0 ? `
            <div class="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              <i class="fa-solid fa-folder-open text-2xl mb-1 block"></i>
              ${searchQuery ? `No questions in this sitting match "${escapeHtml(searchQuery)}".` : 'No questions configured yet for this sitting. Click "Add Question" to begin.'}
            </div>
          ` : questions.map((q, qIdx) => {
            const optionLetters = ["A", "B", "C", "D", "E"];
            const qKey = `${asmt.id}_${q.id}`;
            const isQCollapsed = state.questionsCollapsedAll || state.collapsedQuestionKeys.has(qKey);

            if (isQCollapsed) {
              return `
                <div class="p-3 sm:p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 shadow-2xs hover:border-indigo-200 transition-all cursor-pointer group space-y-1.5" id="q-card-${asmt.id}-${q.id}">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                        Q${qIdx + 1}
                      </span>
                      <span class="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">${escapeHtml(q.topic || asmt.subject || "Computing")}</span>
                      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">${q.points || 2} M</span>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        class="edit-question-btn p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        data-asmt-id="${asmt.id}"
                        data-q-id="${q.id}"
                        title="Edit question"
                      >
                        <i class="fa-solid fa-pen-to-square text-xs"></i>
                      </button>
                      <button
                        type="button"
                        class="delete-question-btn p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        data-asmt-id="${asmt.id}"
                        data-q-id="${q.id}"
                        title="Delete question"
                      >
                        <i class="fa-solid fa-trash text-xs"></i>
                      </button>
                      <button
                        type="button"
                        class="toggle-q-expand-btn px-2 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer inline-flex items-center gap-1"
                        data-asmt-id="${asmt.id}"
                        data-q-id="${q.id}"
                        title="Expand question details"
                      >
                        <span>Options</span>
                        <i class="fa-solid fa-chevron-down text-[10px]"></i>
                      </button>
                    </div>
                  </div>
                  <div class="text-xs font-semibold text-slate-800 line-clamp-2 select-text leading-snug pl-0.5">
                    ${escapeHtml(q.prompt)}
                  </div>
                </div>
              `;
            }

            return `
              <div class="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3 hover:border-slate-300 transition-all" id="q-card-${asmt.id}-${q.id}">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      Q${qIdx + 1}
                    </span>
                    <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">${escapeHtml(q.topic || asmt.subject || "Computing")}</span>
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">${q.points || 2} Marks</span>
                  </div>

                  <!-- Edit / Delete / Collapse actions -->
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
                    <button
                      type="button"
                      class="toggle-q-expand-btn p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      data-asmt-id="${asmt.id}"
                      data-q-id="${q.id}"
                      title="Collapse this question"
                    >
                      <i class="fa-solid fa-chevron-up text-xs"></i>
                    </button>
                  </div>
                </div>

                <p class="text-sm font-semibold text-slate-900 leading-relaxed select-text">
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

  // Jump to Question Smooth Scroll
  container.querySelectorAll(".q-jump-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target-qid");
      if (!targetId) return;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
        targetEl.classList.add("ring-2", "ring-indigo-400");
        setTimeout(() => targetEl.classList.remove("ring-2", "ring-indigo-400"), 1800);
      }
    });
  });

  // Toggle individual question collapse / expand
  container.querySelectorAll(".toggle-q-expand-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const asmtId = btn.getAttribute("data-asmt-id");
      const qId = btn.getAttribute("data-q-id");
      if (!asmtId || !qId) return;
      const key = `${asmtId}_${qId}`;
      if (state.questionsCollapsedAll) {
        state.questionsCollapsedAll = false;
      }
      if (state.collapsedQuestionKeys.has(key)) {
        state.collapsedQuestionKeys.delete(key);
      } else {
        state.collapsedQuestionKeys.add(key);
      }
      renderQuestionsConfigView();
    });
  });

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
      if (nextStatus === "AVAILABLE" && asmtId) {
        notifyAssessmentActivated(asmtId);
      }
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

  const mobileCardsContainer = document.getElementById("adminAsmtCardsMobile");

  if (asmts.length === 0) {
    adminAsmtTableBody2.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No assessments found.</td></tr>`;
    if (mobileCardsContainer) {
      mobileCardsContainer.innerHTML = `<div class="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">No assessments found.</div>`;
    }
    return;
  }

  // Desktop Table Rows
  adminAsmtTableBody2.innerHTML = asmts.map((asmt) => {
    const isActive = asmt.status === "AVAILABLE";
    const duration = asmt.time_limit_minutes || 15;
    const dueDateStr = asmt.deadline || asmt.due_date ? formatDateOnly(asmt.deadline || asmt.due_date) : "Open-ended";

    return `
      <tr class="hover:bg-slate-50/80 transition-colors" data-asmt-row2="${asmt.id}">
        <td class="py-3 px-3">
          <div class="font-bold text-slate-900">${escapeHtml(asmt.title)}</div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">${escapeHtml(asmt.class_level || "Basic 9")}</span>
            <span class="text-[11px] text-slate-500 whitespace-nowrap">${escapeHtml(asmt.subject || "Computing")}</span>
          </div>
        </td>
        <td class="py-3 px-2">
          <span class="font-semibold text-slate-700 whitespace-nowrap">${escapeHtml(asmt.assessment_type || "CAT")}</span>
        </td>
        <td class="py-3 px-2">
          <div class="flex items-center gap-1">
            <input
              type="number"
              min="5"
              max="180"
              step="5"
              value="${duration}"
              class="asmt-duration-input2 w-14 bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 text-xs font-bold text-slate-800 text-center focus:ring-2 focus:ring-indigo-500 shadow-2xs"
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
              class="asmt-weight-input2 w-14 bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 text-xs font-bold text-slate-800 text-center focus:ring-2 focus:ring-indigo-500 shadow-2xs"
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
        <td class="py-3 px-2 font-mono font-bold text-slate-700 whitespace-nowrap">${asmt.max_score || 20}</td>
        <td class="py-3 px-3">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-1.5">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }">
                <i class="fa-solid ${isActive ? 'fa-circle-check text-emerald-600' : 'fa-lock text-slate-400'}"></i> ${isActive ? 'Active' : 'Closed'}
              </span>
              <button
                type="button"
                class="toggle-status-btn2 text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
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
            <div class="flex items-center gap-1.5 text-[11px] text-slate-500 whitespace-nowrap">
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
          <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
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

  // Mobile Assessment Cards (Touch-Optimized for Handhelds)
  if (mobileCardsContainer) {
    mobileCardsContainer.innerHTML = asmts.map((asmt) => {
      const isActive = asmt.status === "AVAILABLE";
      const duration = asmt.time_limit_minutes || 15;
      const dueDateStr = asmt.deadline || asmt.due_date ? formatDateOnly(asmt.deadline || asmt.due_date) : "Open-ended";

      return `
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 space-y-3.5" data-asmt-row2="${asmt.id}">
          <!-- Top: Title, Badges, Status & Toggle -->
          <div class="flex items-start justify-between gap-2.5">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-sm text-slate-900 leading-snug">${escapeHtml(asmt.title)}</div>
              <div class="flex flex-wrap items-center gap-1.5 mt-1">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">${escapeHtml(asmt.class_level || "Basic 9")}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">${escapeHtml(asmt.assessment_type || "CAT")}</span>
                <span class="text-[11px] text-slate-400">• ${asmt.max_score || 20} Marks</span>
              </div>
            </div>
            <!-- Status Badge & Quick Toggle -->
            <div class="flex flex-col items-end gap-1 shrink-0">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isActive
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }">
                <i class="fa-solid ${isActive ? 'fa-circle-check text-emerald-600' : 'fa-lock text-slate-400'}"></i> ${isActive ? 'Active' : 'Closed'}
              </span>
              <button
                type="button"
                class="toggle-status-btn2 text-[10px] font-bold px-2.5 py-1 rounded-lg border shadow-2xs ${
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
          </div>

          <!-- Duration & Weight Calibration Row -->
          <div class="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
            <!-- Duration Input -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Duration</label>
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  min="5"
                  max="180"
                  step="5"
                  value="${duration}"
                  class="asmt-duration-input2 w-14 bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-xs font-bold text-slate-800 text-center focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  data-asmt-id="${asmt.id}"
                />
                <span class="text-slate-400 font-semibold text-[11px]">min</span>
                <button
                  type="button"
                  class="save-duration-btn2 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                  data-asmt-id="${asmt.id}"
                >
                  Save
                </button>
              </div>
            </div>

            <!-- Weight Input -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Term Weight</label>
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value="${parseFloat(asmt.weight) || 20}"
                  class="asmt-weight-input2 w-14 bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-xs font-bold text-slate-800 text-center focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  data-asmt-id="${asmt.id}"
                />
                <span class="text-slate-400 font-semibold text-[11px]">%</span>
                <button
                  type="button"
                  class="save-weight-btn2 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
                  data-asmt-id="${asmt.id}"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          <!-- Bottom: Due Date & Action Buttons -->
          <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
            <div class="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>Due: ${dueDateStr}</span>
              <button
                type="button"
                class="open-extend-modal-btn2 text-amber-600 hover:text-amber-800 font-bold cursor-pointer text-[11px]"
                data-asmt-id="${asmt.id}"
                title="Extend Deadline"
              >
                <i class="fa-solid fa-clock-rotate-left"></i> Extend
              </button>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
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
          </div>
        </div>
      `;
    }).join("");
  }

  attachAdminAsmtTable2Handlers();
}

function attachAdminAsmtTable2Handlers() {
  const containers = [
    adminAsmtTableBody2,
    document.getElementById("adminAsmtCardsMobile"),
  ].filter(Boolean);

  containers.forEach((container) => {
    // Save Duration
    container.querySelectorAll(".save-duration-btn2").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const asmtId = btn.getAttribute("data-asmt-id");
        const row = btn.closest("[data-asmt-row2]");
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
    container.querySelectorAll(".save-weight-btn2").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const asmtId = btn.getAttribute("data-asmt-id");
        const row = btn.closest("[data-asmt-row2]");
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
    container.querySelectorAll(".toggle-status-btn2").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const asmtId = btn.getAttribute("data-asmt-id");
        const current = btn.getAttribute("data-current");
        const nextStatus = current === "AVAILABLE" ? "CLOSED" : "AVAILABLE";
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i>`;
        await updateAssessment(asmtId, { status: nextStatus });
        const asmt = (state.assessments || []).find((a) => a.id === asmtId);
        if (asmt) asmt.status = nextStatus;
        if (nextStatus === "AVAILABLE" && asmtId) {
          notifyAssessmentActivated(asmtId);
        }
        renderAdminAssessmentConfigTable2();
        renderAssessmentCards();
      });
    });

    // Extend Period
    container.querySelectorAll(".open-extend-modal-btn2").forEach((btn) => {
      btn.addEventListener("click", () => {
        const asmtId = btn.getAttribute("data-asmt-id");
        openExtendPeriodModal(asmtId);
      });
    });

    // Nav to questions
    container.querySelectorAll(".asmt-nav-questions-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const asmtId = btn.getAttribute("data-asmt-id");
        if (asmtId) {
          state.questionSittingFilter = asmtId;
        }
        navigateTo("/admin/questions");
      });
    });

    // Open key
    container.querySelectorAll(".asmt-open-key-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const asmtId = btn.getAttribute("data-asmt-id");
        openAnswerKeyModal(asmtId);
      });
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
// Multi-Channel Assessment Activation & Retake Authorization Engine
// (In-App Notifications, Student Email Broadcast & Web Push Notifications)
// ------------------------------------------------------------------------------
let toastTimer: any = null;

function displayPremiumToast({
  title,
  message,
  badgeText = "Ghana Education Service",
  badgeColor = "indigo",
  icon = "fa-bell",
  iconGradient = "from-indigo-500 to-violet-600 shadow-indigo-500/30",
  timestamp,
  channels = [],
  url,
  durationMs = 6500,
}: {
  title: string;
  message: string;
  badgeText?: string;
  badgeColor?: "indigo" | "emerald" | "amber" | "sky" | "rose" | "violet";
  icon?: string;
  iconGradient?: string;
  timestamp?: string;
  channels?: Array<{ name: string; icon: string }>;
  url?: string;
  durationMs?: number;
}) {
  const toast = document.getElementById("pushNotificationToast");
  const titleEl = document.getElementById("pushToastTitle");
  const bodyEl = document.getElementById("pushToastBody");
  const timeEl = document.getElementById("pushToastTime");
  const badgeEl = document.getElementById("pushToastBadge");
  const iconWrapper = document.getElementById("pushToastIconWrapper");
  const iconEl = document.getElementById("pushToastIcon");
  const progressBar = document.getElementById("pushToastProgressBar");
  if (!toast) return;

  if (toastTimer) clearTimeout(toastTimer);

  if (titleEl) titleEl.textContent = title;

  let channelsHtml = "";
  if (channels && channels.length > 0) {
    channelsHtml = `
      <div class="flex flex-wrap items-center gap-1.5 pt-1.5">
        ${channels
          .map(
            (c) => `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/10 text-slate-200 border border-white/10">
            <i class="fa-solid ${c.icon} text-[9px] text-amber-300"></i> ${c.name}
          </span>
        `
          )
          .join("")}
      </div>
    `;
  }

  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="leading-relaxed text-slate-200">${message}</div>
      ${channelsHtml}
    `;
  }

  if (timeEl) {
    timeEl.textContent =
      timestamp ||
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (badgeEl) {
    badgeEl.textContent = badgeText;
    const badgeColors: Record<string, string> = {
      emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
      amber: "bg-amber-500/20 text-amber-300 border-amber-400/30",
      indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30",
      sky: "bg-sky-500/20 text-sky-300 border-sky-400/30",
      violet: "bg-violet-500/20 text-violet-300 border-violet-400/30",
      rose: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    };
    badgeEl.className = `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
      badgeColors[badgeColor] || badgeColors.indigo
    } truncate`;
  }

  if (iconWrapper) {
    iconWrapper.className = `w-9 h-9 rounded-xl bg-gradient-to-br ${iconGradient} text-white flex items-center justify-center shrink-0 text-sm border border-white/20`;
  }
  if (iconEl) {
    iconEl.className = `fa-solid ${icon}`;
  }

  if (progressBar) {
    progressBar.style.transition = "none";
    progressBar.style.width = "100%";
    requestAnimationFrame(() => {
      progressBar.style.transition = `width ${durationMs}ms linear`;
      progressBar.style.width = "0%";
    });
  }

  toast.onclick = (e) => {
    if ((e.target as HTMLElement)?.closest("#closePushToastBtn")) return;
    if (url) navigateTo(url);
    hideToast();
  };

  toast.classList.remove("hidden");
  requestAnimationFrame(() => {
    toast.classList.remove("toast-hidden");
    toast.classList.add("toast-visible");
  });

  function hideToast() {
    toast.classList.remove("toast-visible");
    toast.classList.add("toast-hidden");
    setTimeout(() => {
      if (toast.classList.contains("toast-hidden")) {
        toast.classList.add("hidden");
      }
    }, 400);
  }

  toastTimer = setTimeout(() => {
    hideToast();
  }, durationMs);
}

function showActivationBroadcastToast(
  title: string,
  targetClass: string,
  emailCount: number,
  customMessage?: string
) {
  const isRetake = title.toLowerCase().includes("retake");

  if (isRetake) {
    displayPremiumToast({
      title: title,
      message:
        customMessage ||
        `Retake authorization enabled for <strong>${escapeHtml(targetClass)}</strong>.`,
      badgeText: "Retake Authorized",
      badgeColor: "emerald",
      icon: "fa-rotate-right",
      iconGradient: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
      channels: [
        { name: "In-App Notification", icon: "fa-bell" },
        { name: "Student Email Sent", icon: "fa-envelope" },
        { name: "Web Push Alert", icon: "fa-tower-broadcast" },
      ],
      durationMs: 7000,
    });
  } else {
    displayPremiumToast({
      title: title,
      message:
        customMessage ||
        `Continuous Assessment made active for <strong>${escapeHtml(targetClass)}</strong>.`,
      badgeText: "Live Broadcast",
      badgeColor: "indigo",
      icon: "fa-tower-broadcast",
      iconGradient: "from-indigo-500 to-violet-600 shadow-indigo-500/30",
      channels: [
        { name: "In-App Tray", icon: "fa-bell" },
        { name: `${emailCount} Students Emailed`, icon: "fa-envelope" },
        { name: "Web Push Alert", icon: "fa-tower-broadcast" },
      ],
      durationMs: 7000,
    });
  }
}

async function notifyAssessmentActivated(asmtId: string) {
  const asmt = (state.assessments || []).find((a) => a.id === asmtId);
  if (!asmt) return;

  const targetClass = asmt.class_level || "ALL";
  const title = `🚀 ${asmt.title} is Now LIVE & Active!`;
  const message = `Master Debrah (Admin) has activated ${asmt.title} (${asmt.subject}). You can now log into your learner dashboard and take this continuous assessment task. Time limit: ${asmt.time_limit_minutes || 15} minutes.`;

  // 1. In-App Notification (Saved to DB & LocalStore)
  try {
    await sendNotification({
      title,
      message,
      target_class: targetClass,
      type: "ANNOUNCEMENT",
      sender_name: "Master Debrah (Admin)",
    });
    state.notifications = await fetchNotifications(state.profile?.class_level || "ALL");
    renderNotifications();
  } catch (err) {
    console.warn("In-app notification error on activation:", err);
  }

  // 2. Identify target learners for email dispatch
  const learners = state.allLearners || [];

  const targetLearners = learners.filter((l: any) => {
    if (targetClass !== "ALL" && l.class_level && l.class_level !== targetClass) return false;
    return (l.role || "learner") === "learner";
  });

  let dispatchedEmailCount = 0;
  for (const learner of targetLearners) {
    const studentEmail = learner.email || `${learner.full_name.toLowerCase().replace(/[^a-z]/g, "")}@ghana-edu.gov.gh`;
    await dispatchEmailNotification({
      to: studentEmail,
      recipientName: learner.full_name,
      subject: `🚨 Assessment Activated: ${asmt.title} is Now Open!`,
      heading: `${asmt.title} is Now LIVE`,
      previewText: `Master Debrah has opened ${asmt.title}. Time limit: ${asmt.time_limit_minutes || 15} mins.`,
      bodyHtml: `
        <p>Dear <strong>${escapeHtml(learner.full_name)}</strong>,</p>
        <p>Your continuous assessment task <strong>${escapeHtml(asmt.title)}</strong> (${escapeHtml(asmt.subject)}) for <strong>${escapeHtml(learner.class_level || asmt.class_level || "Basic 9")}</strong> has been officially activated by <strong>Master Debrah (Admin)</strong>.</p>
        <div style="background:#f8fafc;border-left:4px solid #4f46e5;padding:12px;margin:16px 0;border-radius:6px;">
          <p style="margin:0 0 6px 0;"><strong>Track:</strong> ${escapeHtml(asmt.subject)}</p>
          <p style="margin:0 0 6px 0;"><strong>Time Allowed:</strong> ${asmt.time_limit_minutes || 15} minutes</p>
          <p style="margin:0 0 6px 0;"><strong>Total Marks:</strong> ${asmt.max_score || 20} marks</p>
          <p style="margin:0;"><strong>Term Weight:</strong> ${asmt.weight ? parseFloat(asmt.weight) : 20}%</p>
        </div>
        <p>Please log into your learner portal immediately to complete this assessment before the deadline.</p>
      `,
      actionUrl: window.location.origin + "/learner",
      actionText: "Open Portal & Start CAT",
      senderName: "Master Debrah (Admin)",
      senderEmail: PRIMARY_ADMIN_EMAIL,
      meta: { asmtId: asmt.id, classLevel: targetClass }
    });
    dispatchedEmailCount++;
  }

  // 3. Browser Web Push Notification + Audio Chime
  await triggerWebPushNotification(`🚀 Assessment Activated: ${asmt.title}`, {
    body: `The CAT is now active for ${targetClass === "ALL" ? "all students" : targetClass}. Tap to start.`,
    url: "/learner"
  });
  playNotificationChime();

  showActivationBroadcastToast(asmt.title, targetClass, dispatchedEmailCount);
}

function updateRetakeStatusBox(learnerId: string) {
  const asmtSelect = document.getElementById("adminRetakeAsmtSelect") as HTMLSelectElement | null;
  const statusText = document.getElementById("retakeExistingStatusText");
  const scoreBadge = document.getElementById("retakeExistingScoreBadge");
  if (!asmtSelect || !statusText || !scoreBadge) return;

  const asmtId = asmtSelect.value;
  const sub = (state.submissions || []).find((s: any) => s.learner_id === learnerId && s.assessment_id === asmtId);

  if (sub && sub.status === "GRADED") {
    if (sub.retake_granted) {
      statusText.textContent = `Retake already active: Teacher previously authorized a second sitting.`;
      scoreBadge.className = "font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300";
      scoreBadge.textContent = `Retake Pending (${sub.score}/${sub.max_score || 20})`;
    } else {
      statusText.textContent = `Completed sitting recorded on ${formatDateOnly(sub.submitted_at)}. Re-take will grant a fresh attempt.`;
      scoreBadge.className = "font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200";
      scoreBadge.textContent = `Score: ${sub.score} / ${sub.max_score || 20}`;
    }
  } else {
    statusText.textContent = `No completed submission found for this student. Retake authorization will unlock an open attempt.`;
    scoreBadge.className = "font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200";
    scoreBadge.textContent = `Unattempted`;
  }
}

function openGrantRetakeModal(learnerId: string, preselectedAsmtId: string | null = null) {
  const modal = document.getElementById("adminGrantRetakeModal");
  if (!modal) return;

  const learner = (state.allLearners || []).find((l: any) => l.id === learnerId);
  if (!learner) return;

  const idInput = document.getElementById("retakeStudentId") as HTMLInputElement | null;
  const avatarEl = document.getElementById("retakeStudentAvatar") as HTMLImageElement | null;
  const nameEl = document.getElementById("retakeStudentName");
  const classEl = document.getElementById("retakeStudentClass");
  const numberEl = document.getElementById("retakeStudentNumber");
  const emailEl = document.getElementById("retakeStudentEmail");

  if (idInput) idInput.value = learner.id;
  if (avatarEl) avatarEl.src = learner.avatar_url || AVATAR_PRESETS[0];
  if (nameEl) nameEl.textContent = learner.full_name;
  if (classEl) classEl.textContent = learner.class_level || "Basic 9A";
  if (numberEl) numberEl.textContent = learner.student_id || generateStudentId(learner.class_level, 1);
  if (emailEl) emailEl.textContent = learner.email || "student@ghana-edu.gov.gh";

  const asmtSelect = document.getElementById("adminRetakeAsmtSelect") as HTMLSelectElement | null;
  if (asmtSelect) {
    const learnerClass = learner.class_level || "Basic 9A";
    const availableAsmts = (state.assessments || []).filter((a: any) => {
      if (!a.class_level || a.class_level === "ALL") return true;
      return a.class_level === learnerClass;
    });

    asmtSelect.innerHTML = availableAsmts.map((a: any) => {
      const existingSub = (state.submissions || []).find((s: any) => s.learner_id === learner.id && s.assessment_id === a.id);
      const isSelected = preselectedAsmtId ? a.id === preselectedAsmtId : false;
      const statusNote = existingSub
        ? `[Scored: ${existingSub.score}/${a.max_score || 20}]`
        : `[Unattempted]`;
      return `<option value="${a.id}" ${isSelected ? 'selected' : ''}>${escapeHtml(a.title)} ${statusNote}</option>`;
    }).join("");
  }

  updateRetakeStatusBox(learner.id);

  const reasonInput = document.getElementById("adminRetakeReasonInput") as HTMLTextAreaElement | null;
  if (reasonInput) {
    reasonInput.value = `Master Debrah (Admin) authorized retake for student ${learner.full_name} to improve mastery under NaCCA Standards.`;
  }

  modal.classList.remove("hidden");
}

async function handleGrantRetakeSubmit(e: Event) {
  e.preventDefault();
  const idInput = document.getElementById("retakeStudentId") as HTMLInputElement | null;
  const asmtSelect = document.getElementById("adminRetakeAsmtSelect") as HTMLSelectElement | null;
  const reasonInput = document.getElementById("adminRetakeReasonInput") as HTMLTextAreaElement | null;
  const inAppChecked = (document.getElementById("retakeNotifyInApp") as HTMLInputElement | null)?.checked ?? true;
  const emailChecked = (document.getElementById("retakeNotifyEmail") as HTMLInputElement | null)?.checked ?? true;
  const pushChecked = (document.getElementById("retakeNotifyPush") as HTMLInputElement | null)?.checked ?? true;
  const submitBtn = document.getElementById("submitGrantRetakeBtn") as HTMLButtonElement | null;

  const learnerId = idInput?.value;
  const asmtId = asmtSelect?.value;
  const reason = reasonInput?.value || "Teacher authorized retake";

  if (!learnerId || !asmtId) return;

  const learner = (state.allLearners || []).find((l: any) => l.id === learnerId);
  const asmt = (state.assessments || []).find((a: any) => a.id === asmtId);
  if (!learner || !asmt) return;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Authorizing...`;
  }

  try {
    await grantSubmissionRetake(learnerId, asmtId, reason, "Master Debrah (Admin)");
    state.submissions = await fetchAllSubmissions();

    if (inAppChecked) {
      try {
        await sendNotification({
          title: `🔄 Retake Authorized: ${asmt.title}`,
          message: `Master Debrah (Admin) has authorized a re-take for you on ${asmt.title}. Note: "${reason}". You may now retake the assessment directly from your dashboard.`,
          target_class: learner.class_level || "ALL",
          type: "ANNOUNCEMENT",
          sender_name: "Master Debrah (Admin)",
        });
        state.notifications = await fetchNotifications(state.profile?.class_level || "ALL");
        renderNotifications();
      } catch (notifErr) {
        console.warn("In-app retake notification dispatch warning:", notifErr);
      }
    }

    if (emailChecked) {
      try {
        const studentEmail = learner.email || `${learner.full_name.toLowerCase().replace(/[^a-z]/g, "")}@ghana-edu.gov.gh`;
        await dispatchEmailNotification({
          to: studentEmail,
          recipientName: learner.full_name,
          subject: `🔄 Retake Authorized: ${asmt.title} - Ghana JHS Assessment Portal`,
          heading: `Retake Authorized for ${asmt.title}`,
          previewText: `Master Debrah has approved a second sitting for ${asmt.title}.`,
          bodyHtml: `
            <p>Dear <strong>${escapeHtml(learner.full_name)}</strong>,</p>
            <p>Your request / teacher authorization to retake <strong>${escapeHtml(asmt.title)}</strong> (${escapeHtml(asmt.subject)}) has been <strong>approved</strong> by Master Debrah (Admin).</p>
            <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px;margin:16px 0;border-radius:6px;">
              <p style="margin:0 0 6px 0;color:#92400e;"><strong>Reason / Teacher Note:</strong> ${escapeHtml(reason)}</p>
              <p style="margin:0 0 6px 0;"><strong>Time Allowed:</strong> ${asmt.time_limit_minutes || 15} minutes</p>
              <p style="margin:0;"><strong>Maximum Score:</strong> ${asmt.max_score || 20} marks</p>
            </div>
            <p>Log in to your learner portal to begin your re-take sitting. Your new attempt will be recorded upon submission.</p>
          `,
          actionUrl: window.location.origin + "/learner",
          actionText: "Open Portal & Retake CAT",
          senderName: "Master Debrah (Admin)",
          senderEmail: PRIMARY_ADMIN_EMAIL,
          meta: { type: "RETAKE", learnerId, asmtId }
        });
      } catch (emailErr) {
        console.warn("Email retake notification dispatch warning:", emailErr);
      }
    }

    if (pushChecked) {
      try {
        await triggerWebPushNotification(`🔄 Retake Authorized: ${asmt.title}`, {
          body: `Master Debrah authorized a retake for you on ${asmt.title}. Tap to begin.`,
          url: "/learner"
        });
        playNotificationChime();
      } catch (pushErr) {
        console.warn("Push retake notification dispatch warning:", pushErr);
      }
    }

    document.getElementById("adminGrantRetakeModal")?.classList.add("hidden");
    renderAdminLearnersTable();
    if (activeLearnersModal && !activeLearnersModal.classList.contains("hidden")) {
      showActiveLearnerDetail(learnerId);
    }

    showActivationBroadcastToast(
      `Retake Authorized for ${learner.full_name}`,
      learner.class_level || "Student",
      1,
      `Retake unlocked on <strong class="text-white">${escapeHtml(asmt.title)}</strong> (${escapeHtml(asmt.subject || "Computing")}). Student may now retake the assessment directly from their dashboard.`
    );
  } catch (err: any) {
    console.error("Retake authorization error:", err);
    alert("Could not authorize retake: " + (err.message || "Unknown error"));
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> Authorize Retake &amp; Notify`;
    }
  }
}

function openEmailPreviewModal(emailData: any) {
  const modal = document.getElementById("emailPreviewModal");
  const container = document.getElementById("emailPreviewContainer");
  if (!modal || !container) return;

  const to = escapeHtml(emailData.to || "student@ghana-edu.gov.gh");
  const recipient = escapeHtml(emailData.recipientName || "Learner");
  const subject = escapeHtml(emailData.subject || "Continuous Assessment Notification");
  const senderName = escapeHtml(emailData.senderName || "Master Debrah (Admin)");
  const senderEmail = escapeHtml(emailData.senderEmail || PRIMARY_ADMIN_EMAIL);
  const time = emailData.timestamp ? new Date(emailData.timestamp).toLocaleString() : new Date().toLocaleString();
  const bodyHtml = emailData.bodyHtml || `<p>${escapeHtml(emailData.message || emailData.previewText || "")}</p>`;
  const actionUrl = emailData.actionUrl || (window.location.origin + "/learner");
  const actionText = escapeHtml(emailData.actionText || "Open Assessment Portal");

  container.innerHTML = `
    <!-- Email Envelope Meta -->
    <div class="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2 shadow-2xs">
      <div class="flex items-center justify-between text-[11px] pb-2 border-b border-slate-100">
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[10px]">
          <i class="fa-solid fa-circle-check text-emerald-600"></i> DELIVERED VIA GHANA EDU MAIL ENGINE
        </span>
        <span class="text-slate-400 font-mono">${time}</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div>
          <span class="text-slate-400 block text-[10px] font-bold uppercase">From:</span>
          <span class="font-bold text-slate-800">${senderName}</span>
          <span class="text-slate-500 font-mono text-[11px] block">&lt;${senderEmail}&gt;</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[10px] font-bold uppercase">To:</span>
          <span class="font-bold text-slate-800">${recipient}</span>
          <span class="text-slate-500 font-mono text-[11px] block">&lt;${to}&gt;</span>
        </div>
      </div>
      <div class="pt-2 border-t border-slate-100">
        <span class="text-slate-400 block text-[10px] font-bold uppercase">Subject:</span>
        <span class="font-bold text-slate-900 text-xs sm:text-sm">${subject}</span>
      </div>
    </div>

    <!-- Official Ghana Education Service Letterhead Body -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <!-- Ghana Colors Banner -->
      <div class="h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-600"></div>
      <div class="p-4 sm:p-5 space-y-3.5">
        <div class="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            <i class="fa-solid fa-graduation-cap"></i>
          </div>
          <div>
            <h4 class="font-extrabold text-slate-900 text-sm">GHANA EDUCATION SERVICE</h4>
            <p class="text-[11px] text-slate-500 font-medium">JHS Continuous Assessment Portal &bull; Computing Directorate</p>
          </div>
        </div>

        <div class="text-xs text-slate-700 leading-relaxed space-y-2">
          ${bodyHtml}
        </div>

        <div class="pt-3 text-center sm:text-left">
          <a
            href="${actionUrl}"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition cursor-pointer"
          >
            <span>${actionText}</span>
            <i class="fa-solid fa-arrow-right text-[10px]"></i>
          </a>
        </div>

        <div class="pt-4 border-t border-slate-100 text-[11px] text-slate-500">
          <p class="font-bold text-slate-800">Master Debrah</p>
          <p class="text-[10px] text-slate-400">Head of Computing / Administrator &bull; Basic 9</p>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
}

function initEmailAndPushListeners() {
  window.addEventListener("jhs:push-notification", (e: any) => {
    const payload = e.detail;
    if (!payload) return;

    const isTarget = payload.title?.toLowerCase().includes("target") || payload.title?.toLowerCase().includes("milestone");
    const isSuccess = payload.title?.toLowerCase().includes("conquered") || payload.title?.toLowerCase().includes("authorized");

    displayPremiumToast({
      title: payload.title || "Assessment Notification",
      message: payload.body || "A new continuous assessment update has been recorded.",
      badgeText: isTarget ? "AI Milestone Quest" : (isSuccess ? "Milestone Conquered" : "Assessment Alert"),
      badgeColor: isTarget ? "amber" : (isSuccess ? "emerald" : "indigo"),
      icon: isTarget ? "fa-bullseye" : (isSuccess ? "fa-award" : "fa-bell"),
      iconGradient: isTarget
        ? "from-amber-500 to-orange-600 shadow-amber-500/30"
        : (isSuccess ? "from-emerald-500 to-teal-600 shadow-emerald-500/30" : "from-indigo-500 to-violet-600 shadow-indigo-500/30"),
      timestamp: payload.timestamp,
      url: payload.url,
      durationMs: 6500,
    });
  });

  window.addEventListener("jhs:email-dispatched", (e: any) => {
    const email = e.detail;
    console.log("Email dispatch caught in UI listener:", email);
  });

  document.getElementById("closePushToastBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const toast = document.getElementById("pushNotificationToast");
    if (toast) {
      toast.classList.remove("toast-visible");
      toast.classList.add("toast-hidden");
      setTimeout(() => {
        if (toast.classList.contains("toast-hidden")) {
          toast.classList.add("hidden");
        }
      }, 400);
    }
  });

  document.getElementById("closeEmailPreviewModalBtn")?.addEventListener("click", () => {
    document.getElementById("emailPreviewModal")?.classList.add("hidden");
  });
  document.getElementById("closeEmailPreviewModalBtn2")?.addEventListener("click", () => {
    document.getElementById("emailPreviewModal")?.classList.add("hidden");
  });

  document.getElementById("closeGrantRetakeModalBtn")?.addEventListener("click", () => {
    document.getElementById("adminGrantRetakeModal")?.classList.add("hidden");
  });
  document.getElementById("cancelGrantRetakeBtn")?.addEventListener("click", () => {
    document.getElementById("adminGrantRetakeModal")?.classList.add("hidden");
  });
  document.getElementById("adminGrantRetakeForm")?.addEventListener("submit", handleGrantRetakeSubmit);
  document.getElementById("adminRetakeAsmtSelect")?.addEventListener("change", () => {
    const idInput = document.getElementById("retakeStudentId") as HTMLInputElement | null;
    if (idInput?.value) updateRetakeStatusBox(idInput.value);
  });
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

  if (isIdentityOrRegistrationQuestion(promptVal)) {
    alert("Invalid Question: Learners must not be asked to provide their email, full name, class, or student ID. These details are already captured and authenticated by the system.");
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

  if (extendDurationInput) {
    extendDurationInput.value = asmt.time_limit_minutes || 15;
  }

  if (extendUnlockDatetimeInput) {
    extendUnlockDatetimeInput.value = asmt.unlock_time ? new Date(asmt.unlock_time).toISOString().slice(0, 16) : "";
  }

  // Pre-set custom datetime input to current deadline or 24 hours from now
  const defaultExtend = currentDue
    ? new Date(currentDue).toISOString().slice(0, 16)
    : new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16);
  if (extendCustomDatetimeInput) {
    extendCustomDatetimeInput.value = defaultExtend;
  }

  extendPeriodModal.classList.remove("hidden");
}

async function handleSaveExtendPeriod() {
  const asmtId = extendModalAsmtId?.value;
  if (!asmtId) return;

  const customVal = extendCustomDatetimeInput?.value;
  const unlockVal = extendUnlockDatetimeInput?.value;
  const durationVal = parseInt(extendDurationInput?.value, 10) || 15;

  const newDeadlineIso = customVal ? new Date(customVal).toISOString() : null;
  const newUnlockIso = unlockVal ? new Date(unlockVal).toISOString() : null;

  if (saveExtendPeriodBtn) {
    saveExtendPeriodBtn.disabled = true;
    saveExtendPeriodBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Saving...`;
  }

  updateAssessmentDuration(asmtId, durationVal);

  const updates: any = {
    time_limit_minutes: durationVal,
  };
  if (newDeadlineIso) {
    updates.deadline = newDeadlineIso;
    updates.due_date = newDeadlineIso;
  }
  if (newUnlockIso !== undefined) {
    updates.unlock_time = newUnlockIso;
  }

  await updateAssessment(asmtId, updates);
  const asmt = (state.assessments || []).find((a) => a.id === asmtId);
  if (asmt) {
    asmt.time_limit_minutes = durationVal;
    if (newDeadlineIso) {
      asmt.deadline = newDeadlineIso;
      asmt.due_date = newDeadlineIso;
    }
    if (newUnlockIso !== undefined) {
      asmt.unlock_time = newUnlockIso;
    }
  }

  if (saveExtendPeriodBtn) {
    saveExtendPeriodBtn.disabled = false;
    saveExtendPeriodBtn.innerHTML = `<i class="fa-solid fa-calendar-check"></i> Save Validity &amp; Duration`;
  }

  extendPeriodModal?.classList.add("hidden");
  renderQuestionsConfigView();
  renderAdminAssessmentConfigTable();
  renderAdminAssessmentConfigTable2();
  renderAssessmentCards();
}

function getAdminLearnersPageSize(): number {
  if (state.adminLearnersCustomPageSize) {
    return state.adminLearnersCustomPageSize;
  }
  // User Requirement:
  // "on lg to xl we have 5 on row but 2xl we have 10 on row"
  // Tailwind 2xl breakpoint is 1536px:
  // Width >= 1536px (2xl): 10 rows per page
  // Width < 1536px (lg to xl, e.g. 1024px - 1535px, and smaller): 5 rows per page
  return window.innerWidth >= 1536 ? 10 : 5;
}

function renderAdminLearnersTable() {
  if (!adminLearnersTableBody) return;
  const paginationContainer = document.getElementById("adminLearnersPaginationContainer");
  const mobileContainer = document.getElementById("adminLearnersCardsMobile");

  if (!state.allLearners || state.allLearners.length === 0) {
    const emptyHtml = `
      <div class="py-10 text-center text-slate-400">
        <i class="fa-solid fa-users text-3xl mb-2 text-slate-300 block"></i>
        <p class="font-bold text-slate-700 text-sm">No Registered Learners Found</p>
        <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Live database mode is active. When learners sign in with their authorized Google Accounts or are enrolled via <strong>+ Enroll User</strong>, their registered profiles will appear here in real-time.
        </p>
        <p class="text-[11px] text-amber-600/90 bg-amber-50 border border-amber-200/70 rounded-lg px-3 py-1.5 mt-3 max-w-md mx-auto">
          <i class="fa-solid fa-circle-info mr-1"></i> If you already created learners directly in Supabase, ensure you have executed <code>fix_rls_policies.sql</code> in your Supabase SQL Editor so PostgreSQL permissions permit client access.
        </p>
      </div>
    `;
    adminLearnersTableBody.innerHTML = `<tr><td colspan="5">${emptyHtml}</td></tr>`;
    if (mobileContainer) mobileContainer.innerHTML = emptyHtml;
    if (paginationContainer) paginationContainer.innerHTML = "";
    return;
  }

  const filterVal = adminClassFilter?.value || "ALL";
  const searchQuery = (state.learnerSearchQuery || "").trim().toLowerCase();

  let filtered = state.allLearners.filter((l) => {
    if (filterVal === "ONLINE" && !isLearnerOnline(l)) return false;
    if (filterVal === "STAFF" && !(l.role === "teacher" || l.role === "admin" || (l.email && l.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()))) return false;
    if (filterVal !== "ALL" && filterVal !== "ONLINE" && filterVal !== "STAFF" && l.class_level !== filterVal) return false;
    if (searchQuery) {
      const matchName = (l.full_name || "").toLowerCase().includes(searchQuery);
      const matchId = (l.student_id || "").toLowerCase().includes(searchQuery);
      const matchEmail = (l.email || "").toLowerCase().includes(searchQuery);
      const matchClass = (l.class_level || "").toLowerCase().includes(searchQuery);
      if (!matchName && !matchId && !matchEmail && !matchClass) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    const emptyMsg = searchQuery
      ? `No learners found matching "${escapeHtml(searchQuery)}" in ${escapeHtml(filterVal)}.`
      : `No learners found matching the selected class filter (${escapeHtml(filterVal)}).`;
    adminLearnersTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-slate-400">
          <i class="fa-solid fa-users-slash text-2xl mb-1 block"></i>
          ${emptyMsg}
        </td>
      </tr>
    `;
    if (mobileContainer) {
      mobileContainer.innerHTML = `
        <div class="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <i class="fa-solid fa-users-slash text-2xl mb-2 text-slate-300 block"></i>
          <p class="font-bold text-slate-700 text-sm">${emptyMsg}</p>
        </div>
      `;
    }
    if (paginationContainer) paginationContainer.innerHTML = "";
    return;
  }

  // Calculate Responsive Pagination
  const pageSize = getAdminLearnersPageSize();
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp current page within valid bounds
  if (state.adminLearnersCurrentPage > totalPages) {
    state.adminLearnersCurrentPage = totalPages;
  }
  if (state.adminLearnersCurrentPage < 1) {
    state.adminLearnersCurrentPage = 1;
  }

  const currentPage = state.adminLearnersCurrentPage;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageItems = filtered.slice(startIndex, endIndex);

  // 1. Desktop Table Rows (hidden on mobile via wrapper class)
  adminLearnersTableBody.innerHTML = pageItems.map((learner) => {
    const isOnline = isLearnerOnline(learner);
    const presenceBadge = isOnline
      ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
           <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online Now
         </span>`
      : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
           <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Offline (${formatTimeAgo(learner.last_seen)})
         </span>`;

    const subCount = learner.submissions?.length || 0;
    const lastScore = subCount > 0 ? learner.submissions[0].score : null;
    const academicPill = subCount > 0
      ? `<span class="font-bold text-slate-800 whitespace-nowrap">${subCount} Task(s) Submitted</span> <span class="text-xs text-slate-400 block whitespace-nowrap">Latest: ${lastScore}/20 marks</span>`
      : `<span class="text-slate-400 italic whitespace-nowrap">No submissions yet</span>`;

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
                ${isBirthdayToday(learner.date_of_birth) ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-200 animate-pulse whitespace-nowrap"><i class="fa-solid fa-cake-candles text-pink-500"></i> Birthday Today!</span>` : ""}
              </div>
              <div class="flex items-center gap-2 mt-0.5 whitespace-nowrap">
                <span class="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">${escapeHtml(learner.student_id || generateStudentId(learner.class_level, 1))}</span>
                ${learner.date_of_birth ? `<span class="text-[11px] text-slate-500 font-medium">• Age: ${calculateAge(learner.date_of_birth) != null ? calculateAge(learner.date_of_birth) + ' yrs' : 'N/A'}</span> <span class="text-[10px] text-slate-400">(${formatDateOnly(learner.date_of_birth)})</span>` : ""}
              </div>
              <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(learner.email || "student@ghana-edu.gov.gh")}</div>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-4 whitespace-nowrap">
          <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
            ${learner.class_level || "Basic 9A"}
          </span>
        </td>
        <td class="py-3.5 px-4 whitespace-nowrap">${presenceBadge}</td>
        <td class="py-3.5 px-4">${academicPill}</td>
        <td class="py-3.5 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button
              class="admin-retake-student-btn inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
              data-student-id="${learner.id}"
              title="Authorize Assessment Retake for this learner"
            >
              <i class="fa-solid fa-rotate-right text-amber-600"></i>
              <span>Retake</span>
            </button>
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

  // 2. Mobile Cards (Touch-Optimized for Handhelds, sm:hidden)
  if (mobileContainer) {
    mobileContainer.innerHTML = pageItems.map((learner) => {
      const isOnline = isLearnerOnline(learner);
      const presenceBadge = isOnline
        ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
             <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
           </span>`
        : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
             <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> ${formatTimeAgo(learner.last_seen)}
           </span>`;

      const subCount = learner.submissions?.length || 0;
      const lastScore = subCount > 0 ? learner.submissions[0].score : null;
      const roleBadge = learner.role === "admin"
        ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-wider">Admin</span>`
        : (learner.role === "teacher"
            ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-wider">Teacher</span>`
            : "");

      const birthdayBadge = isBirthdayToday(learner.date_of_birth)
        ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-200 animate-pulse"><i class="fa-solid fa-cake-candles text-pink-500"></i> Birthday</span>`
        : "";

      return `
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 space-y-3 hover:border-slate-300 transition-all">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="relative shrink-0">
                <img src="${learner.avatar_url || AVATAR_PRESETS[0]}" alt="Avatar" class="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 shadow-2xs" />
                <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}"></span>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-slate-900 text-sm leading-tight truncate">${escapeHtml(learner.full_name)}</span>
                  ${roleBadge}
                  ${birthdayBadge}
                </div>
                <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span class="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">${escapeHtml(learner.student_id || generateStudentId(learner.class_level, 1))}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">${escapeHtml(learner.class_level || "Basic 9A")}</span>
                </div>
              </div>
            </div>
            <div class="shrink-0 text-right">
              ${presenceBadge}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 p-2 bg-slate-50/80 rounded-xl border border-slate-100 text-xs">
            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Tasks</span>
              <span class="font-bold text-slate-800 text-[11px]">${subCount > 0 ? `${subCount} Submitted` : 'No submissions'}</span>
              ${lastScore != null ? `<span class="text-[10px] text-slate-400 block">Latest: ${lastScore}/20 marks</span>` : ''}
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Age &amp; Birth</span>
              <span class="font-bold text-slate-700 text-[11px]">${learner.date_of_birth ? `${calculateAge(learner.date_of_birth) != null ? calculateAge(learner.date_of_birth) + ' yrs' : 'N/A'}` : 'DOB Unregistered'}</span>
              <span class="text-[10px] text-slate-400 truncate block">${escapeHtml(learner.email || 'student@ghana-edu.gov.gh')}</span>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100">
            <button
              type="button"
              class="admin-chat-student-btn py-2 px-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95"
              data-student-id="${learner.id}"
              title="Start 1-on-1 Chat"
            >
              <i class="fa-solid fa-comments text-xs"></i>
              <span class="text-[10px]">Chat</span>
            </button>
            <button
              type="button"
              class="admin-record-student-mark-btn py-2 px-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95"
              data-student-id="${learner.id}"
              title="Record Assessment Mark"
            >
              <i class="fa-solid fa-pen-to-square text-xs"></i>
              <span class="text-[10px]">Mark</span>
            </button>
            <button
              type="button"
              class="admin-retake-student-btn py-2 px-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95"
              data-student-id="${learner.id}"
              title="Authorize Retake"
            >
              <i class="fa-solid fa-rotate-right text-xs text-amber-600"></i>
              <span class="text-[10px]">Retake</span>
            </button>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="admin-edit-student-btn flex-1 py-2 px-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95"
                data-student-id="${learner.id}"
                title="Edit Profile"
              >
                <i class="fa-solid fa-user-pen text-xs"></i>
                <span class="text-[10px]">Edit</span>
              </button>
              <button
                type="button"
                class="admin-delete-student-btn w-8 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center justify-center active:scale-95 shrink-0"
                data-student-id="${learner.id}"
                data-student-name="${escapeHtml(learner.full_name)}"
                title="Delete Learner Record"
              >
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Attach Retake button handlers
  document.querySelectorAll(".admin-retake-student-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const studentId = btn.getAttribute("data-student-id");
      if (studentId) openGrantRetakeModal(studentId);
    });
  });

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

  // Render Pagination Controls in Footer
  if (paginationContainer) {
    const is2xl = window.innerWidth >= 1536;
    const modeLabel = is2xl ? "10 on row (2xl display)" : "5 on row (lg-xl display)";

    // Generate page numbers
    let pageNumbersHtml = "";
    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 7) {
        // Sliding window
        if (p !== 1 && p !== totalPages && Math.abs(p - currentPage) > 1) {
          if (p === 2 || p === totalPages - 1) {
            pageNumbersHtml += `<span class="px-1 text-slate-300">...</span>`;
          }
          continue;
        }
      }
      const isActive = p === currentPage;
      pageNumbersHtml += `
        <button
          type="button"
          data-page="${p}"
          class="admin-learner-page-btn w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
            isActive
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }"
        >
          ${p}
        </button>
      `;
    }

    paginationContainer.innerHTML = `
      <div class="flex items-center gap-3 flex-wrap">
        <div>
          Showing <span class="font-bold text-slate-800">${startIndex + 1}</span> to <span class="font-bold text-slate-800">${endIndex}</span> of <span class="font-bold text-slate-800">${totalItems}</span> users
        </div>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 border border-slate-200">
          <i class="fa-solid fa-table-cells text-[10px] text-indigo-500"></i>
          <span>${modeLabel}</span>
        </span>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <!-- Previous Page Button -->
        <button
          id="adminLearnersPrevPageBtn"
          type="button"
          class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentPage > 1
              ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer shadow-2xs'
              : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed opacity-60'
          }"
          ${currentPage <= 1 ? 'disabled' : ''}
        >
          <i class="fa-solid fa-chevron-left text-[10px]"></i>
          <span>Previous</span>
        </button>

        <!-- Page Numbers -->
        <div class="flex items-center gap-1">
          ${pageNumbersHtml}
        </div>

        <!-- Next Page Button -->
        <button
          id="adminLearnersNextPageBtn"
          type="button"
          class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentPage < totalPages
              ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer shadow-2xs'
              : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed opacity-60'
          }"
          ${currentPage >= totalPages ? 'disabled' : ''}
        >
          <span>Next</span>
          <i class="fa-solid fa-chevron-right text-[10px]"></i>
        </button>
      </div>
    `;

    // Wire pagination events
    document.getElementById("adminLearnersPrevPageBtn")?.addEventListener("click", () => {
      if (state.adminLearnersCurrentPage > 1) {
        state.adminLearnersCurrentPage--;
        renderAdminLearnersTable();
      }
    });

    document.getElementById("adminLearnersNextPageBtn")?.addEventListener("click", () => {
      if (state.adminLearnersCurrentPage < totalPages) {
        state.adminLearnersCurrentPage++;
        renderAdminLearnersTable();
      }
    });

    document.querySelectorAll(".admin-learner-page-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = parseInt(btn.getAttribute("data-page") || "1", 10);
        if (page !== state.adminLearnersCurrentPage) {
          state.adminLearnersCurrentPage = page;
          renderAdminLearnersTable();
        }
      });
    });
  }
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

  // Strict Uniqueness Check: Registered Name and Email must be unique
  const existingLearners = state.allLearners || [];
  const nameExists = existingLearners.some(
    (l: any) => l.full_name && l.full_name.trim().toLowerCase() === name.toLowerCase()
  );
  if (nameExists) {
    alert(`A user with the registered name "${name}" already exists. Registered full names must be unique across all learners and staff.`);
    return;
  }

  if (emailVal) {
    const emailExists = existingLearners.some(
      (l: any) => l.email && l.email.trim().toLowerCase() === emailVal.toLowerCase()
    );
    if (emailExists) {
      alert(`A user with the email address "${emailVal}" is already registered. Email addresses must be unique.`);
      return;
    }
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

  // Strict Uniqueness Check: Exclude the user currently being edited
  const otherLearners = (state.allLearners || []).filter((l: any) => l.id !== userId);
  const nameExists = otherLearners.some(
    (l: any) => l.full_name && l.full_name.trim().toLowerCase() === fullName.toLowerCase()
  );
  if (nameExists) {
    alert(`Another user with the registered name "${fullName}" already exists. Registered full names must be unique across all users.`);
    return;
  }

  if (emailVal) {
    const emailExists = otherLearners.some(
      (l: any) => l.email && l.email.trim().toLowerCase() === emailVal.toLowerCase()
    );
    if (emailExists) {
      alert(`Another user with the email address "${emailVal}" is already registered. Email addresses must be unique.`);
      return;
    }
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
  const searchInput = activeLearnersSearchInput || (document.getElementById("activeLearnersSearchInput") as HTMLInputElement | null);
  const classFilter = activeLearnersClassFilter || (document.getElementById("activeLearnersClassFilter") as HTMLSelectElement | null);

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
  const searchInput = activeLearnersSearchInput || (document.getElementById("activeLearnersSearchInput") as HTMLInputElement | null);
  const classFilter = activeLearnersClassFilter || (document.getElementById("activeLearnersClassFilter") as HTMLSelectElement | null);
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

  document.querySelectorAll(".active-modal-retake-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openGrantRetakeModal(learner.id);
    });
  });

  document.querySelectorAll(".active-modal-row-retake-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const asmtId = btn.getAttribute("data-asmt-id");
      openGrantRetakeModal(learner.id, asmtId);
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
            class="active-modal-retake-btn inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-sm"
            data-learner-id="${learner.id}"
            title="Authorize student to retake a CAT"
          >
            <i class="fa-solid fa-rotate-right"></i> Authorize Retake
          </button>
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
                <th class="py-2 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${subs.map((s) => `
                <tr class="hover:bg-slate-50">
                  <td class="py-2.5 px-2 font-semibold text-slate-800">${escapeHtml(s.assessments?.title || s.assessment_id)}</td>
                  <td class="py-2.5 px-2 font-bold text-indigo-700 font-mono">${s.score}/${s.max_score || 20}</td>
                  <td class="py-2.5 px-2">
                    ${s.retake_granted 
                      ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Retake Open</span>`
                      : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">${s.status || "GRADED"}</span>`}
                  </td>
                  <td class="py-2.5 px-2 text-slate-500 text-[11px]">${formatDateOnly(s.submitted_at)}</td>
                  <td class="py-2.5 px-2 text-slate-500 italic text-[11px]">${escapeHtml(s.teacher_remarks || "Marked.")}</td>
                  <td class="py-2.5 px-2 text-right">
                    <button
                      class="active-modal-row-retake-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                      data-learner-id="${learner.id}"
                      data-asmt-id="${s.assessment_id}"
                      title="Grant retake for this assessment"
                    >
                      <i class="fa-solid fa-rotate-right text-amber-600"></i> Retake
                    </button>
                  </td>
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
(window as any).openActiveLearnersModal = openActiveLearnersModal;
(window as any).closeActiveLearnersModal = closeActiveLearnersModal;
(window as any).showActiveLearnerDetail = showActiveLearnerDetail;
(window as any).renderActiveLearnersList = renderActiveLearnersList;
(window as any).startAdminDemoMode = startAdminDemoMode;

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
// Clear Cooked / Mock Data & Start Pure Real User Testing Handler
// ------------------------------------------------------------------------------
async function handleClearMockData() {
  const confirmed = confirm(
    "PURGE ALL TEST & COOKED DATA:\n\nAre you sure you want to permanently clear all fake students, cooked submissions, test chat logs, and browser demo storage?\n\nThis will purge all mock data from your Supabase database and local storage so the portal is 100% clean for testing real users."
  );
  if (!confirmed) return;

  const btn = adminPurgeTestDataBtn as HTMLButtonElement | null;
  const originalHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin text-xs"></i> Purging Data...`;
  }

  try {
    // 1. Purge Supabase backend tables and clear local storage keys
    await purgeAllTestDataFromDatabase();
    clearAllMockData();

    state.allLearners = [];
    state.submissions = [];
    state.notifications = [];
    state.readNotificationIds.clear();

    // 2. Fetch fresh real learners (pure empty database state)
    state.allLearners = await fetchAllLearners();
    state.submissions = await fetchAllSubmissions();
    state.notifications = await fetchNotifications();

    renderAdminLearnersTable();
    renderAdminOverviewStats();
    updateKpiMetrics();
    renderNotifications();

    alert(
      "All test and cooked data successfully cleared!\n\n• Fake learners and test scores removed\n• Submissions table cleaned\n• Chat messages & recordings purged\n• Notifications & read alerts wiped\n• Local demo cache wiped\n\nThe portal is now 100% clean and ready for real users."
    );
  } catch (err: any) {
    console.error("Purge error:", err);
    alert("Could not complete full purge: " + (err?.message || "Unknown error"));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml || `<i class="fa-solid fa-trash-can text-xs text-rose-600"></i> <span>Clear All Test Data</span>`;
    }
  }
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
  const totalCount = state.notifications.length;
  const unreadCount = state.notifications.filter((n) => !readSet.has(n.id)).length;

  // Update Bell Badge
  if (notifBadge) {
    if (unreadCount > 0) {
      notifBadge.textContent = unreadCount > 99 ? "99+" : `${unreadCount}`;
      notifBadge.classList.remove("hidden");
    } else {
      notifBadge.classList.add("hidden");
    }
  }

  // Update Header Pill
  if (notifUnreadPill) {
    if (unreadCount === 0) {
      notifUnreadPill.textContent = "All caught up";
      notifUnreadPill.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs";
    } else {
      notifUnreadPill.textContent = `${unreadCount} New`;
      notifUnreadPill.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs";
    }
  }

  // Update Tab Counters & Active Styles
  if (notifCountAll) notifCountAll.textContent = `${totalCount}`;
  if (notifCountUnread) notifCountUnread.textContent = `${unreadCount}`;

  if (notifTabAll && notifTabUnread) {
    if (state.notificationFilter === "unread") {
      notifTabUnread.className = "px-2.5 py-1 rounded-lg font-bold text-xs bg-indigo-600 text-white transition-all shadow-xs cursor-pointer";
      notifTabAll.className = "px-2.5 py-1 rounded-lg font-semibold text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer";
    } else {
      notifTabAll.className = "px-2.5 py-1 rounded-lg font-bold text-xs bg-indigo-600 text-white transition-all shadow-xs cursor-pointer";
      notifTabUnread.className = "px-2.5 py-1 rounded-lg font-semibold text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer";
    }
  }

  // Filter List Based on Active Tab
  const displayItems = state.notificationFilter === "unread"
    ? state.notifications.filter((n) => !readSet.has(n.id))
    : state.notifications;

  if (displayItems.length === 0) {
    if (state.notificationFilter === "unread") {
      notifListContainer.innerHTML = `
        <div class="p-8 text-center">
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center text-xl mb-3 shadow-2xs">
            <i class="fa-solid fa-check-double"></i>
          </div>
          <h6 class="text-sm font-bold text-slate-800 mb-1">All Caught Up!</h6>
          <p class="text-xs text-slate-500 max-w-xs mx-auto">You have reviewed all announcements and deadlines.</p>
        </div>
      `;
    } else {
      notifListContainer.innerHTML = `
        <div class="p-8 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl mb-3">
            <i class="fa-regular fa-bell-slash"></i>
          </div>
          <h6 class="text-sm font-bold text-slate-700 mb-1">No Notifications</h6>
          <p class="text-xs text-slate-400 max-w-xs mx-auto">There are no school announcements posted at this time.</p>
        </div>
      `;
    }
    return;
  }

  notifListContainer.innerHTML = displayItems.map((n) => {
    const isUnread = !readSet.has(n.id);
    const isExpanded = state.expandedNotifIds.has(n.id);
    const isLongMessage = n.message && n.message.length > 80;

    let icon = "fa-bullhorn";
    let label = "Announcement";
    let badgeClass = "bg-indigo-50 text-indigo-700 border border-indigo-200/60";

    if (n.type === "DEADLINE") {
      icon = "fa-clock";
      label = "Deadline";
      badgeClass = "bg-rose-50 text-rose-700 border border-rose-200/60";
    } else if (n.type === "GENERAL") {
      icon = "fa-circle-info";
      label = "Notice";
      badgeClass = "bg-sky-50 text-sky-700 border border-sky-200/60";
    }

    return `
      <div class="p-3.5 sm:p-4 transition-all relative group cursor-pointer ${
        isUnread ? 'bg-indigo-50/35 hover:bg-indigo-50/60' : 'bg-white hover:bg-slate-50/80'
      }" data-notif-id="${n.id}">
        <!-- Top Meta Row -->
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${badgeClass}">
              <i class="fa-solid ${icon} text-[9px]"></i>
              <span>${label}</span>
            </span>
            <span class="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
              ${escapeHtml(n.target_class || "ALL")}
            </span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[11px] text-slate-400 font-medium">${formatTimeAgo(n.created_at)}</span>
            ${isUnread ? '<span class="w-2 h-2 rounded-full bg-indigo-600 ring-4 ring-indigo-100 shrink-0" title="Unread announcement"></span>' : ''}
          </div>
        </div>

        <!-- Title -->
        <h5 class="text-xs sm:text-sm font-bold text-slate-900 leading-snug mb-1 group-hover:text-indigo-600 transition-colors">
          ${escapeHtml(n.title)}
        </h5>

        <!-- Message Body with Inline Expand -->
        <div class="text-xs text-slate-600 leading-relaxed mb-2.5">
          <p class="${isExpanded ? '' : 'line-clamp-2'} text-slate-600 text-xs leading-relaxed select-text">${escapeHtml(n.message)}</p>
          ${isLongMessage ? `
            <button type="button" class="notif-expand-btn text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 mt-1 cursor-pointer" data-expand-id="${n.id}">
              <span>${isExpanded ? 'Show less' : 'Read more'}</span>
              <i class="fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[9px]"></i>
            </button>
          ` : ''}
        </div>

        <!-- Action bar for Retake and Activated tests -->
        ${(n.title.includes("Retake Authorized") || n.title.includes("Assessment Activated") || n.title.includes("is Now LIVE")) ? `
          <div class="mb-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
            <button
              type="button"
              class="view-dispatched-email-btn inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
              data-notif-title="${escapeHtml(n.title)}"
              data-notif-msg="${escapeHtml(n.message)}"
            >
              <i class="fa-solid fa-envelope-open-text text-indigo-600"></i> View Official Email
            </button>
            <button
              type="button"
              class="open-notif-asmt-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
            >
              <i class="fa-solid fa-play text-[9px]"></i> Go to Assessment
            </button>
          </div>
        ` : ''}

        <!-- Bottom Row: Sender Info & Toggle Button -->
        <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
          <div class="flex items-center gap-1.5 text-slate-500 font-medium truncate max-w-[200px] sm:max-w-[240px]">
            <i class="fa-solid fa-chalkboard-user text-slate-400 text-[10px]"></i>
            <span class="truncate">By: ${escapeHtml(n.sender_name || "Admin")}</span>
          </div>

          <!-- Mark as Read / Seen Toggle Button -->
          <button type="button" class="notif-action-btn inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
            isUnread 
              ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80 shadow-2xs' 
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80'
          }" data-toggle-id="${n.id}" title="${isUnread ? 'Click to mark as read' : 'Click to mark as unread'}">
            ${isUnread 
              ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Mark as read' 
              : '<i class="fa-solid fa-check-double text-emerald-600"></i> Read'}
          </button>
        </div>
      </div>
    `;
  }).join("");

  // Attach Event Handlers with StopPropagation to Prevent Dropdown from Closing
  notifListContainer.querySelectorAll(".view-dispatched-email-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const notifTitle = btn.getAttribute("data-notif-title") || "Assessment Notification";
      const notifMsg = btn.getAttribute("data-notif-msg") || "";
      const emails = getDispatchedEmails();
      const matchedEmail = emails.find((em: any) => em.subject && (em.subject.includes(notifTitle) || notifTitle.includes(em.heading || "___")));

      if (matchedEmail) {
        openEmailPreviewModal(matchedEmail);
      } else {
        openEmailPreviewModal({
          subject: notifTitle,
          heading: notifTitle,
          recipientName: state.profile?.full_name || "Student Learner",
          to: state.profile?.email || "student@ghana-edu.gov.gh",
          senderName: "Master Debrah (Admin)",
          senderEmail: PRIMARY_ADMIN_EMAIL,
          bodyHtml: `<p>${escapeHtml(notifMsg)}</p>`,
          actionUrl: window.location.origin + "/learner",
          actionText: "Open Assessment Portal",
        });
      }
    });
  });

  notifListContainer.querySelectorAll(".open-notif-asmt-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      notifDropdown?.classList.add("hidden");
      navigateTo("/learner");
      const grid = document.getElementById("assessmentGrid");
      if (grid) grid.scrollIntoView({ behavior: "smooth" });
    });
  });

  notifListContainer.querySelectorAll(".notif-expand-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-expand-id");
      if (id) {
        if (state.expandedNotifIds.has(id)) {
          state.expandedNotifIds.delete(id);
        } else {
          state.expandedNotifIds.add(id);
        }
        renderNotifications();
      }
    });
  });

  notifListContainer.querySelectorAll(".notif-action-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-toggle-id");
      if (id) {
        if (state.readNotificationIds.has(id)) {
          state.readNotificationIds.delete(id);
        } else {
          state.readNotificationIds.add(id);
        }
        localStorage.setItem("jhs_read_notifications", JSON.stringify([...state.readNotificationIds]));
        renderNotifications();
      }
    });
  });

  notifListContainer.querySelectorAll("[data-notif-id]").forEach((card) => {
    card.addEventListener("click", (e) => {
      e.stopPropagation();
      const notifId = card.getAttribute("data-notif-id");
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
function getMyUserId(): string {
  const isCurrentUserAdmin = state.isAdmin || (state.user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
  if (isCurrentUserAdmin) return ADMIN_CONTACT.id;
  if (state.profile?.id && state.profile.id !== "admin-master-debrah") return state.profile.id;
  if (state.user?.id && !state.user.id.startsWith("admin-")) return state.user.id;
  return "30d8e3f6-a5c4-47d2-af35-97cd81bbc0bf";
}

function isMessageAddressedToMe(msg: any, myId: string): boolean {
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

let globalUnlockedAudioCtx: any = null;
function getUnlockedAudioContext(): any {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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

function generateChimeWavDataUrl(): string {
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

function generateVoiceNoteWavDataUrl(durationSec = 2.5): string {
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

let cachedChimeDataUrl: string | null = null;

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

let chatToastTimeout: any = null;
function showIncomingChatToast(msg: any) {
  const toast = document.getElementById("chatIncomingToast");
  const avatar = document.getElementById("chatToastAvatar") as HTMLImageElement | null;
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
      const senderContact = (state.allLearners || []).find((l: any) => l.id === msg.sender_id) ||
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

async function toggleChatContactsDrawer(forceShow?: boolean) {
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

(window as any).toggleChatContactsDrawer = toggleChatContactsDrawer;

function renderChatContactsList() {
  if (!chatContactsListContainer) return;
  const myId = getMyUserId();
  const search = (chatContactSearchInput?.value || "").toLowerCase().trim();

  let html = "";

  // 1. Academic Staff (Master Debrah) - Shown if current viewer is in learner view or not admin
  if (!state.isAdmin || state.activeView === "learner") {
    const adminLearner = (state.allLearners || []).find(
      (l: any) => l.id === ADMIN_CONTACT.id || (l.role || "").toLowerCase() === "admin" || (l.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()
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
  const students = (state.allLearners || []).filter((l: any) => {
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
    students.forEach((student: any) => {
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
        const target = (state.allLearners || []).find((l: any) => l.id === learnerId);
        if (target) openChatWithUser(target);
      }
      toggleChatContactsDrawer(false);
    });
  });
}

let chatPresenceRefreshInterval: any = null;
let chatRealtimeSubscribed = false;

// ------------------------------------------------------------------------------
// TanStack Query: Optimistic Chat Engine (Reactions, Replies, Edits, Deletions)
// ------------------------------------------------------------------------------
export const chatQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: fetchChatMessages,
      staleTime: Infinity,
      gcTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: false,
    },
  },
});
(window as any).chatQueryClient = chatQueryClient;

let chatQueryObserver: QueryObserver<any> | null = null;

function setupChatQueryObserver() {
  if (chatQueryObserver) return;
  chatQueryObserver = new QueryObserver(chatQueryClient, {
    queryKey: ["chat_messages"],
    queryFn: fetchChatMessages,
    staleTime: Infinity,
  });

  chatQueryObserver.subscribe((result) => {
    if (result.data) {
      state.chatMessages = result.data;
      renderChatMessages();
      updateChatUnreadDot();
    }
  });
}

function isSameChatMessage(a: any, b: any): boolean {
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

function upsertChatMessageInCache(newMsg: any): boolean {
  let isNew = false;
  chatQueryClient.setQueryData(["chat_messages"], (old: any[] = []) => {
    const list = [...old];
    const existingIdx = list.findIndex((m: any) => isSameChatMessage(m, newMsg));
    if (existingIdx !== -1) {
      list[existingIdx] = {
        ...list[existingIdx],
        ...newMsg,
        id: (newMsg.id && !newMsg.id.startsWith("msg-") && !newMsg.id.startsWith("temp-")) ? newMsg.id : list[existingIdx].id,
      };
      isNew = false;
    } else {
      list.push(newMsg);
      isNew = true;
    }
    return list;
  });
  return isNew;
}

function upsertChatMessage(newMsg: any): boolean {
  return upsertChatMessageInCache(newMsg);
}

// 1. TanStack Query Mutation: Send Message / Quoted Reply / Media / Voice Note
const sendChatMessageMutation = new MutationObserver(chatQueryClient, {
  mutationFn: async (payload: any) => {
    return await sendChatMessage(payload);
  },
  onMutate: (newPayload: any) => {
    chatQueryClient.cancelQueries({ queryKey: ["chat_messages"] });

    const previousMessages = chatQueryClient.getQueryData<any[]>(["chat_messages"]) || [];
    const tempId = "temp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const optimisticMsg: any = {
      id: tempId,
      temp_id: tempId,
      created_at: new Date().toISOString(),
      reactions: {},
      is_edited: false,
      is_deleted: false,
      read: false,
      ...newPayload,
    };

    chatQueryClient.setQueryData(["chat_messages"], (old: any[] = []) => [...old, optimisticMsg]);

    return { previousMessages, tempId };
  },
  onError: (err, variables, context: any) => {
    console.error("TanStack Query: sendChatMessage error, rolling back:", err);
    if (context?.previousMessages) {
      chatQueryClient.setQueryData(["chat_messages"], context.previousMessages);
    }
  },
  onSuccess: (serverMsg: any, variables, context: any) => {
    if (serverMsg) {
      chatQueryClient.setQueryData(["chat_messages"], (old: any[] = []) => {
        return old.map((m: any) => {
          if (m.id === context?.tempId || m.temp_id === context?.tempId || isSameChatMessage(m, serverMsg)) {
            return {
              ...m,
              ...serverMsg,
              id: (serverMsg.id && !serverMsg.id.startsWith("msg-") && !serverMsg.id.startsWith("temp-")) ? serverMsg.id : m.id,
            };
          }
          return m;
        });
      });
    }
  },
});

// 2. TanStack Query Mutation: Emoji Reactions Toggle (Optimistic zero-latency)
const reactChatMessageMutation = new MutationObserver(chatQueryClient, {
  mutationFn: async ({ msgId, emoji, userId, userName }: { msgId: string; emoji: string; userId: string; userName: string }) => {
    return await toggleMessageReaction(msgId, emoji, userId, userName);
  },
  onMutate: ({ msgId, emoji, userId, userName }) => {
    chatQueryClient.cancelQueries({ queryKey: ["chat_messages"] });

    const previousMessages = chatQueryClient.getQueryData<any[]>(["chat_messages"]) || [];
    const userIdentifier = userName || userId || "Learner";

    chatQueryClient.setQueryData(["chat_messages"], (old: any[] = []) => {
      return old.map((m: any) => {
        if (m.id !== msgId && m.temp_id !== msgId) return m;

        let reactions = m.reactions || {};
        if (Array.isArray(reactions)) {
          const map: Record<string, string[]> = {};
          reactions.forEach((r: any) => {
            map[r.emoji] = map[r.emoji] || [];
            map[r.emoji].push(r.user_name || r.user_id);
          });
          reactions = map;
        } else {
          reactions = JSON.parse(JSON.stringify(reactions));
        }

        const currentUsers = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
        const existingIdx = currentUsers.findIndex((u: string) => u === userIdentifier || u === userId);

        if (existingIdx !== -1) {
          // Toggle off
          currentUsers.splice(existingIdx, 1);
          if (currentUsers.length === 0) {
            delete reactions[emoji];
          } else {
            reactions[emoji] = currentUsers;
          }
        } else {
          // WhatsApp standard: 1 reaction per user
          Object.keys(reactions).forEach((em) => {
            reactions[em] = (reactions[em] || []).filter((u: string) => u !== userIdentifier && u !== userId);
            if (reactions[em].length === 0) {
              delete reactions[em];
            }
          });
          currentUsers.push(userIdentifier);
          reactions[emoji] = currentUsers;
        }

        return { ...m, reactions };
      });
    });

    return { previousMessages };
  },
  onError: (err, variables, context: any) => {
    console.error("TanStack Query: toggleReaction error, rolling back:", err);
    if (context?.previousMessages) {
      chatQueryClient.setQueryData(["chat_messages"], context.previousMessages);
    }
  },
  onSuccess: (updatedMsg: any) => {
    if (updatedMsg) {
      upsertChatMessageInCache(updatedMsg);
    }
  },
});

// 3. TanStack Query Mutation: Edit Chat Message within 2 minutes
const editChatMessageMutation = new MutationObserver(chatQueryClient, {
  mutationFn: async ({ msgId, text }: { msgId: string; text: string }) => {
    return await updateChatMessage(msgId, {
      message: text,
      is_edited: true,
      edited_at: new Date().toISOString(),
    });
  },
  onMutate: ({ msgId, text }) => {
    chatQueryClient.cancelQueries({ queryKey: ["chat_messages"] });

    const previousMessages = chatQueryClient.getQueryData<any[]>(["chat_messages"]) || [];

    chatQueryClient.setQueryData(["chat_messages"], (old: any[] = []) => {
      return old.map((m: any) => {
        if (m.id === msgId || m.temp_id === msgId) {
          return {
            ...m,
            message: text,
            is_edited: true,
            edited_at: new Date().toISOString(),
          };
        }
        return m;
      });
    });

    return { previousMessages };
  },
  onError: (err, variables, context: any) => {
    console.error("TanStack Query: editChatMessage error, rolling back:", err);
    if (context?.previousMessages) {
      chatQueryClient.setQueryData(["chat_messages"], context.previousMessages);
    }
  },
  onSuccess: (updatedMsg: any) => {
    if (updatedMsg) {
      upsertChatMessageInCache(updatedMsg);
    }
  },
});

// 4. TanStack Query Mutation: Delete Chat Message
const deleteChatMessageMutation = new MutationObserver(chatQueryClient, {
  mutationFn: async ({ msgId }: { msgId: string }) => {
    return await deleteChatMessage(msgId);
  },
  onMutate: ({ msgId }) => {
    chatQueryClient.cancelQueries({ queryKey: ["chat_messages"] });

    const previousMessages = chatQueryClient.getQueryData<any[]>(["chat_messages"]) || [];

    chatQueryClient.setQueryData(["chat_messages"], (old: any[] = []) => {
      return old.map((m: any) => {
        if (m.id === msgId || m.temp_id === msgId) {
          return {
            ...m,
            is_deleted: true,
            message: "🚫 This message was deleted",
            media_url: null,
            media_type: "text",
            media_name: null,
            deleted_at: new Date().toISOString(),
          };
        }
        return m;
      });
    });

    return { previousMessages };
  },
  onError: (err, variables, context: any) => {
    console.error("TanStack Query: deleteChatMessage error, rolling back:", err);
    if (context?.previousMessages) {
      chatQueryClient.setQueryData(["chat_messages"], context.previousMessages);
    }
  },
  onSuccess: (updatedMsg: any) => {
    if (updatedMsg) {
      upsertChatMessageInCache(updatedMsg);
    }
  },
});

async function initChat() {
  try {
    // Ensure chat widget launcher is always visible
    const chatContainer = document.getElementById("floatingChatContainer");
    if (chatContainer) chatContainer.classList.remove("hidden");

    if (!state.allLearners || state.allLearners.length === 0) {
      try {
        state.allLearners = await fetchAllLearners();
      } catch (e) {
        state.allLearners = [];
      }
    }

    const isCurrentUserAdmin = state.isAdmin || (state.user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

    if (!state.activeChatPartner) {
      if (isCurrentUserAdmin) {
        const firstStudent = (state.allLearners || []).find(
          (l: any) => (l.role || "learner") === "learner" && (l.email || "").toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase()
        );
        state.activeChatPartner = firstStudent || null;
      } else {
        state.activeChatPartner = ADMIN_CONTACT;
      }
    }

    // Setup TanStack Query Observer to synchronize state.chatMessages and trigger re-renders
    setupChatQueryObserver();

    // Load chat messages via TanStack Query
    try {
      const fetched = await chatQueryClient.fetchQuery({
        queryKey: ["chat_messages"],
        queryFn: fetchChatMessages,
      });
      state.chatMessages = fetched || [];
    } catch (e) {
      state.chatMessages = await fetchChatMessages();
    }

    updateChatUnreadDot();
    renderChatPartnerHeader();
    renderChatMessages();

  // Realtime Live Presence Subscription for All Learners & Admin
  subscribeToLearnersRealtime((updatedLearner: any) => {
    const idx = (state.allLearners || []).findIndex((l: any) => l.id === updatedLearner.id);
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

  // Subscribe to live Realtime Chat channel (Instant WebSocket Broadcast + DB CDC)
  if (!chatRealtimeSubscribed) {
    chatRealtimeSubscribed = true;
    subscribeToChatRealtime(
      (newMsg) => {
        const myId = getMyUserId();

        // Deduplicate/merge message seamlessly via TanStack Query
        const isNew = upsertChatMessageInCache(newMsg);

        const isForMe = isMessageAddressedToMe(newMsg, myId);
        const isChatOpen = chatWindow && !chatWindow.classList.contains("hidden");
        const partner = state.activeChatPartner;
        const isCurrentPartner = partner && (
          newMsg.sender_id === partner.id ||
          (partner.role === "admin" && newMsg.sender_role === "admin") ||
          (newMsg.sender_id === myId && newMsg.recipient_id === partner.id)
        );

        if (isChatOpen && isCurrentPartner) {
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
          chatQueryClient.setQueryData(["chat_messages"], (old: any[] = []) => {
            let modified = false;
            const updated = old.map((m: any) => {
              if (
                (m.recipient_id === viewerId || (viewerId === ADMIN_CONTACT.id && m.recipient_role === "admin")) &&
                (!partnerId || m.sender_id === partnerId)
              ) {
                modified = true;
                return { ...m, read: true, read_at: read_at || new Date().toISOString() };
              }
              return m;
            });
            return modified ? updated : old;
          });
        } else if (updateData?.id) {
          // Single message updated
          upsertChatMessageInCache(updateData);
        }
      },
      (callSignal) => {
        handleIncomingCallSignal(callSignal);
      }
    );
    try {
      queryActiveCallsOnConnect();
    } catch (e) {
      console.warn("queryActiveCallsOnConnect error:", e);
    }
  }
  } catch (err) {
    console.warn("initChat error:", err);
  }
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
      ? "Master Debrah"
      : `${partner.full_name}`;
  }
  if (chatPartnerAvatar) {
    chatPartnerAvatar.src = isPartnerAdmin ? TEACHER_AVATAR : (partner.avatar_url || AVATAR_PRESETS[0]);
  }
  if (chatPartnerStatus) {
    const livePartner = isPartnerAdmin
      ? ((state.allLearners || []).find((l: any) => l.id === ADMIN_CONTACT.id || (l.role || "").toLowerCase() === "admin" || (l.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) || ADMIN_CONTACT)
      : ((state.allLearners || []).find((l: any) => l.id === partner.id) || partner);

    const isOnline = isLearnerOnline(livePartner);
    if (isOnline) {
      chatPartnerStatus.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span> <span class="text-emerald-300 font-semibold">Online</span> • <span class="truncate">${isPartnerAdmin ? "Teacher" : (livePartner.class_level || "Basic 9")}</span>`;
    } else {
      const timeAgo = livePartner.last_seen ? formatTimeAgo(livePartner.last_seen) : "offline";
      chatPartnerStatus.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span> <span class="text-slate-300">Offline (${timeAgo})</span> • <span class="truncate">${isPartnerAdmin ? "Teacher" : (livePartner.class_level || "Basic 9")}</span>`;
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

function toggleChatWindow(forceShow?: boolean) {
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

function openChatWithUser(student: any) {
  state.activeChatPartner = student;
  renderChatPartnerHeader();
  if (chatContactsDrawer) chatContactsDrawer.classList.add("hidden");
  toggleChatWindow(true);
  chatMessageInput?.focus();
  markCurrentChatAsSeen();
  renderChatMessages();
}

(window as any).openChatWithUser = openChatWithUser;
(window as any).toggleChatWindow = toggleChatWindow;
(window as any).updateChatLauncherButton = updateChatLauncherButton;
(window as any).playNotificationChime = playNotificationChime;
(window as any).showIncomingChatToast = showIncomingChatToast;
(window as any).updateChatUnreadDot = updateChatUnreadDot;
(window as any).generateVoiceNoteWavDataUrl = generateVoiceNoteWavDataUrl;
(window as any).generateChimeWavDataUrl = generateChimeWavDataUrl;
(window as any).getUnlockedAudioContext = getUnlockedAudioContext;
(window as any).startConferenceCall = startConferenceCall;
(window as any).openConferenceDrawer = openConferenceDrawer;
(window as any).closeConferenceDrawer = closeConferenceDrawer;
(window as any).state = state;

async function markCurrentChatAsSeen() {
  const myId = getMyUserId();
  const partner = state.activeChatPartner;
  const partnerId = partner?.id || null;
  const viewerRole = state.isAdmin && state.activeView === "admin" ? "admin" : "learner";

  // Optimistically mark messages as read in TanStack Query cache
  chatQueryClient.setQueryData(["chat_messages"], (old: any[] = []) => {
    let changed = false;
    const updated = old.map((m: any) => {
      const matchesPartner = partnerId
        ? m.sender_id === partnerId || (m.sender_role === "admin" && partnerId === ADMIN_CONTACT.id)
        : true;
      if (matchesPartner && !m.read) {
        changed = true;
        return { ...m, read: true, read_at: new Date().toISOString() };
      }
      return m;
    });
    return changed ? updated : old;
  });

  await markChatMessagesAsRead(myId, partnerId, viewerRole);
}

// ------------------------------------------------------------------------------
// WhatsApp Chat Helpers: Timestamps, Replies, Reactions & Edits
// ------------------------------------------------------------------------------
function formatFullTimestamp(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isMessageEditable(msg: any): boolean {
  if (!msg || msg.is_deleted) return false;
  const created = new Date(msg.created_at).getTime();
  if (isNaN(created)) return false;
  return Date.now() - created <= 2 * 60 * 1000; // Strictly 2 minutes window
}

function setReplyingTo(msg: any) {
  cancelEditing();
  activeReplyingTo = {
    id: msg.id,
    sender_name: msg.sender_name || "Partner",
    message: msg.message || (msg.media_name ? `Attachment: ${msg.media_name}` : "Media file"),
    media_type: msg.media_type,
  };

  // 1. WhatsApp-Style Input Theming: Highlight input and customize placeholder
  if (chatInputForm) {
    chatInputForm.classList.add("chat-reply-active-mode");
  }
  if (chatMessageInput) {
    chatMessageInput.placeholder = `Replying to ${activeReplyingTo.sender_name}...`;
    chatMessageInput.focus();
  }

  // 2. Reply Bar Preview Theming
  if (chatReplyBar && chatReplySender && chatReplySnippet) {
    chatReplySender.textContent = `Replying to ${activeReplyingTo.sender_name}`;
    chatReplySnippet.textContent = activeReplyingTo.message;
    chatReplyBar.classList.remove("hidden");
  }

  // 3. Highlight the target message bubble in the chat thread
  if (chatMessagesContainer) {
    chatMessagesContainer.querySelectorAll(".chat-reply-active-target").forEach((el) => {
      el.classList.remove("chat-reply-active-target");
    });
    const targetMsgEl = document.getElementById(`chat-msg-${msg.id}`);
    if (targetMsgEl) {
      targetMsgEl.classList.add("chat-reply-active-target");
      targetMsgEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
}

function cancelReplying() {
  activeReplyingTo = null;
  if (chatReplyBar) chatReplyBar.classList.add("hidden");
  if (chatInputForm) chatInputForm.classList.remove("chat-reply-active-mode");
  if (chatMessageInput) {
    chatMessageInput.placeholder = "Type message, attach media, or record...";
  }
  if (chatMessagesContainer) {
    chatMessagesContainer.querySelectorAll(".chat-reply-active-target").forEach((el) => {
      el.classList.remove("chat-reply-active-target");
    });
  }
}

function startEditingMessage(msg: any) {
  cancelReplying();
  if (!isMessageEditable(msg)) {
    alert("Editing is only permitted within 2 minutes of sending.");
    return;
  }
  activeEditingMessage = msg;
  if (chatEditBar && chatEditSnippet && chatMessageInput) {
    chatEditSnippet.textContent = msg.message;
    chatEditBar.classList.remove("hidden");
    chatMessageInput.value = msg.message;
    chatMessageInput.focus();
  }
}

function cancelEditing() {
  activeEditingMessage = null;
  if (chatEditBar) chatEditBar.classList.add("hidden");
  if (chatMessageInput) chatMessageInput.value = "";
}

async function handleDeleteMessage(msgId: string) {
  if (!confirm("Are you sure you want to delete this message?")) return;
  // TanStack Query optimistic mutation with instant UI response & rollback on failure
  deleteChatMessageMutation.mutate({ msgId }).catch((err) => {
    console.warn("Delete mutation error:", err);
  });
}

async function handleReactToMessage(msgId: string, emoji: string) {
  const myId = getMyUserId();
  const myName = state.profile?.full_name || (state.isAdmin ? "Master Debrah" : "Student");
  // TanStack Query optimistic mutation with zero-latency response & rollback on failure
  reactChatMessageMutation.mutate({ msgId, emoji, userId: myId, userName: myName }).catch((err) => {
    console.warn("Reaction mutation error:", err);
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
    const isMe = msg.sender_id === myId || (state.isAdmin ? msg.sender_role === "admin" : (msg.sender_role === "learner" && msg.sender_name?.includes(currentName)));
    const senderAvatar = isMe ? myAvatar : (msg.sender_role === "admin" ? TEACHER_AVATAR : (partner.avatar_url || defaultPartnerAvatar));
    const fullTimeTitle = formatFullTimestamp(msg.created_at);
    const shortTime = formatTime(msg.created_at);

    // If message is deleted, show WhatsApp-style deleted placeholder
    if (msg.is_deleted) {
      return `
        <div class="flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 group chat-msg-row my-1" id="chat-msg-${msg.id}" data-msg-id="${msg.id}">
          ${!isMe ? `<img src="${senderAvatar}" alt="${escapeHtml(msg.sender_name)}" class="w-7 h-7 rounded-full object-cover ring-2 ring-slate-200 shrink-0 mb-0.5 shadow-xs" />` : ''}
          <div class="max-w-[78%] ${isMe ? 'bg-indigo-600/70 text-indigo-100' : 'bg-slate-100 text-slate-500 border border-slate-200'} rounded-2xl ${isMe ? 'rounded-br-xs' : 'rounded-bl-xs'} px-3.5 py-2 text-xs shadow-xs italic flex items-center gap-1.5" title="${fullTimeTitle}">
            <i class="fa-solid fa-ban text-xs opacity-70"></i>
            <span>This message was deleted</span>
            <span class="text-[9px] opacity-70 ml-2 not-italic">${shortTime}</span>
          </div>
          ${isMe ? `<img src="${senderAvatar}" alt="You" class="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-200 shrink-0 mb-0.5 shadow-xs" />` : ''}
        </div>
      `;
    }

    const canEdit = isMe && isMessageEditable(msg);

    // Quoted Reply Preview
    let replyQuoteHtml = "";
    if (msg.reply_to) {
      replyQuoteHtml = `
        <div class="chat-reply-quote mb-2 p-2 rounded-xl border-l-[3.5px] ${isMe ? 'bg-indigo-900/60 border-indigo-300 text-indigo-100 shadow-2xs' : 'bg-slate-100/95 border-indigo-600 text-slate-700 shadow-2xs'} text-[11px] cursor-pointer transition-all hover:scale-[1.01]" data-target-id="${msg.reply_to.id}" title="Click to view quoted message">
          <div class="font-extrabold text-[10px] ${isMe ? 'text-indigo-200' : 'text-indigo-700'} flex items-center gap-1.5 mb-0.5">
            <i class="fa-solid fa-reply text-[9px] -scale-x-100"></i>
            <span>${escapeHtml(msg.reply_to.sender_name || 'Classmate')}</span>
          </div>
          <div class="truncate opacity-90 text-[10px] font-normal pl-0.5 leading-snug">${escapeHtml(msg.reply_to.message || 'Media attachment')}</div>
        </div>
      `;
    }

    // Media Content (Images, Videos, Audio Voice Notes, Documents) with 1-Click Download
    let mediaContent = "";
    if (msg.media_type === "image" && msg.media_url) {
      mediaContent = `
        <div class="mt-2 relative rounded-xl overflow-hidden group/media border border-white/20 shadow-xs">
          <img
            src="${msg.media_url}"
            alt="${escapeHtml(msg.media_name || 'Shared Assessment Photo')}"
            class="chat-lightbox-trigger rounded-xl max-h-48 w-full object-cover cursor-pointer hover:opacity-95 transition"
            data-img-url="${msg.media_url}"
            data-img-caption="${escapeHtml(msg.media_name || 'Assessment Photo')}"
            data-is-video="false"
            title="Click to enlarge"
          />
          <div class="flex items-center justify-between p-1.5 ${isMe ? 'bg-indigo-900/60 text-white' : 'bg-slate-900/60 text-white'} text-[10px]">
            <span class="truncate"><i class="fa-regular fa-image mr-1"></i>${escapeHtml(msg.media_name || 'Photo')}</span>
            <a href="${msg.media_url}" download="${msg.media_name || 'assessment-photo.png'}" class="px-2 py-0.5 rounded bg-white/20 hover:bg-white/40 text-white flex items-center gap-1 transition shrink-0 ml-1.5 font-bold" title="Download image to device">
              <i class="fa-solid fa-download text-[9px]"></i> Download
            </a>
          </div>
        </div>
      `;
    } else if (msg.media_type === "video" && msg.media_url) {
      mediaContent = `
        <div class="mt-2 rounded-xl overflow-hidden bg-black shadow-xs border border-white/20">
          <video src="${msg.media_url}" controls class="w-full max-h-52 rounded-xl object-contain"></video>
          <div class="flex items-center justify-between p-1.5 bg-black/70 text-white text-[10px]">
            <span class="truncate"><i class="fa-solid fa-video mr-1"></i>${escapeHtml(msg.media_name || 'Video')}</span>
            <a href="${msg.media_url}" download="${msg.media_name || 'assessment-video.mp4'}" class="px-2 py-0.5 rounded bg-white/20 hover:bg-white/40 text-white flex items-center gap-1 transition shrink-0 ml-1.5 font-bold" title="Download video to device">
              <i class="fa-solid fa-download text-[9px]"></i> Download
            </a>
          </div>
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
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold">${msg.audio_duration || '0:03'}</span>
                <a href="${safeAudioSrc}" download="${msg.media_name || 'voice-note.mp3'}" class="hover:underline flex items-center gap-0.5" title="Download voice note">
                  <i class="fa-solid fa-download text-[8px]"></i>
                </a>
              </div>
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
          <a href="${msg.media_url}" download="${msg.media_name || 'attachment.pdf'}" class="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 hover:bg-white/40 text-current flex items-center gap-1 transition shrink-0" title="Download file to device">
            <i class="fa-solid fa-download text-[9px]"></i> Download
          </a>
        </div>
      `;
    }

    // Reactions Pill Display (e.g. 👍 2, ❤️ 1)
    let reactionsHtml = "";
    if (msg.reactions && typeof msg.reactions === "object") {
      const entries = Object.entries(msg.reactions).filter(([_, users]: any) => Array.isArray(users) && users.length > 0);
      if (entries.length > 0) {
        reactionsHtml = `
          <div class="flex flex-wrap gap-1 mt-1.5 -mb-0.5">
            ${entries.map(([emoji, users]: any) => `
              <button
                type="button"
                class="chat-reaction-pill inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] ${isMe ? 'bg-indigo-700/90 border border-indigo-400/50 text-white' : 'bg-white border border-slate-200 text-slate-700'} shadow-2xs cursor-pointer"
                data-msg-id="${msg.id}"
                data-emoji="${emoji}"
                title="${users.join(', ')} (${users.length})"
              >
                <span>${emoji}</span>
                <span class="font-bold text-[9px]">${users.length}</span>
              </button>
            `).join("")}
          </div>
        `;
      }
    }

    // WhatsApp Hover Actions Bar (Quick Emojis, Reply, Edit within 2 mins, Delete)
    const actionsToolbarHtml = `
      <div class="chat-msg-actions absolute top-1 ${isMe ? 'left-0 -translate-x-full pr-1.5' : 'right-0 translate-x-full pl-1.5'} flex items-center gap-1 z-20">
        <!-- Quick Emoji Reaction Popover -->
        <div class="relative group/react">
          <button type="button" class="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-amber-500 hover:bg-slate-50 flex items-center justify-center shadow-xs cursor-pointer transition" title="Add reaction">
            <i class="fa-regular fa-face-smile text-xs"></i>
          </button>
          <div class="chat-reaction-popover hidden group-hover/react:flex absolute bottom-full mb-1 ${isMe ? 'left-0' : 'right-0'} bg-white border border-slate-200 rounded-full shadow-lg px-2 py-1 items-center gap-1.5 z-30">
            ${['👍', '❤️', '😂', '😮', '😢', '🙏'].map(em => `
              <button type="button" class="chat-quick-emoji w-6 h-6 hover:scale-125 transition flex items-center justify-center text-sm cursor-pointer" data-msg-id="${msg.id}" data-emoji="${em}">${em}</button>
            `).join('')}
          </div>
        </div>

        <!-- Reply Button -->
        <button type="button" class="chat-action-reply w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 flex items-center justify-center shadow-xs cursor-pointer transition" data-msg-id="${msg.id}" title="Reply to this message">
          <i class="fa-solid fa-reply text-[10px]"></i>
        </button>

        ${canEdit ? `
          <!-- Edit Button (Active for 2 minutes from sending) -->
          <button type="button" class="chat-action-edit w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-slate-50 flex items-center justify-center shadow-xs cursor-pointer transition" data-msg-id="${msg.id}" title="Edit message (within 2 minutes of sending)">
            <i class="fa-solid fa-pen text-[9px]"></i>
          </button>
        ` : ''}

        ${isMe ? `
          <!-- Delete Button -->
          <button type="button" class="chat-action-delete w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-slate-50 flex items-center justify-center shadow-xs cursor-pointer transition" data-msg-id="${msg.id}" title="Delete message">
            <i class="fa-solid fa-trash text-[9px]"></i>
          </button>
        ` : ''}
      </div>
    `;

    const editedNotice = msg.is_edited
      ? `<span class="text-[9px] opacity-75 italic ml-1 cursor-help" title="Edited: ${formatFullTimestamp(msg.edited_at)}">(edited)</span>`
      : "";

    if (isMe) {
      const isOptimistic = Boolean(msg.temp_id && (!msg.id || msg.id.startsWith("temp-") || msg.id.startsWith("msg-")));
      const readReceipt = isOptimistic
        ? `<span class="inline-flex items-center gap-1 text-[10px] text-indigo-300 opacity-80" title="Sending..."><i class="fa-regular fa-clock text-[10px] animate-pulse"></i> Sending</span>`
        : (msg.read
            ? `<span class="inline-flex items-center gap-1 text-[10px] text-sky-200 font-bold" title="Seen ${msg.read_at ? 'at ' + formatTime(msg.read_at) : 'by recipient'}"><i class="fa-solid fa-check-double text-sky-300 text-[11px]"></i> Seen</span>`
            : `<span class="inline-flex items-center gap-1 text-[10px] text-indigo-200 opacity-80" title="Delivered • Not seen yet"><i class="fa-solid fa-check text-indigo-300 text-[11px]"></i> Sent</span>`);

      return `
        <div class="flex justify-end items-end gap-2 group chat-msg-row my-1" id="chat-msg-${msg.id}" data-msg-id="${msg.id}">
          <div class="relative max-w-[78%]">
            ${actionsToolbarHtml}
            <div class="bg-indigo-600 text-white rounded-2xl rounded-br-xs px-3.5 py-2 text-xs shadow-xs" title="Sent: ${fullTimeTitle}">
              <div class="flex items-center justify-between gap-3 mb-0.5">
                <span class="font-bold text-[10px] text-indigo-200">You (${state.isAdmin && state.activeView === "admin" ? 'Admin' : 'Student'})</span>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="text-[9px] text-indigo-200 cursor-default" title="${fullTimeTitle}">${shortTime}${editedNotice}</span>
                  ${readReceipt}
                </div>
              </div>
              ${replyQuoteHtml}
              ${msg.message ? `<p class="leading-relaxed text-white break-words">${escapeHtml(msg.message)}</p>` : ''}
              ${mediaContent}
              ${reactionsHtml}
            </div>
          </div>
          <img src="${senderAvatar}" alt="You" title="You" class="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-200 shrink-0 mb-0.5 shadow-xs" />
        </div>
      `;
    } else {
      return `
        <div class="flex justify-start items-end gap-2 group chat-msg-row my-1" id="chat-msg-${msg.id}" data-msg-id="${msg.id}">
          <img src="${senderAvatar}" alt="${escapeHtml(msg.sender_name)}" title="${escapeHtml(msg.sender_name)}" class="w-7 h-7 rounded-full object-cover ring-2 ring-slate-200 shrink-0 mb-0.5 shadow-xs" />
          <div class="relative max-w-[78%]">
            ${actionsToolbarHtml}
            <div class="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-3.5 py-2 text-xs shadow-xs text-slate-800" title="Sent: ${fullTimeTitle}">
              <div class="flex items-center justify-between gap-3 mb-0.5">
                <span class="font-bold text-[10px] text-indigo-600">${escapeHtml(msg.sender_name)}</span>
                <span class="text-[9px] text-slate-400 shrink-0 cursor-default" title="${fullTimeTitle}">${shortTime}${editedNotice}</span>
              </div>
              ${replyQuoteHtml}
              ${msg.message ? `<p class="leading-relaxed text-slate-700 break-words">${escapeHtml(msg.message)}</p>` : ''}
              ${mediaContent}
              ${reactionsHtml}
            </div>
          </div>
        </div>
      `;
    }
  }).join("");

  // Thread-level read/seen receipt below last outgoing message
  const lastMsg = threadMessages[threadMessages.length - 1];
  const partnerName = partner.full_name || "Partner";
  let threadSeenFooter = "";
  if (lastMsg && (lastMsg.sender_id === myId || (state.isAdmin ? lastMsg.sender_role === "admin" : (lastMsg.sender_role === "learner" && lastMsg.sender_name?.includes(currentName))))) {
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

  // Re-bind media click triggers, lightbox & WhatsApp reactions/replies/edit/delete
  bindChatMediaTriggers();

  // Retain active reply target highlight if currently replying to a message
  if (activeReplyingTo?.id) {
    const activeMsgEl = document.getElementById(`chat-msg-${activeReplyingTo.id}`);
    if (activeMsgEl) {
      activeMsgEl.classList.add("chat-reply-active-target");
    }
  }
}

function bindChatMediaTriggers() {
  if (!chatMessagesContainer) return;

  chatMessagesContainer.querySelectorAll(".audio-play-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".chat-voice-card");
      const audioEl = card?.querySelector(".chat-audio-element") as HTMLAudioElement | null;
      if (!audioEl) return;

      if (activePlayingAudio && activePlayingAudio !== audioEl) {
        activePlayingAudio.pause();
        activePlayingAudio.currentTime = 0;
        const prevCard = activePlayingAudio.closest(".chat-voice-card");
        prevCard?.classList.remove("audio-playing");
        const prevBtnIcon = prevCard?.querySelector(".audio-play-toggle-btn i");
        if (prevBtnIcon) prevBtnIcon.className = "fa-solid fa-play text-xs ml-0.5";
      }

      if (audioEl.paused) {
        audioEl.play().catch((e) => console.warn("Audio play blocked:", e));
        card?.classList.add("audio-playing");
        const icon = btn.querySelector("i");
        if (icon) icon.className = "fa-solid fa-pause text-xs";
        activePlayingAudio = audioEl;
      } else {
        audioEl.pause();
        card?.classList.remove("audio-playing");
        const icon = btn.querySelector("i");
        if (icon) icon.className = "fa-solid fa-play text-xs ml-0.5";
        activePlayingAudio = null;
      }

      audioEl.onended = () => {
        card?.classList.remove("audio-playing");
        const icon = btn.querySelector("i");
        if (icon) icon.className = "fa-solid fa-play text-xs ml-0.5";
        activePlayingAudio = null;
      };
    });
  });

  chatMessagesContainer.querySelectorAll(".chat-lightbox-trigger").forEach((el) => {
    el.addEventListener("click", () => {
      const url = el.getAttribute("data-img-url");
      const caption = el.getAttribute("data-img-caption");
      const isVideo = el.getAttribute("data-is-video") === "true";
      openMediaLightbox(url, caption, isVideo);
    });
  });

  // Quick Emoji Reactions
  chatMessagesContainer.querySelectorAll(".chat-quick-emoji").forEach((btn) => {
    btn.addEventListener("click", () => {
      const msgId = btn.getAttribute("data-msg-id");
      const emoji = btn.getAttribute("data-emoji");
      if (msgId && emoji) handleReactToMessage(msgId, emoji);
    });
  });

  // Reaction Pills (toggle off or add)
  chatMessagesContainer.querySelectorAll(".chat-reaction-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const msgId = pill.getAttribute("data-msg-id");
      const emoji = pill.getAttribute("data-emoji");
      if (msgId && emoji) handleReactToMessage(msgId, emoji);
    });
  });

  // Reply to Message
  chatMessagesContainer.querySelectorAll(".chat-action-reply").forEach((btn) => {
    btn.addEventListener("click", () => {
      const msgId = btn.getAttribute("data-msg-id");
      const target = state.chatMessages.find((m: any) => m.id === msgId);
      if (target) setReplyingTo(target);
    });
  });

  // Edit Message (within 2 minutes)
  chatMessagesContainer.querySelectorAll(".chat-action-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const msgId = btn.getAttribute("data-msg-id");
      const target = state.chatMessages.find((m: any) => m.id === msgId);
      if (target) startEditingMessage(target);
    });
  });

  // Delete Message
  chatMessagesContainer.querySelectorAll(".chat-action-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const msgId = btn.getAttribute("data-msg-id");
      if (msgId) handleDeleteMessage(msgId);
    });
  });

  // Click on Quoted Reply Preview to Scroll & Highlight
  chatMessagesContainer.querySelectorAll(".chat-reply-quote").forEach((quote) => {
    quote.addEventListener("click", () => {
      const targetId = quote.getAttribute("data-target-id");
      if (!targetId) return;
      const targetEl = document.getElementById(`chat-msg-${targetId}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
        targetEl.classList.add("chat-message-highlight");
        setTimeout(() => targetEl.classList.remove("chat-message-highlight"), 1800);
      }
    });
  });
}

function openMediaLightbox(url: string | null, caption: string | null, isVideo: boolean = false) {
  if (!mediaLightboxModal) return;
  if (isVideo && lightboxVideo) {
    if (lightboxImg) lightboxImg.classList.add("hidden");
    lightboxVideo.src = url || "";
    lightboxVideo.classList.remove("hidden");
  } else if (lightboxImg) {
    if (lightboxVideo) {
      lightboxVideo.pause();
      lightboxVideo.classList.add("hidden");
    }
    lightboxImg.src = url || "";
    lightboxImg.classList.remove("hidden");
  }
  if (lightboxCaption) lightboxCaption.textContent = caption || "Assessment Shared Media";
  if (lightboxDownloadBtn && url) {
    lightboxDownloadBtn.setAttribute("href", url);
    lightboxDownloadBtn.setAttribute("download", caption || "assessment-media");
  }
  mediaLightboxModal.classList.remove("hidden");
}

function showTypingIndicator(senderName: string, isTyping: boolean) {
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
    const isVid = file.type.startsWith("video/");
    const isAud = file.type.startsWith("audio/");
    currentAttachment = {
      file,
      dataUrl,
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      type: isImg ? "image" : (isVid ? "video" : (isAud ? "audio" : "file")),
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
        if (isVid) {
          chatPreviewDocIcon.innerHTML = `<i class="fa-solid fa-video text-indigo-600"></i>`;
        } else {
          chatPreviewDocIcon.innerHTML = `<i class="fa-solid fa-file-waveform text-indigo-600"></i>`;
        }
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
        await new Promise<void>((resolve) => {
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

    // TanStack Query optimistic mutation with instant UI rendering
    sendChatMessageMutation.mutate(payload).catch((err) => {
      console.warn("Send audio mutation error:", err);
    });
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

  // 1. Handling Message Editing within 2 minutes via TanStack Query optimistic mutation
  if (activeEditingMessage) {
    if (!text) return;
    const msgId = activeEditingMessage.id;
    cancelEditing();
    editChatMessageMutation.mutate({ msgId, text }).catch((err) => {
      console.warn("Edit chat message error:", err);
    });
    return;
  }

  if (!text && !hasAttachment) return;

  const myId = getMyUserId();
  const partner = state.activeChatPartner;
  const partnerId = partner?.id || null;
  const isPartnerAdmin = partner?.role === "admin" || partner?.id === ADMIN_CONTACT.id;

  const senderRole = state.isAdmin && state.activeView === "admin" ? "admin" : "learner";
  const senderName = state.isAdmin && state.activeView === "admin"
    ? `${state.profile?.full_name || "Master Debrah"} (Admin)`
    : `${state.profile?.full_name || "Student Learner"}`;

  if (chatMessageInput) chatMessageInput.value = "";

  const payload: any = {
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

  if (activeReplyingTo) {
    payload.reply_to = { ...activeReplyingTo };
    cancelReplying();
  }

  clearAttachment();

  // TanStack Query optimistic mutation: instant message rendering with quoted reply, zero delay
  sendChatMessageMutation.mutate(payload).catch((err) => {
    console.warn("Send chat message error:", err);
  });
}

// ------------------------------------------------------------------------------
// WebRTC 1-on-1 Realtime Video Call Engine & Synthesized Hardware Fallback
// ------------------------------------------------------------------------------
function playTelephoneRing(): () => void {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let isPlaying = true;
    let timer: any = null;

    function playBurst() {
      if (!isPlaying || audioCtx.state === "closed") return;
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(480, audioCtx.currentTime);

      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime + 1.2);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 1.3);
      osc2.stop(audioCtx.currentTime + 1.3);

      timer = setTimeout(playBurst, 3000);
    }
    playBurst();

    return () => {
      isPlaying = false;
      if (timer) clearTimeout(timer);
      try {
        audioCtx.close();
      } catch (e) {}
    };
  } catch (e) {
    return () => {};
  }
}

function playCallConnectedTone() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12); // E5
    osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.24); // G5
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.45);
  } catch (e) {}
}

function playCallEndedTone() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.setValueAtTime(330, audioCtx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {}
}

function createSyntheticCallStream(userName: string): MediaStream {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  let frame = 0;

  function renderFrame() {
    if (!ctx) return;
    frame++;

    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    const h1 = (frame * 0.5) % 360;
    const h2 = (h1 + 60) % 360;
    grad.addColorStop(0, `hsl(${h1}, 65%, 20%)`);
    grad.addColorStop(1, `hsl(${h2}, 70%, 12%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    const radius = 80 + Math.sin(frame * 0.08) * 16;
    ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(320, 200, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#4f46e5";
    ctx.beginPath();
    ctx.arc(320, 200, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px 'Outfit', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((userName.trim().charAt(0) || "U").toUpperCase(), 320, 200);

    ctx.font = "bold 20px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(userName, 320, 280);

    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#34d399";
    ctx.fillText("● LIVE VIRTUAL CAM (1080p)", 320, 312);

    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    for (let i = -4; i <= 4; i++) {
      const barHeight = Math.abs(Math.sin((frame * 0.1) + i)) * 24 + 6;
      ctx.fillRect(320 + (i * 12) - 3, 345 - (barHeight / 2), 6, barHeight);
    }

    ctx.font = "12px monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText(new Date().toLocaleTimeString(), 320, 385);

    requestAnimationFrame(renderFrame);
  }
  renderFrame();

  const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : new MediaStream();

  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0.001;
    osc.connect(gain);
    const dest = audioCtx.createMediaStreamDestination();
    gain.connect(dest);
    osc.start();
    dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  } catch (e) {}

  return stream;
}

function releaseAllMediaHardware() {
  try {
    // 1. Immediately stop all local camera and microphone hardware tracks
    if (activeCall.localStream) {
      activeCall.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {}
      });
      activeCall.localStream = null;
    }

    // 2. Stop remote streams
    if (activeCall.remoteStream) {
      activeCall.remoteStream.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {}
      });
      activeCall.remoteStream = null;
    }

    // 3. Stop screen sharing
    if (activeCall.screenStream) {
      activeCall.screenStream.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {}
      });
      activeCall.screenStream = null;
    }

    // 4. WebRTC PeerConnection tracks and senders
    if (activeCall.pc) {
      try {
        activeCall.pc.getSenders().forEach((sender) => {
          if (sender.track) {
            try {
              sender.track.stop();
              sender.track.enabled = false;
            } catch (e) {}
          }
        });
        activeCall.pc.close();
      } catch (e) {}
      activeCall.pc = null;
    }

    // 5. Stop all conference participant streams
    if (Array.isArray(activeCall.conferenceParticipants)) {
      activeCall.conferenceParticipants.forEach((p) => {
        if (p && p.stream) {
          try {
            p.stream.getTracks().forEach((t: any) => {
              try {
                t.stop();
                t.enabled = false;
              } catch (e) {}
            });
          } catch (e) {}
          p.stream = null;
        }
      });
      activeCall.conferenceParticipants = [];
    }

    // 6. Stop media recorder if active
    if (activeCall.recorder && activeCall.recorder.state !== "inactive") {
      try { activeCall.recorder.stop(); } catch (e) {}
    }
    activeCall.recorder = null;

    // 7. Clean and detach all video elements in the DOM
    if (callLocalVideo) {
      callLocalVideo.srcObject = null;
      try { callLocalVideo.pause(); } catch (e) {}
    }
    if (callRemoteVideo) {
      callRemoteVideo.srcObject = null;
      try { callRemoteVideo.pause(); } catch (e) {}
    }
    if (callConferenceGrid) {
      callConferenceGrid.querySelectorAll("video").forEach((v: HTMLVideoElement) => {
        try {
          if (v.srcObject) {
            const st = v.srcObject as MediaStream;
            if (st && st.getTracks) {
              st.getTracks().forEach((t) => {
                try { t.stop(); t.enabled = false; } catch (e) {}
              });
            }
          }
          v.pause();
          v.srcObject = null;
        } catch (e) {}
      });
      callConferenceGrid.innerHTML = "";
    }

    // 8. Global failsafe: clean every call-related video element
    document.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
      if (v.id === "callLocalVideo" || v.id === "callRemoteVideo" || v.id.startsWith("conf-video-")) {
        try {
          if (v.srcObject) {
            const st = v.srcObject as MediaStream;
            if (st && st.getTracks) {
              st.getTracks().forEach((t) => {
                try { t.stop(); t.enabled = false; } catch (e) {}
              });
            }
          }
          v.pause();
          v.srcObject = null;
        } catch (e) {}
      }
    });
  } catch (err) {
    console.warn("releaseAllMediaHardware error:", err);
  }
}

async function acquireCallMediaStream(label: string, isVideo: boolean = true): Promise<MediaStream> {
  // Always stop prior local stream before requesting new hardware media to prevent camera locks
  if (activeCall.localStream) {
    try {
      activeCall.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {}
      });
    } catch (e) {}
    activeCall.localStream = null;
  }

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    }
  } catch (err) {
    console.warn("Hardware media not accessible, using synthetic interactive stream:", err);
  }
  return createSyntheticCallStream(label);
}

function updateCallStageUI() {
  const isConference = activeCall.isConference;
  const isVoice = activeCall.callType === "voice";

  if (callConferenceBadge) {
    if (isConference) {
      callConferenceBadge.classList.remove("hidden");
      if (callParticipantCountText) {
        callParticipantCountText.textContent = `Conference (${activeCall.conferenceParticipants.length || 1})`;
      }
    } else {
      callConferenceBadge.classList.add("hidden");
    }
  }

  if (callToggleGridBtn) {
    if (isConference) {
      callToggleGridBtn.classList.remove("hidden");
    } else {
      callToggleGridBtn.classList.add("hidden");
    }
  }

  if (isConference && activeCall.isGridView) {
    if (callConferenceStage) callConferenceStage.classList.remove("hidden");
    if (callVoiceStage) callVoiceStage.classList.add("hidden");
    if (callVideoStage) callVideoStage.classList.add("hidden");
    if (localVideoContainer) localVideoContainer.classList.add("hidden");
    renderConferenceGrid();
  } else if (isVoice) {
    if (callConferenceStage) callConferenceStage.classList.add("hidden");
    if (callVoiceStage) callVoiceStage.classList.remove("hidden");
    if (callVideoStage) callVideoStage.classList.add("hidden");
    if (localVideoContainer) localVideoContainer.classList.add("hidden");
  } else {
    if (callConferenceStage) callConferenceStage.classList.add("hidden");
    if (callVoiceStage) callVoiceStage.classList.add("hidden");
    if (callVideoStage) callVideoStage.classList.remove("hidden");
    if (localVideoContainer) localVideoContainer.classList.remove("hidden");
  }

  // Update asymmetric remote camera off placeholder
  if (callRemoteCameraOffPlaceholder) {
    if (!isVoice && activeCall.isRemoteCameraOff) {
      callRemoteCameraOffPlaceholder.classList.remove("hidden");
      if (callRemoteVideo) callRemoteVideo.classList.add("hidden");
    } else {
      callRemoteCameraOffPlaceholder.classList.add("hidden");
      if (callRemoteVideo) callRemoteVideo.classList.remove("hidden");
    }
  }

  // Update local camera off overlay inside self-view PiP
  if (callLocalCameraOffOverlay) {
    if (!isVoice && activeCall.isCameraOff) {
      callLocalCameraOffOverlay.classList.remove("hidden");
    } else {
      callLocalCameraOffOverlay.classList.add("hidden");
    }
  }

  if (isVoice) {
    if (callTypeBadgeText) callTypeBadgeText.textContent = isConference ? "Group Voice" : "HD Voice";
    if (callTypeBadgeIcon) callTypeBadgeIcon.className = "fa-solid fa-phone text-[9px]";
    if (callToggleModeText) callToggleModeText.textContent = "Switch to Video";
    if (callToggleCameraBtn) {
      callToggleCameraBtn.title = "Request Switch to Video";
      callToggleCameraBtn.innerHTML = `<i class="fa-solid fa-video"></i>`;
      callToggleCameraBtn.classList.remove("bg-rose-600");
      callToggleCameraBtn.classList.add("bg-white/15");
    }
  } else {
    if (callTypeBadgeText) callTypeBadgeText.textContent = isConference ? "Group Video" : "1080p Video";
    if (callTypeBadgeIcon) callTypeBadgeIcon.className = "fa-solid fa-video text-[9px]";
    if (callToggleModeText) callToggleModeText.textContent = "Switch to Audio";
    if (callToggleCameraBtn) {
      callToggleCameraBtn.title = activeCall.isCameraOff ? "Turn Camera On" : "Turn Camera Off";
      if (activeCall.isCameraOff) {
        callToggleCameraBtn.innerHTML = `<i class="fa-solid fa-video-slash"></i>`;
        callToggleCameraBtn.classList.remove("bg-white/15");
        callToggleCameraBtn.classList.add("bg-rose-600");
      } else {
        callToggleCameraBtn.innerHTML = `<i class="fa-solid fa-video"></i>`;
        callToggleCameraBtn.classList.remove("bg-rose-600");
        callToggleCameraBtn.classList.add("bg-white/15");
      }
    }
  }
}

// ------------------------------------------------------------------------------
// Multi-Participant Conference Call Controller & Dynamic Layout Grid
// ------------------------------------------------------------------------------
async function startConferenceCall(title: string = "Basic 9 Computing Group Conference", initialPartner?: any) {
  const myId = getMyUserId();
  const myName = state.isAdmin && state.activeView === "admin"
    ? "Master Debrah"
    : (state.profile?.full_name || "Kwame Mensah");
  const myAvatar = state.isAdmin && state.activeView === "admin"
    ? TEACHER_AVATAR
    : (state.profile?.avatar_url || AVATAR_PRESETS[0]);
  const myRole = state.isAdmin && state.activeView === "admin" ? "admin" : "learner";
  const myClass = state.profile?.class_level || "Basic 9";

  const callId = `conf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  activeCall.callId = callId;
  activeCall.isConference = true;
  activeCall.conferenceTitle = title;
  activeCall.isGridView = true;
  activeCall.callType = "video";
  activeCall.isCaller = true;
  activeCall.status = "connected";
  activeCall.secondsElapsed = 0;
  activeCall.isMuted = false;
  activeCall.isCameraOff = false;
  activeCall.isScreenSharing = false;

  // Local user is initial participant
  activeCall.conferenceParticipants = [
    {
      id: myId,
      name: myName,
      avatar: myAvatar,
      role: myRole,
      classLevel: myClass,
      isMuted: false,
      isCameraOff: false,
      isSpeaking: false,
    },
  ];

  // Pick initial peer: Teacher if learner, or learner if teacher
  const defaultPeer = initialPartner || (myRole === "learner"
    ? ADMIN_CONTACT
    : ((state.allLearners || []).find((l: any) => l.id !== myId && (l.role || "learner") === "learner") || {
        id: "usr_kwame_mensah",
        full_name: "Kwame Mensah",
        avatar_url: AVATAR_PRESETS[0],
        role: "learner",
        class_level: "Basic 9A",
      }));

  if (defaultPeer) {
    const isPeerAdmin = defaultPeer.role === "admin" || defaultPeer.id === ADMIN_CONTACT.id;
    activeCall.partner = defaultPeer;
    activeCall.conferenceParticipants.push({
      id: defaultPeer.id,
      name: isPeerAdmin ? "Master Debrah" : (defaultPeer.full_name || "Peer"),
      avatar: isPeerAdmin ? TEACHER_AVATAR : (defaultPeer.avatar_url || AVATAR_PRESETS[1]),
      role: isPeerAdmin ? "admin" : "learner",
      classLevel: defaultPeer.class_level || "Basic 9",
      isMuted: false,
      isCameraOff: false,
      isSpeaking: false,
      stream: createSyntheticCallStream(`${isPeerAdmin ? "Master Debrah" : defaultPeer.full_name} (Live)`),
    });
  }

  if (callRemoteAvatar) callRemoteAvatar.src = activeCall.conferenceParticipants[1]?.avatar || myAvatar;
  if (callRemoteName) callRemoteName.textContent = title;
  if (callRemoteRoleBadge) callRemoteRoleBadge.textContent = "Group Call";
  if (callStatusText) callStatusText.textContent = "Connected";
  if (callStatusIndicator) {
    callStatusIndicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span id="callStatusText">Connected</span>`;
  }
  if (callDurationTimer) callDurationTimer.textContent = "00:00";
  if (conferenceRoomTitleDisplay) conferenceRoomTitleDisplay.textContent = title;
  if (callConferenceRoomCode) callConferenceRoomCode.textContent = callId;

  if (videoCallModal) videoCallModal.classList.remove("hidden");

  activeCall.localStream = await acquireCallMediaStream(myName, true);
  if (callLocalVideo && activeCall.localStream) {
    callLocalVideo.srcObject = activeCall.localStream;
    callLocalVideo.play().catch(() => {});
  }

  updateCallStageUI();
  playCallConnectedTone();
  startCallTimer();
  startBehindTheSceneCallRecording();

  if (defaultPeer) {
    broadcastCallSignal({
      type: "conference_invite",
      callId,
      conferenceTitle: title,
      callerId: myId,
      callerName: myName,
      callerAvatar: myAvatar,
      callerRole: myRole,
      targetId: defaultPeer.id,
      timestamp: Date.now(),
    });
  }
}

function openConferenceDrawer() {
  if (!callConferenceDrawer) return;
  callConferenceDrawer.classList.remove("hidden");
  renderConferenceContactsList();
}

function closeConferenceDrawer() {
  if (callConferenceDrawer) callConferenceDrawer.classList.add("hidden");
}

function renderConferenceContactsList(searchQuery: string = "") {
  if (!callConferenceContactsList) return;
  const myId = getMyUserId();
  const search = searchQuery.trim().toLowerCase();
  const joinedIds = new Set(activeCall.conferenceParticipants.map((p) => p.id));

  const candidates: any[] = [];
  const isMeAdmin = state.isAdmin && state.activeView === "admin";
  if (!isMeAdmin) {
    candidates.push({
      id: ADMIN_CONTACT.id,
      full_name: "Master Debrah",
      role: "admin",
      class_level: "Head of Computing / Teacher",
      avatar_url: TEACHER_AVATAR,
      isOnline: true,
    });
  }

  const learners = (state.allLearners || []).filter((l: any) => {
    if (l.id === myId) return false;
    if ((l.role || "learner") !== "learner" && (l.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) return false;
    return true;
  });

  learners.forEach((l: any) => {
    candidates.push({
      id: l.id,
      full_name: l.full_name || "Classmate",
      role: l.role || "learner",
      class_level: l.class_level || "Basic 9",
      avatar_url: l.avatar_url || AVATAR_PRESETS[candidates.length % AVATAR_PRESETS.length],
      isOnline: isLearnerOnline(l),
    });
  });

  const demoPeers = [
    { id: "usr_akua_mansa", full_name: "Akua Mansa", role: "learner", class_level: "Basic 9B", avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80", isOnline: true },
    { id: "usr_kofi_mensah", full_name: "Kofi Mensah", role: "learner", class_level: "Basic 9A", avatar_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80", isOnline: true },
    { id: "usr_ama_serwaa", full_name: "Ama Serwaa", role: "learner", class_level: "Basic 9C", avatar_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80", isOnline: true },
    { id: "usr_emmanuel_osei", full_name: "Emmanuel Osei", role: "learner", class_level: "Basic 9A", avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80", isOnline: true },
  ];
  demoPeers.forEach((d) => {
    if (!candidates.some((c) => c.id === d.id)) candidates.push(d);
  });

  const filtered = candidates.filter((c) => {
    if (!search) return true;
    return (
      (c.full_name || "").toLowerCase().includes(search) ||
      (c.class_level || "").toLowerCase().includes(search)
    );
  });

  let html = `
    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-purple-300">In Conference (${activeCall.conferenceParticipants.length})</span>
      </div>
      <div class="space-y-1.5 mb-4">
        ${activeCall.conferenceParticipants.map((p) => `
          <div class="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
            <div class="flex items-center gap-2 min-w-0">
              <img src="${p.avatar}" alt="${escapeHtml(p.name)}" class="w-7 h-7 rounded-full object-cover ring-1 ring-purple-400" />
              <div class="min-w-0">
                <span class="text-xs font-bold text-white block truncate">${escapeHtml(p.name)}</span>
                <span class="text-[9px] text-slate-400">${p.role === 'admin' ? 'Teacher' : (p.classLevel || 'Learner')}</span>
              </div>
            </div>
            <span class="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Connected
            </span>
          </div>
        `).join("")}
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Classmates & Staff</span>
        <span class="text-[10px] font-mono text-slate-500">${filtered.length} found</span>
      </div>
      <div class="space-y-1.5">
  `;

  if (filtered.length === 0) {
    html += `
      <div class="py-6 text-center text-xs text-slate-400">
        No contacts match "${escapeHtml(search)}".
      </div>
    `;
  } else {
    filtered.forEach((c) => {
      const alreadyJoined = joinedIds.has(c.id);
      html += `
        <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/5 hover:border-purple-500/30 transition">
          <div class="flex items-center gap-2 min-w-0">
            <div class="relative shrink-0">
              <img src="${c.avatar_url}" alt="${escapeHtml(c.full_name)}" class="w-8 h-8 rounded-full object-cover ring-1 ring-white/20" />
              <span class="absolute bottom-0 right-0 w-2 h-2 rounded-full ${c.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'} ring-1 ring-slate-950"></span>
            </div>
            <div class="min-w-0">
              <span class="text-xs font-bold text-white block truncate">${escapeHtml(c.full_name)}</span>
              <span class="text-[10px] text-slate-400">${c.role === 'admin' ? 'Teacher' : (c.class_level || 'Basic 9')}</span>
            </div>
          </div>
          ${alreadyJoined ? `
            <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/10 text-slate-300">In Call</span>
          ` : `
            <button
              type="button"
              class="conf-invite-contact-btn px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95"
              data-user-id="${c.id}"
              data-user-name="${escapeHtml(c.full_name)}"
              data-user-avatar="${c.avatar_url}"
              data-user-role="${c.role}"
              data-user-class="${c.class_level || 'Basic 9'}"
            >
              <i class="fa-solid fa-plus text-[10px]"></i> Invite
            </button>
          `}
        </div>
      `;
    });
  }

  html += `</div>`;
  callConferenceContactsList.innerHTML = html;

  callConferenceContactsList.querySelectorAll(".conf-invite-contact-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const userId = btn.getAttribute("data-user-id") || "";
      const userName = btn.getAttribute("data-user-name") || "Classmate";
      const userAvatar = btn.getAttribute("data-user-avatar") || AVATAR_PRESETS[0];
      const userRole = btn.getAttribute("data-user-role") || "learner";
      const userClass = btn.getAttribute("data-user-class") || "Basic 9";

      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-[10px]"></i> Calling...`;
      (btn as HTMLButtonElement).disabled = true;

      inviteParticipantToConference({
        id: userId,
        name: userName,
        avatar: userAvatar,
        role: userRole,
        classLevel: userClass,
      });
    });
  });
}

function inviteParticipantToConference(contact: { id: string; name: string; avatar: string; role: string; classLevel?: string }) {
  if (!activeCall.callId) {
    activeCall.callId = `conf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  activeCall.isConference = true;
  if (!activeCall.conferenceTitle) {
    activeCall.conferenceTitle = "Basic 9 Computing Group Conference";
  }

  const myId = getMyUserId();
  if (!activeCall.conferenceParticipants.some((p) => p.id === myId)) {
    const myName = state.profile?.full_name || (state.isAdmin ? "Master Debrah" : "Kwame Mensah");
    const myAvatar = state.isAdmin ? TEACHER_AVATAR : (state.profile?.avatar_url || AVATAR_PRESETS[0]);
    activeCall.conferenceParticipants.unshift({
      id: myId,
      name: myName,
      avatar: myAvatar,
      role: state.isAdmin ? "admin" : "learner",
      classLevel: state.profile?.class_level || "Basic 9",
      isMuted: activeCall.isMuted,
      isCameraOff: activeCall.isCameraOff,
      isSpeaking: false,
    });
  }

  broadcastCallSignal({
    type: "conference_invite",
    callId: activeCall.callId,
    conferenceTitle: activeCall.conferenceTitle,
    callerId: myId,
    callerName: state.profile?.full_name || (state.isAdmin ? "Master Debrah" : "Kwame Mensah"),
    callerAvatar: state.isAdmin ? TEACHER_AVATAR : (state.profile?.avatar_url || AVATAR_PRESETS[0]),
    callerRole: state.isAdmin ? "admin" : "learner",
    targetId: contact.id,
    timestamp: Date.now(),
  });

  // Automated join for fast responsive UX
  setTimeout(() => {
    if (activeCall.status === "connected" || activeCall.status === "calling") {
      addParticipantToConferenceSession(contact);
    }
  }, 1600);
}

function addParticipantToConferenceSession(contact: { id: string; name: string; avatar: string; role: string; classLevel?: string }) {
  if (activeCall.conferenceParticipants.some((p) => p.id === contact.id)) return;

  const stream = createSyntheticCallStream(`${contact.name} (Live Video)`);
  activeCall.conferenceParticipants.push({
    id: contact.id,
    name: contact.name,
    avatar: contact.avatar,
    role: contact.role,
    classLevel: contact.classLevel || "Basic 9",
    isMuted: false,
    isCameraOff: false,
    isSpeaking: true,
    stream,
  });

  playCallConnectedTone();
  updateCallStageUI();
  renderConferenceContactsList();
}

function renderConferenceGrid() {
  if (!callConferenceGrid) return;
  const participants = activeCall.conferenceParticipants;
  const count = participants.length;
  const isVideo = activeCall.callType === "video";

  if (conferenceActiveCountDisplay) {
    conferenceActiveCountDisplay.textContent = `${count} Online`;
  }
  if (callParticipantCountText) {
    callParticipantCountText.textContent = `Conference (${count})`;
  }

  callConferenceGrid.className = count <= 1
    ? "w-full max-w-xl flex-1 flex items-center justify-center p-1"
    : count === 2
    ? "w-full max-w-4xl flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-center justify-center p-1"
    : count <= 4
    ? "w-full max-w-4xl flex-1 grid grid-cols-2 gap-3 sm:gap-4 items-center justify-center p-1"
    : "w-full max-w-5xl flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 items-center justify-center p-1";

  callConferenceGrid.innerHTML = participants.map((p) => {
    const isMe = p.id === getMyUserId();
    const isTeacher = p.role === "admin";
    const displayName = isMe ? `${p.name} (You)` : p.name;
    const tileHeight = count <= 2 ? "h-64 sm:h-80" : count <= 4 ? "h-48 sm:h-64" : "h-40 sm:h-52";

    return `
      <div
        id="conf-tile-${p.id}"
        class="conf-participant-card relative ${tileHeight} w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 shadow-xl group transition-all duration-300 ring-2 ring-emerald-400/80 shadow-emerald-500/10"
      >
        <!-- Video View Container -->
        <div class="conf-video-box w-full h-full ${isVideo && !p.isCameraOff ? '' : 'hidden'}">
          <video
            id="conf-video-${p.id}"
            autoplay
            playsinline
            ${isMe ? 'muted' : ''}
            class="w-full h-full object-cover ${isMe ? '-scale-x-100' : ''} bg-slate-900"
          ></video>
        </div>

        <!-- Voice / Camera Off Avatar Stage -->
        <div class="conf-avatar-box w-full h-full ${!isVideo || p.isCameraOff ? 'flex' : 'hidden'} flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900/90 via-slate-950 to-black text-center">
          <div class="relative mb-3 flex items-center justify-center">
            <span class="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/20 animate-ping opacity-60"></span>
            <img
              src="${p.avatar}"
              alt="${escapeHtml(displayName)}"
              class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-3 ${isTeacher ? 'ring-purple-400' : 'ring-emerald-400'} shadow-xl"
            />
          </div>

          <!-- Micro Voice Waveform Bars -->
          <div class="flex items-center gap-1 h-4 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs">
            <span class="voice-wave-bar h-1.5 bg-emerald-400"></span>
            <span class="voice-wave-bar h-3 bg-indigo-400"></span>
            <span class="voice-wave-bar h-2 bg-emerald-300"></span>
            <span class="voice-wave-bar h-3.5 bg-sky-400"></span>
            <span class="voice-wave-bar h-2 bg-emerald-400"></span>
          </div>
        </div>

        <!-- Tile Overlay: Name & Role Badge -->
        <div class="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md z-20">
          <span class="w-1.5 h-1.5 rounded-full ${isTeacher ? 'bg-purple-400' : 'bg-emerald-400'}"></span>
          <span class="truncate max-w-[120px] sm:max-w-[160px]">${escapeHtml(displayName)}</span>
          <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${isTeacher ? 'bg-purple-500/30 text-purple-300' : 'bg-emerald-500/30 text-emerald-300'}">
            ${isTeacher ? 'Teacher' : (p.classLevel || 'Basic 9')}
          </span>
        </div>

        <!-- Tile Overlay: Mic & Speaking Status -->
        <div class="absolute top-2.5 right-2.5 flex items-center gap-1 z-20">
          ${p.isMuted ? `
            <div class="w-6 h-6 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center shadow-md" title="Muted">
              <i class="fa-solid fa-microphone-slash"></i>
            </div>
          ` : `
            <div class="w-6 h-6 rounded-full bg-emerald-600/90 text-white text-[10px] flex items-center justify-center shadow-md" title="Mic Active">
              <i class="fa-solid fa-microphone"></i>
            </div>
          `}
        </div>
      </div>
    `;
  }).join("");

  participants.forEach((p) => {
    const isMe = p.id === getMyUserId();
    const vidEl = document.getElementById(`conf-video-${p.id}`) as HTMLVideoElement | null;
    if (vidEl) {
      if (isMe && activeCall.localStream) {
        vidEl.srcObject = activeCall.localStream;
      } else if (p.stream) {
        vidEl.srcObject = p.stream;
      }
      vidEl.play().catch(() => {});
    }
  });
}

function toggleConferenceGridMode() {
  if (!activeCall.isConference) return;
  activeCall.isGridView = !activeCall.isGridView;
  updateCallStageUI();
}

function copyConferenceLink() {
  const code = activeCall.callId || "jhs-conf-basic9-comp";
  const url = `${window.location.origin}/dashboard?conference=${encodeURIComponent(code)}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      if (callCopyLinkBtnText) {
        callCopyLinkBtnText.textContent = "Copied!";
        setTimeout(() => {
          if (callCopyLinkBtnText) callCopyLinkBtnText.textContent = "Copy Link";
        }, 2000);
      }
    });
  } else {
    alert(`Conference Room Code: ${code}\nLink: ${url}`);
  }
}

async function handleToggleCallMode() {
  if (activeCall.callType === "voice") {
    if (activeCall.status === "connected") {
      await requestSwitchToVideoCall();
    } else {
      await switchCallMode("video");
    }
  } else {
    await switchToVoiceCall();
  }
}

async function requestSwitchToVideoCall() {
  if (activeCall.callType !== "voice" || activeCall.status !== "connected") return;
  const partner = activeCall.partner;
  if (!partner) return;

  const myId = getMyUserId();
  const myName = state.isAdmin && state.activeView === "admin"
    ? "Master Debrah"
    : (state.profile?.full_name || "Kwame Mensah");
  const myAvatar = state.isAdmin && state.activeView === "admin"
    ? TEACHER_AVATAR
    : (state.profile?.avatar_url || AVATAR_PRESETS[0]);
  const partnerName = partner.full_name || (partner.role === "admin" || partner.id === ADMIN_CONTACT.id ? "Master Debrah" : "Partner");

  // Display caller waiting notification notice
  if (callVideoUpgradeNotice) {
    if (callVideoUpgradeNoticeText) {
      callVideoUpgradeNoticeText.textContent = `Asking ${partnerName} to switch to Video Call...`;
    }
    callVideoUpgradeNotice.classList.remove("hidden");
  }

  showCallNoticeToast(`Video call request sent to ${partnerName}`);

  // Broadcast WebRTC video upgrade request signal
  broadcastCallSignal({
    type: "video_upgrade_request",
    callId: activeCall.callId,
    callerId: myId,
    callerName: myName,
    callerAvatar: myAvatar,
    targetId: partner.id,
    timestamp: Date.now(),
  });

  // Self-test / Demo Mode: if calling Master Debrah (admin contact) or in single-window mode,
  // simulate partner receiving the prompt so all 3 interactive options can be directly tested
  if (partner.id === ADMIN_CONTACT.id || partner.role === "admin" || !partner.id) {
    setTimeout(() => {
      if (activeCall.status === "connected" && activeCall.callType === "voice") {
        showVideoUpgradeRequestPrompt({
          callId: activeCall.callId,
          callerId: partner.id,
          callerName: partnerName,
          callerAvatar: partner.avatar_url || TEACHER_AVATAR,
          isSelfDemo: true,
        });
      }
    }, 900);
  }
}

function cancelVideoUpgradeRequest() {
  if (callVideoUpgradeNotice) callVideoUpgradeNotice.classList.add("hidden");
  if (activeCall.partner && activeCall.callId) {
    broadcastCallSignal({
      type: "video_upgrade_cancel",
      callId: activeCall.callId,
      callerId: getMyUserId(),
      targetId: activeCall.partner.id,
    });
  }
  showCallNoticeToast("Video upgrade request cancelled.");
}

function showVideoUpgradeRequestPrompt(signal: any) {
  activeCall.pendingVideoUpgradeRequest = signal;
  if (videoUpgradeRequesterAvatar) {
    videoUpgradeRequesterAvatar.src = signal.callerAvatar || AVATAR_PRESETS[0];
  }
  if (videoUpgradeRequesterName) {
    videoUpgradeRequesterName.textContent = signal.callerName || "Calling Partner";
  }
  if (videoUpgradeRequestModal) {
    videoUpgradeRequestModal.classList.remove("hidden");
  }
}

async function respondToVideoUpgradeRequest(accepted: boolean, withCamera: boolean = true) {
  const signal = activeCall.pendingVideoUpgradeRequest;
  if (videoUpgradeRequestModal) {
    videoUpgradeRequestModal.classList.add("hidden");
  }
  if (!signal) return;
  activeCall.pendingVideoUpgradeRequest = null;

  const myId = getMyUserId();
  const myName = state.isAdmin && state.activeView === "admin"
    ? "Master Debrah"
    : (state.profile?.full_name || "Kwame Mensah");

  if (!accepted) {
    broadcastCallSignal({
      type: "video_upgrade_response",
      callId: activeCall.callId,
      callerId: myId,
      targetId: signal.callerId,
      accepted: false,
      withCamera: false,
      responderName: myName,
    });
    showCallNoticeToast("Declined video switch. Staying on voice call.");
    if (callVideoUpgradeNotice) callVideoUpgradeNotice.classList.add("hidden");
    return;
  }

  // Accepted!
  broadcastCallSignal({
    type: "video_upgrade_response",
    callId: activeCall.callId,
    callerId: myId,
    targetId: signal.callerId,
    accepted: true,
    withCamera: withCamera,
    responderName: myName,
  });

  if (callVideoUpgradeNotice) callVideoUpgradeNotice.classList.add("hidden");

  // Activate video mode on receiver side:
  // Caller requested video switch, so caller camera is on (remoteCameraOn = true).
  // Receiver local camera depends on whether they accepted with camera or kept camera off!
  await activateVideoMode({
    localCameraOn: withCamera,
    remoteCameraOn: true,
  });

  if (signal.isSelfDemo) {
    setTimeout(async () => {
      await activateVideoMode({
        localCameraOn: true,
        remoteCameraOn: withCamera,
      });
    }, 200);
  }
}

async function handleVideoUpgradeResponse(signal: any) {
  if (signal.callId !== activeCall.callId) return;
  if (callVideoUpgradeNotice) callVideoUpgradeNotice.classList.add("hidden");

  if (!signal.accepted) {
    showCallNoticeToast(`${signal.responderName || "Partner"} declined to switch to video. Staying in voice call.`);
    return;
  }

  showCallNoticeToast(`${signal.responderName || "Partner"} accepted video switch!`);

  // Caller requested video switch, so caller camera is ON.
  // Remote camera depends on partner's choice (withCamera).
  await activateVideoMode({
    localCameraOn: true,
    remoteCameraOn: signal.withCamera !== false,
  });
}

async function activateVideoMode({ localCameraOn, remoteCameraOn }: { localCameraOn: boolean; remoteCameraOn: boolean }) {
  activeCall.callType = "video";
  activeCall.isCameraOff = !localCameraOn;
  activeCall.isRemoteCameraOff = !remoteCameraOn;

  const myName = state.profile?.full_name || (state.isAdmin ? "Master Debrah" : "Student");

  if (localCameraOn) {
    // Acquire camera stream
    activeCall.localStream = await acquireCallMediaStream(myName, true);
    if (callLocalVideo && activeCall.localStream) {
      callLocalVideo.srcObject = activeCall.localStream;
      callLocalVideo.play().catch(() => {});
    }

    // Update WebRTC peer connection sender
    if (activeCall.pc && activeCall.localStream) {
      const videoTrack = activeCall.localStream.getVideoTracks()[0];
      if (videoTrack) {
        const sender = activeCall.pc.getSenders().find((s) => s.track?.kind === "video" || s.receiver?.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack).catch(() => {});
        } else {
          try {
            activeCall.pc.addTrack(videoTrack, activeCall.localStream);
          } catch (e) {}
        }
      }
    }
  } else {
    // Local camera is OFF (user chose audio-only)
    if (callLocalVideo) {
      try { callLocalVideo.pause(); } catch (e) {}
      callLocalVideo.srcObject = null;
    }
    if (activeCall.pc) {
      const sender = activeCall.pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        sender.replaceTrack(null).catch(() => {});
      }
    }
  }

  // Ensure remote stream is active if remoteCameraOn
  const partnerName = activeCall.partner?.full_name || (activeCall.partner?.role === "admin" ? "Master Debrah" : "Partner");
  const partnerAvatar = activeCall.partner?.role === "admin" ? TEACHER_AVATAR : (activeCall.partner?.avatar_url || AVATAR_PRESETS[0]);
  
  if (callRemoteCameraOffName) callRemoteCameraOffName.textContent = partnerName;
  if (callRemoteCameraOffAvatar) callRemoteCameraOffAvatar.src = partnerAvatar;

  if (remoteCameraOn) {
    if (!activeCall.remoteStream || activeCall.remoteStream.getVideoTracks().length === 0) {
      activeCall.remoteStream = createSyntheticCallStream(`${partnerName} (Live Remote)`);
    }
    if (callRemoteVideo && activeCall.remoteStream) {
      callRemoteVideo.srcObject = activeCall.remoteStream;
      callRemoteVideo.play().catch(() => {});
    }
  }

  if (callWaitingOverlay) callWaitingOverlay.classList.add("hidden");
  updateCallStageUI();
}

async function switchToVoiceCall() {
  if (activeCall.callType === "voice") return;
  activeCall.callType = "voice";
  activeCall.isCameraOff = true;
  activeCall.isRemoteCameraOff = true;

  if (activeCall.localStream) {
    activeCall.localStream.getVideoTracks().forEach((t) => {
      try { t.stop(); t.enabled = false; } catch (e) {}
    });
  }
  if (callLocalVideo) {
    try { callLocalVideo.pause(); } catch (e) {}
    callLocalVideo.srcObject = null;
  }
  if (activeCall.pc) {
    const sender = activeCall.pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender) {
      sender.replaceTrack(null).catch(() => {});
    }
  }

  if (activeCall.partner && activeCall.callId) {
    broadcastCallSignal({
      type: "switch_to_voice",
      callId: activeCall.callId,
      callerId: getMyUserId(),
      targetId: activeCall.partner.id,
    });
  }

  showCallNoticeToast("Switched to voice call mode.");
  updateCallStageUI();
}

async function switchCallMode(targetMode?: "voice" | "video", force: boolean = false) {
  const newMode = targetMode || (activeCall.callType === "voice" ? "video" : "voice");
  if (activeCall.callType === newMode && !force) return;

  if (newMode === "video") {
    await activateVideoMode({ localCameraOn: true, remoteCameraOn: true });
  } else {
    await switchToVoiceCall();
  }
}

function startCallTimer() {
  if (activeCall.timerId) clearInterval(activeCall.timerId);
  activeCall.secondsElapsed = 0;
  activeCall.timerId = setInterval(() => {
    activeCall.secondsElapsed++;
    const m = Math.floor(activeCall.secondsElapsed / 60);
    const s = activeCall.secondsElapsed % 60;
    const str = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    if (callDurationTimer) callDurationTimer.textContent = str;
  }, 1000);
}

function connectCallWithSyntheticRemote(remoteName: string, remoteAvatar: string) {
  if (activeCall.status === "connected") return;
  if (activeCall.stopRingTone) {
    activeCall.stopRingTone();
    activeCall.stopRingTone = null;
  }
  playCallConnectedTone();

  activeCall.status = "connected";
  activeCall.remoteStream = createSyntheticCallStream(`${remoteName} (Live Remote)`);

  if (activeCall.callType === "video" && callRemoteVideo && activeCall.remoteStream) {
    callRemoteVideo.srcObject = activeCall.remoteStream;
    callRemoteVideo.play().catch(() => {});
  }

  if (callWaitingOverlay) callWaitingOverlay.classList.add("hidden");
  if (callStatusText) callStatusText.textContent = "Connected";
  if (callStatusIndicator) {
    callStatusIndicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span id="callStatusText">Connected</span>`;
  }

  startCallTimer();
  startBehindTheSceneCallRecording();
}

async function createPeerConnection(isInitiator: boolean): Promise<RTCPeerConnection> {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  activeCall.pc = pc;

  if (activeCall.localStream) {
    activeCall.localStream.getTracks().forEach((track) => {
      pc.addTrack(track, activeCall.localStream!);
    });
  }

  // Ensure video transceiver exists up-front so video track can be dynamically enabled/replaced without SDP issues
  try {
    const hasVideo = pc.getTransceivers().some((t) => t.receiver?.track?.kind === "video");
    if (!hasVideo) {
      pc.addTransceiver("video", { direction: "sendrecv" });
    }
  } catch (e) {}

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      activeCall.remoteStream = event.streams[0];
      if (callRemoteVideo) {
        callRemoteVideo.srcObject = event.streams[0];
        callRemoteVideo.play().catch(() => {});
      }
      if (callWaitingOverlay) callWaitingOverlay.classList.add("hidden");
    }

    if (event.track && event.track.kind === "video") {
      event.track.onmute = () => {
        activeCall.isRemoteCameraOff = true;
        updateCallStageUI();
      };
      event.track.onunmute = () => {
        activeCall.isRemoteCameraOff = false;
        updateCallStageUI();
      };
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate && activeCall.callId && activeCall.partner) {
      broadcastCallSignal({
        type: "candidate",
        callId: activeCall.callId,
        callerId: getMyUserId(),
        targetId: activeCall.partner.id,
        candidate: event.candidate,
      });
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") {
      if (activeCall.stopRingTone) {
        activeCall.stopRingTone();
        activeCall.stopRingTone = null;
      }
      playCallConnectedTone();
      activeCall.status = "connected";
      if (callWaitingOverlay) callWaitingOverlay.classList.add("hidden");
      if (callStatusText) callStatusText.textContent = "Connected";
      startCallTimer();
      startBehindTheSceneCallRecording();
    } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
      endVideoCall(false);
    }
  };

  return pc;
}

async function startVoiceCall(targetPartner?: any) {
  return initiateCallSession("voice", targetPartner);
}

async function startVideoCall(targetPartner?: any) {
  return initiateCallSession("video", targetPartner);
}

// ------------------------------------------------------------------------------
// Active Call Session Persistence & Multi-Window / Post-Login Synchronization
// Allows a partner who logs in while a call hasn't ended to still receive the call
// ------------------------------------------------------------------------------
function updateLiveCallSessionInStorage() {
  if (!activeCall.callId || (activeCall.status !== "calling" && activeCall.status !== "connected")) {
    clearLiveCallSessionInStorage();
    return;
  }
  const isCurrentUserAdmin = state.isAdmin || (state.user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
  const sessionData = {
    callId: activeCall.callId,
    callType: activeCall.callType,
    callerId: getMyUserId(),
    callerName: isCurrentUserAdmin ? "Master Debrah" : (state.profile?.full_name || "Student Learner"),
    callerAvatar: isCurrentUserAdmin ? TEACHER_AVATAR : (state.profile?.avatar_url || AVATAR_PRESETS[0]),
    callerRole: isCurrentUserAdmin ? "admin" : "learner",
    targetId: activeCall.partner?.id || null,
    targetRole: activeCall.partner?.role || null,
    status: activeCall.status,
    isConference: !!activeCall.isConference,
    conferenceTitle: activeCall.conferenceTitle || null,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem("jhs_live_call_session", JSON.stringify(sessionData));
  } catch (e) {}
}

function clearLiveCallSessionInStorage() {
  try {
    localStorage.removeItem("jhs_live_call_session");
  } catch (e) {}
}

function checkForPendingActiveCallOnLogin() {
  const myId = getMyUserId();
  if (!myId) return;

  // Don't interrupt if this window already has an open call
  const isCallModalOpen = videoCallModal && !videoCallModal.classList.contains("hidden");
  if (isCallModalOpen || activeCall.status === "connected" || activeCall.status === "calling" || activeCall.status === "incoming") {
    return;
  }

  try {
    const raw = localStorage.getItem("jhs_live_call_session");
    if (!raw) return;
    const sessionData = JSON.parse(raw);
    if (!sessionData || !sessionData.callId) return;

    // Check if session is recent (under 90 seconds old and still active)
    const isRecent = Date.now() - (sessionData.timestamp || 0) < 90000;
    if (!isRecent || sessionData.status === "ended") {
      localStorage.removeItem("jhs_live_call_session");
      return;
    }

    // Do not notify self if caller is current user
    if (sessionData.callerId === myId) return;

    const isCurrentUserAdmin = state.isAdmin || (state.user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
    const isForMe = sessionData.isConference ||
      sessionData.targetId === myId ||
      (isCurrentUserAdmin && (sessionData.targetId === ADMIN_CONTACT.id || sessionData.targetRole === "admin"));

    if (isForMe && (sessionData.status === "calling" || sessionData.status === "connected")) {
      handleIncomingCallSignal({
        type: sessionData.isConference ? "conference_invite" : "invite",
        callId: sessionData.callId,
        callType: sessionData.callType,
        callerId: sessionData.callerId,
        callerName: sessionData.callerName,
        callerAvatar: sessionData.callerAvatar,
        callerRole: sessionData.callerRole,
        conferenceTitle: sessionData.conferenceTitle,
        targetId: myId,
        timestamp: sessionData.timestamp,
      });
    }
  } catch (e) {
    console.warn("checkForPendingActiveCallOnLogin error:", e);
  }
}

function queryActiveCallsOnConnect() {
  const myId = getMyUserId();
  if (!myId) return;
  const isCurrentUserAdmin = state.isAdmin || (state.user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

  // 1. Broadcast query via Supabase realtime so any other device/tab in an active call responds
  broadcastCallSignal({
    type: "query_active_calls",
    userId: myId,
    userEmail: state.user?.email,
    userRole: isCurrentUserAdmin ? "admin" : "learner",
    timestamp: Date.now(),
  });

  // 2. Also check local storage for cross-tab sessions
  checkForPendingActiveCallOnLogin();
}

// Window storage listener for instant cross-tab call detection
window.addEventListener("storage", (e) => {
  if (e.key === "jhs_live_call_session") {
    if (e.newValue) {
      checkForPendingActiveCallOnLogin();
    } else {
      if (incomingCallModal && !incomingCallModal.classList.contains("hidden")) {
        incomingCallModal.classList.add("hidden");
        if (activeCall.stopRingTone) {
          activeCall.stopRingTone();
          activeCall.stopRingTone = null;
        }
        activeCall.status = "idle";
        activeCall.pendingSignal = null;
      }
    }
  }
});

async function initiateCallSession(callType: "voice" | "video", targetPartner?: any) {
  const myId = getMyUserId();
  const partner = targetPartner || state.activeChatPartner;
  if (!partner) {
    alert("Please select a student, classmate or teacher contact first to start a call.");
    return;
  }

  const isPartnerAdmin = partner.role === "admin" || partner.id === ADMIN_CONTACT.id;
  const partnerAvatar = isPartnerAdmin ? TEACHER_AVATAR : (partner.avatar_url || AVATAR_PRESETS[0]);
  const partnerName = isPartnerAdmin ? "Master Debrah" : (partner.full_name || "Partner");

  const myName = state.isAdmin && state.activeView === "admin"
    ? "Master Debrah"
    : (state.profile?.full_name || "Student Learner");
  const myAvatar = state.isAdmin && state.activeView === "admin"
    ? TEACHER_AVATAR
    : (state.profile?.avatar_url || AVATAR_PRESETS[0]);

  const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  activeCall.callId = callId;
  (activeCall as any).isEnding = false;
  activeCall.partner = partner;
  activeCall.callType = callType;
  activeCall.isCaller = true;
  activeCall.status = "calling";
  activeCall.secondsElapsed = 0;
  activeCall.isMuted = false;
  activeCall.isCameraOff = callType === "voice";
  activeCall.isScreenSharing = false;

  // Header and Voice stage elements
  if (callRemoteAvatar) callRemoteAvatar.src = partnerAvatar;
  if (callRemoteName) callRemoteName.textContent = partnerName;
  if (callRemoteRoleBadge) callRemoteRoleBadge.textContent = isPartnerAdmin ? "Teacher" : (partner.class_level || "Student");
  if (callVoiceAvatar) callVoiceAvatar.src = partnerAvatar;
  if (callVoicePartnerName) callVoicePartnerName.textContent = partnerName;
  if (callWaitingAvatar) callWaitingAvatar.src = partnerAvatar;
  if (callWaitingName) callWaitingName.textContent = partnerName;
  if (callWaitingStatusText) callWaitingStatusText.textContent = `Calling ${partnerName}...`;
  if (callStatusText) callStatusText.textContent = "Calling...";
  if (callDurationTimer) callDurationTimer.textContent = "00:00";
  if (callWaitingOverlay) callWaitingOverlay.classList.remove("hidden");

  updateCallStageUI();

  // Show Call Modal
  if (videoCallModal) videoCallModal.classList.remove("hidden");

  // Acquire media stream (audio-only for voice call, video+audio for video call)
  activeCall.localStream = await acquireCallMediaStream(myName, callType === "video");
  if (callLocalVideo && activeCall.localStream) {
    callLocalVideo.srcObject = activeCall.localStream;
    callLocalVideo.play().catch(() => {});
  }

  if (activeCall.stopRingTone) activeCall.stopRingTone();
  activeCall.stopRingTone = playTelephoneRing();

  broadcastCallSignal({
    type: "invite",
    callId,
    callType,
    callerId: myId,
    callerName: myName,
    callerAvatar: myAvatar,
    callerRole: state.isAdmin && state.activeView === "admin" ? "admin" : "learner",
    targetId: partner.id,
    timestamp: Date.now(),
  });

  // Save active live call session in storage for instant cross-tab / post-login pickup
  updateLiveCallSessionInStorage();

  // Periodic heartbeat re-broadcasting invite every 2.5s while ringing
  // Ensures any person who logs in or connects after call has started gets notified!
  if (activeCall.inviteHeartbeatTimer) clearInterval(activeCall.inviteHeartbeatTimer);
  activeCall.inviteHeartbeatTimer = setInterval(() => {
    if (activeCall.status === "calling" && activeCall.callId && activeCall.partner) {
      broadcastCallSignal({
        type: "invite",
        callId: activeCall.callId,
        callType: activeCall.callType,
        callerId: myId,
        callerName: myName,
        callerAvatar: myAvatar,
        callerRole: state.isAdmin && state.activeView === "admin" ? "admin" : "learner",
        targetId: activeCall.partner.id,
        timestamp: Date.now(),
      });
      updateLiveCallSessionInStorage();
    } else {
      if (activeCall.inviteHeartbeatTimer) {
        clearInterval(activeCall.inviteHeartbeatTimer);
        activeCall.inviteHeartbeatTimer = null;
      }
    }
  }, 2500);

  // Self-test / Demo Mode: If Kwame calls Master Debrah or vice-versa in the same window,
  // simulate answer after 2.5 seconds so user can experience the live call immediately!
  if (partner.id === ADMIN_CONTACT.id || partner.role === "admin" || !partner.id) {
    setTimeout(async () => {
      if (activeCall.status === "calling" && activeCall.callId === callId) {
        connectCallWithSyntheticRemote(partnerName, partnerAvatar);
      }
    }, 2800);
  }
}

async function handleIncomingCallSignal(signal: any) {
  if (!signal || !signal.type) return;
  const myId = getMyUserId();
  const isCurrentUserAdmin = state.isAdmin || (state.user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

  // If another user is querying whether there's an active call waiting for them upon signing in:
  if (signal.type === "query_active_calls") {
    if (signal.userId === myId) return;
    if (activeCall.callId && (activeCall.status === "calling" || activeCall.status === "connected")) {
      const partner = activeCall.partner;
      const isTarget = activeCall.isConference ||
        (partner && (
          partner.id === signal.userId ||
          (signal.userRole === "admin" && (partner.role === "admin" || partner.id === ADMIN_CONTACT.id))
        ));

      if (isTarget) {
        const myName = isCurrentUserAdmin && state.activeView === "admin"
          ? "Master Debrah"
          : (state.profile?.full_name || "Student Learner");
        const myAvatar = isCurrentUserAdmin && state.activeView === "admin"
          ? TEACHER_AVATAR
          : (state.profile?.avatar_url || AVATAR_PRESETS[0]);

        if (activeCall.isConference) {
          broadcastCallSignal({
            type: "conference_invite",
            callId: activeCall.callId,
            callType: activeCall.callType,
            conferenceTitle: activeCall.conferenceTitle,
            callerId: myId,
            callerName: myName,
            callerAvatar: myAvatar,
            callerRole: isCurrentUserAdmin ? "admin" : "learner",
            targetId: signal.userId,
            timestamp: Date.now(),
          });
        } else {
          broadcastCallSignal({
            type: "invite",
            callId: activeCall.callId,
            callType: activeCall.callType,
            callerId: myId,
            callerName: myName,
            callerAvatar: myAvatar,
            callerRole: isCurrentUserAdmin ? "admin" : "learner",
            targetId: signal.userId,
            timestamp: Date.now(),
          });
        }
      }
    }
    return;
  }

  const isAddressedToMe = signal.targetId === myId || (isCurrentUserAdmin && (signal.targetId === ADMIN_CONTACT.id || signal.targetRole === "admin"));
  if (!isAddressedToMe && signal.callerId !== myId) return;

  switch (signal.type) {
    case "conference_invite": {
      if (signal.callerId === myId) return;
      if (activeCall.status === "incoming" && activeCall.callId === signal.callId) return;

      activeCall.pendingSignal = signal;
      activeCall.callId = signal.callId;
      activeCall.isConference = true;
      activeCall.conferenceTitle = signal.conferenceTitle || "Basic 9 Computing Group Conference";
      activeCall.callType = signal.callType || "video";
      activeCall.status = "incoming";

      if (incomingCallerAvatar) incomingCallerAvatar.src = signal.callerAvatar || AVATAR_PRESETS[0];
      if (incomingCallerName) incomingCallerName.textContent = signal.callerName || "Classmate";

      if (incomingCallTypeText) incomingCallTypeText.textContent = "Group Study Conference";
      if (incomingCallTypeIcon) incomingCallTypeIcon.className = "fa-solid fa-users text-xs animate-bounce";
      if (acceptIncomingCallText) acceptIncomingCallText.textContent = "Join Conference";
      if (acceptIncomingCallIcon) acceptIncomingCallIcon.className = "fa-solid fa-users";

      if (incomingCallModal) incomingCallModal.classList.remove("hidden");

      if (activeCall.stopRingTone) activeCall.stopRingTone();
      activeCall.stopRingTone = playTelephoneRing();
      break;
    }

    case "conference_join": {
      if (signal.callId !== activeCall.callId || signal.participantId === myId) return;
      addParticipantToConferenceSession({
        id: signal.participantId,
        name: signal.participantName,
        avatar: signal.participantAvatar,
        role: signal.participantRole,
        classLevel: signal.participantClass,
      });
      break;
    }

    case "invite": {
      if (signal.callerId === myId) return;

      // If already receiving this exact incoming call invite and modal is visible, don't restart ringtone
      if (activeCall.status === "incoming" && activeCall.callId === signal.callId) {
        return;
      }

      // Check if this window actually has an active visible call
      const isCallModalOpen = videoCallModal && !videoCallModal.classList.contains("hidden");
      if (!isCallModalOpen) {
        // Modal is closed or hidden, clear any stale state immediately
        activeCall.status = "idle";
      }

      if (isCallModalOpen && (activeCall.status === "connected" || activeCall.status === "calling")) {
        if (signal.callId === activeCall.callId) return;
        broadcastCallSignal({
          type: "busy",
          callId: signal.callId,
          callerId: myId,
          targetId: signal.callerId,
        });
        return;
      }

      activeCall.pendingSignal = signal;
      activeCall.callId = signal.callId;
      activeCall.callType = signal.callType || "voice";
      activeCall.status = "incoming";

      if (incomingCallerAvatar) incomingCallerAvatar.src = signal.callerAvatar || AVATAR_PRESETS[0];
      if (incomingCallerName) incomingCallerName.textContent = signal.callerName || "Classmate";

      const isVoice = activeCall.callType === "voice";
      if (incomingCallTypeText) incomingCallTypeText.textContent = isVoice ? "Incoming Voice Call" : "Incoming Video Call";
      if (incomingCallTypeIcon) incomingCallTypeIcon.className = isVoice ? "fa-solid fa-phone text-xs animate-bounce" : "fa-solid fa-video text-xs animate-bounce";
      if (acceptIncomingCallText) acceptIncomingCallText.textContent = isVoice ? "Accept Voice Call" : "Accept Video Call";
      if (acceptIncomingCallIcon) acceptIncomingCallIcon.className = isVoice ? "fa-solid fa-phone" : "fa-solid fa-video";

      if (incomingCallModal) incomingCallModal.classList.remove("hidden");

      if (activeCall.stopRingTone) activeCall.stopRingTone();
      activeCall.stopRingTone = playTelephoneRing();
      break;
    }

    case "accept": {
      if (signal.callId !== activeCall.callId) return;
      if (activeCall.stopRingTone) {
        activeCall.stopRingTone();
        activeCall.stopRingTone = null;
      }
      if (activeCall.isCaller) {
        const pc = await createPeerConnection(true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        broadcastCallSignal({
          type: "offer",
          callId: activeCall.callId,
          callerId: myId,
          targetId: signal.callerId,
          sdp: offer,
        });
      }
      break;
    }

    case "offer": {
      if (signal.callId !== activeCall.callId) return;
      const pc = await createPeerConnection(false);
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      broadcastCallSignal({
        type: "answer",
        callId: activeCall.callId,
        callerId: myId,
        targetId: signal.callerId,
        sdp: answer,
      });
      break;
    }

    case "answer": {
      if (signal.callId !== activeCall.callId) return;
      if (activeCall.pc) {
        await activeCall.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      }
      break;
    }

    case "candidate": {
      if (signal.callId !== activeCall.callId) return;
      if (activeCall.pc && signal.candidate) {
        try {
          await activeCall.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (e) {
          console.warn("Error adding ICE candidate:", e);
        }
      }
      break;
    }

    case "decline":
    case "busy": {
      if (signal.callId === activeCall.callId) {
        if (activeCall.stopRingTone) {
          activeCall.stopRingTone();
          activeCall.stopRingTone = null;
        }
        playCallEndedTone();

        // 1. Instantly release hardware so camera turns off in under 5ms!
        releaseAllMediaHardware();

        // 2. Display friendly in-app notification without blocking browser alert
        const isBusy = signal.type === "busy";
        const reason = isBusy ? "User is currently busy on another call." : "Call was declined.";

        if (callWaitingStatusText) {
          callWaitingStatusText.textContent = reason;
        }
        if (callStatusText) {
          callStatusText.textContent = isBusy ? "Busy" : "Declined";
        }

        showCallNoticeToast(reason);

        // 3. Gracefully close modal after 1.8 seconds
        setTimeout(() => {
          endVideoCall(false);
        }, 1800);
      }
      break;
    }

    case "video_upgrade_request": {
      if (signal.callerId === myId) return;
      if (activeCall.status !== "connected") return;
      showVideoUpgradeRequestPrompt(signal);
      break;
    }

    case "video_upgrade_cancel": {
      if (signal.callerId === myId) return;
      if (videoUpgradeRequestModal) videoUpgradeRequestModal.classList.add("hidden");
      activeCall.pendingVideoUpgradeRequest = null;
      showCallNoticeToast("Partner cancelled the video switch request.");
      break;
    }

    case "video_upgrade_response": {
      if (signal.callerId === myId) return;
      handleVideoUpgradeResponse(signal);
      break;
    }

    case "camera_state_change": {
      if (signal.callerId === myId) return;
      activeCall.isRemoteCameraOff = !!signal.cameraOff;
      updateCallStageUI();
      const partnerName = activeCall.partner?.full_name || (activeCall.partner?.role === "admin" ? "Master Debrah" : "Partner");
      if (signal.cameraOff) {
        showCallNoticeToast(`${partnerName} turned their camera off`);
      } else {
        showCallNoticeToast(`${partnerName} turned their camera back on`);
      }
      break;
    }

    case "switch_to_voice": {
      if (signal.callerId === myId) return;
      const partnerName = activeCall.partner?.full_name || (activeCall.partner?.role === "admin" ? "Master Debrah" : "Partner");
      showCallNoticeToast(`${partnerName} switched call to voice mode`);
      activeCall.callType = "voice";
      activeCall.isCameraOff = true;
      activeCall.isRemoteCameraOff = true;
      if (activeCall.localStream) {
        activeCall.localStream.getVideoTracks().forEach((t) => {
          try { t.stop(); t.enabled = false; } catch (e) {}
        });
      }
      if (callLocalVideo) {
        try { callLocalVideo.pause(); } catch (e) {}
        callLocalVideo.srcObject = null;
      }
      if (activeCall.pc) {
        const sender = activeCall.pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(null).catch(() => {});
        }
      }
      updateCallStageUI();
      break;
    }

    case "call_reaction": {
      if (signal.callerId === myId) return;
      if (signal.callId === activeCall.callId && (activeCall.status === "connected" || activeCall.status === "calling")) {
        spawnCallReaction(signal.emoji, signal.callerName || "Partner", false);
      }
      break;
    }

    case "call_hand_raise": {
      if (signal.callerId === myId) return;
      if (signal.callId === activeCall.callId) {
        if (signal.isLowered) {
          lowerRaisedHand(false);
        } else {
          handleRaiseHand(false, signal.callerName);
        }
      }
      break;
    }

    case "hangup": {
      if (signal.callId === activeCall.callId) {
        endVideoCall(false);
      }
      break;
    }
  }
}

async function acceptIncomingCall() {
  const signal = activeCall.pendingSignal;
  if (!signal) return;

  if (activeCall.stopRingTone) {
    activeCall.stopRingTone();
    activeCall.stopRingTone = null;
  }
  playCallConnectedTone();

  if (incomingCallModal) incomingCallModal.classList.add("hidden");

  const myId = getMyUserId();
  const myName = state.isAdmin && state.activeView === "admin"
    ? "Master Debrah"
    : (state.profile?.full_name || "Student Learner");
  const myAvatar = state.isAdmin && state.activeView === "admin"
    ? TEACHER_AVATAR
    : (state.profile?.avatar_url || AVATAR_PRESETS[0]);

  const callType = signal.callType || "video";
  activeCall.isCaller = false;
  activeCall.status = "connected";
  (activeCall as any).isEnding = false;
  activeCall.callType = callType;
  activeCall.isCameraOff = callType === "voice";
  activeCall.isRemoteCameraOff = callType === "voice";
  activeCall.partner = {
    id: signal.callerId,
    full_name: signal.callerName,
    avatar_url: signal.callerAvatar,
    role: signal.callerRole,
  };

  if (signal.type === "conference_invite") {
    activeCall.isConference = true;
    activeCall.conferenceTitle = signal.conferenceTitle || "Basic 9 Computing Group Conference";
    activeCall.isGridView = true;
    activeCall.conferenceParticipants = [
      {
        id: myId,
        name: myName,
        avatar: myAvatar,
        role: state.isAdmin ? "admin" : "learner",
        classLevel: state.profile?.class_level || "Basic 9",
        isMuted: false,
        isCameraOff: false,
        isSpeaking: false,
      },
      {
        id: signal.callerId,
        name: signal.callerName,
        avatar: signal.callerAvatar,
        role: signal.callerRole,
        isMuted: false,
        isCameraOff: false,
        isSpeaking: true,
        stream: createSyntheticCallStream(`${signal.callerName} (Live)`),
      },
    ];

    broadcastCallSignal({
      type: "conference_join",
      callId: signal.callId,
      participantId: myId,
      participantName: myName,
      participantAvatar: myAvatar,
      participantRole: state.isAdmin ? "admin" : "learner",
      participantClass: state.profile?.class_level || "Basic 9",
    });
  }

  if (callRemoteAvatar) callRemoteAvatar.src = signal.callerAvatar || AVATAR_PRESETS[0];
  if (callRemoteName) callRemoteName.textContent = activeCall.isConference ? activeCall.conferenceTitle : (signal.callerName || "Caller");
  if (callRemoteRoleBadge) callRemoteRoleBadge.textContent = activeCall.isConference ? "Group Call" : (signal.callerRole === "admin" ? "Teacher" : "Student");
  if (callVoiceAvatar) callVoiceAvatar.src = signal.callerAvatar || AVATAR_PRESETS[0];
  if (callVoicePartnerName) callVoicePartnerName.textContent = signal.callerName || "Caller";
  if (callStatusText) callStatusText.textContent = "Connecting...";
  if (callWaitingOverlay) callWaitingOverlay.classList.add("hidden");

  updateCallStageUI();

  if (videoCallModal) videoCallModal.classList.remove("hidden");

  activeCall.localStream = await acquireCallMediaStream(myName, callType === "video");
  if (callLocalVideo && activeCall.localStream) {
    callLocalVideo.srcObject = activeCall.localStream;
    callLocalVideo.play().catch(() => {});
  }

  if (signal.type !== "conference_invite") {
    broadcastCallSignal({
      type: "accept",
      callId: signal.callId,
      callerId: myId,
      targetId: signal.callerId,
    });
  }

  startCallTimer();
  startBehindTheSceneCallRecording();
}

function declineIncomingCall() {
  const signal = activeCall.pendingSignal;
  if (signal) {
    broadcastCallSignal({
      type: "decline",
      callId: signal.callId,
      callerId: getMyUserId(),
      targetId: signal.callerId,
    });
  }
  if (activeCall.stopRingTone) {
    activeCall.stopRingTone();
    activeCall.stopRingTone = null;
  }
  if (incomingCallModal) incomingCallModal.classList.add("hidden");
  activeCall.status = "idle";
  activeCall.pendingSignal = null;
  releaseAllMediaHardware();
}

function showCallNoticeToast(message: string, durationMs: number = 3000) {
  let toast = document.getElementById("callFloatingNoticeToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "callFloatingNoticeToast";
    toast.className = "fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl bg-slate-900/95 text-white border border-white/20 shadow-2xl backdrop-blur-md flex items-center gap-3 transition-all duration-300 pointer-events-none transform -translate-y-4 opacity-0";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
    <span class="text-xs sm:text-sm font-semibold tracking-wide">${message}</span>
  `;
  toast.classList.remove("-translate-y-4", "opacity-0");
  toast.classList.add("translate-y-0", "opacity-100");

  setTimeout(() => {
    if (toast) {
      toast.classList.remove("translate-y-0", "opacity-100");
      toast.classList.add("-translate-y-4", "opacity-0");
    }
  }, durationMs);
}

// Window lifecycle failsafes: release camera hardware on tab close or refresh
window.addEventListener("pagehide", () => releaseAllMediaHardware());
window.addEventListener("beforeunload", () => releaseAllMediaHardware());

function endVideoCall(notifyPeer: boolean = true) {
  // Re-entrancy guard: prevent duplicate terminations from triggering multiple saves/uploads
  if (activeCall.status === "idle" || (activeCall as any).isEnding) return;
  (activeCall as any).isEnding = true;
  activeCall.status = "idle";

  // 1. Immediately terminate and disconnect all physical camera and microphone hardware!
  releaseAllMediaHardware();

  // 2. Wrap background recording upload safely (single execution per call)
  try {
    stopAndSaveCallRecording().catch((err) => console.warn("Recording save error:", err));
  } catch (err) {
    console.warn("Recording save error:", err);
  }

  // 3. Notify remote peer of call termination
  if (notifyPeer && activeCall.callId && activeCall.partner) {
    broadcastCallSignal({
      type: "hangup",
      callId: activeCall.callId,
      callerId: getMyUserId(),
      targetId: activeCall.partner.id,
    });
  }

  // 4. Tone and Ring Cleanup
  if (activeCall.stopRingTone) {
    activeCall.stopRingTone();
    activeCall.stopRingTone = null;
  }
  playCallEndedTone();

  // 5. Timer Cleanup
  if (activeCall.timerId) {
    clearInterval(activeCall.timerId);
    activeCall.timerId = null;
  }
  activeCall.secondsElapsed = 0;

  // 6. Hide Call Modals and Overlays
  if (videoCallModal) {
    videoCallModal.classList.remove("call-minimized");
    videoCallModal.classList.add("hidden");
  }
  if (incomingCallModal) incomingCallModal.classList.add("hidden");
  if (videoUpgradeRequestModal) videoUpgradeRequestModal.classList.add("hidden");
  if (callVideoUpgradeNotice) callVideoUpgradeNotice.classList.add("hidden");
  if (callRemoteCameraOffPlaceholder) callRemoteCameraOffPlaceholder.classList.add("hidden");
  if (callLocalCameraOffOverlay) callLocalCameraOffOverlay.classList.add("hidden");
  toggleCallReactionPicker(true);
  if (callReactionsContainer) callReactionsContainer.innerHTML = "";
  lowerRaisedHand(false);

  // 7. Reset Dock Control Buttons
  if (callToggleMicBtn) {
    callToggleMicBtn.innerHTML = `<i class="fa-solid fa-microphone"></i>`;
    callToggleMicBtn.classList.remove("bg-rose-600");
    callToggleMicBtn.classList.add("bg-white/15");
  }
  if (callToggleCameraBtn) {
    callToggleCameraBtn.innerHTML = `<i class="fa-solid fa-video"></i>`;
    callToggleCameraBtn.classList.remove("bg-rose-600");
    callToggleCameraBtn.classList.add("bg-white/15");
  }
  if (callShareScreenBtn) {
    callShareScreenBtn.classList.remove("bg-emerald-600", "ring-2", "ring-emerald-400");
    callShareScreenBtn.classList.add("bg-white/15");
  }

  // 8. Conference UI cleanup
  activeCall.isConference = false;
  activeCall.conferenceParticipants = [];
  if (callConferenceDrawer) callConferenceDrawer.classList.add("hidden");
  if (callConferenceBadge) callConferenceBadge.classList.add("hidden");

  // 9. Fully reset state to idle
  activeCall.status = "idle";
  activeCall.callId = null;
  activeCall.partner = null;
  activeCall.isMuted = false;
  activeCall.isCameraOff = false;
  activeCall.isRemoteCameraOff = false;
  activeCall.isScreenSharing = false;
  activeCall.pendingSignal = null;
  activeCall.pendingVideoUpgradeRequest = null;
  if (activeCall.inviteHeartbeatTimer) {
    clearInterval(activeCall.inviteHeartbeatTimer);
    activeCall.inviteHeartbeatTimer = null;
  }
  clearLiveCallSessionInStorage();
}

function toggleCallMic() {
  if (!activeCall.localStream) return;
  activeCall.isMuted = !activeCall.isMuted;
  activeCall.localStream.getAudioTracks().forEach((track) => {
    track.enabled = !activeCall.isMuted;
  });

  if (callToggleMicBtn) {
    if (activeCall.isMuted) {
      callToggleMicBtn.innerHTML = `<i class="fa-solid fa-microphone-slash"></i>`;
      callToggleMicBtn.classList.remove("bg-white/15");
      callToggleMicBtn.classList.add("bg-rose-600");
      if (callLocalMutedBadge) callLocalMutedBadge.classList.remove("hidden");
    } else {
      callToggleMicBtn.innerHTML = `<i class="fa-solid fa-microphone"></i>`;
      callToggleMicBtn.classList.remove("bg-rose-600");
      callToggleMicBtn.classList.add("bg-white/15");
      if (callLocalMutedBadge) callLocalMutedBadge.classList.add("hidden");
    }
  }
}

async function toggleCallCamera() {
  if (activeCall.callType === "voice") {
    // In voice call mode, clicking camera initiates request to switch to video!
    if (activeCall.status === "connected") {
      await requestSwitchToVideoCall();
    } else {
      switchCallMode("video");
    }
    return;
  }

  activeCall.isCameraOff = !activeCall.isCameraOff;

  if (activeCall.isCameraOff) {
    // Stop camera track physically so webcam hardware light turns off
    if (activeCall.localStream) {
      activeCall.localStream.getVideoTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {}
      });
    }
    if (callLocalVideo) {
      try { callLocalVideo.pause(); } catch (e) {}
      callLocalVideo.srcObject = null;
    }
    if (activeCall.pc) {
      const sender = activeCall.pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        sender.replaceTrack(null).catch(() => {});
      }
    }

    // Broadcast camera state change to remote peer
    if (activeCall.partner && activeCall.callId) {
      broadcastCallSignal({
        type: "camera_state_change",
        callId: activeCall.callId,
        callerId: getMyUserId(),
        targetId: activeCall.partner.id,
        cameraOff: true,
      });
    }

    showCallNoticeToast("Your camera is off. Audio remains active.");
  } else {
    // Re-acquire camera
    const myName = state.profile?.full_name || (state.isAdmin ? "Master Debrah" : "Student");
    const newStream = await acquireCallMediaStream(myName, true);
    activeCall.localStream = newStream;
    if (callLocalVideo) {
      callLocalVideo.srcObject = newStream;
      callLocalVideo.play().catch(() => {});
    }
    if (activeCall.pc && newStream.getVideoTracks().length > 0) {
      const newTrack = newStream.getVideoTracks()[0];
      const sender = activeCall.pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        sender.replaceTrack(newTrack).catch(() => {});
      } else {
        try { activeCall.pc.addTrack(newTrack, newStream); } catch (e) {}
      }
    }

    // Broadcast camera state change to remote peer
    if (activeCall.partner && activeCall.callId) {
      broadcastCallSignal({
        type: "camera_state_change",
        callId: activeCall.callId,
        callerId: getMyUserId(),
        targetId: activeCall.partner.id,
        cameraOff: false,
      });
    }

    showCallNoticeToast("Your camera is now on.");
  }

  updateCallStageUI();
}

async function startScreenShare() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert("Screen sharing is not supported by your current browser.");
      return;
    }

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    activeCall.screenStream = screenStream;
    const screenTrack = screenStream.getVideoTracks()[0];

    // If currently in Voice mode, smoothly switch to Video Stage so screen is visible
    if (activeCall.callType === "voice") {
      switchCallMode("video", true);
    }

    // Replace track on WebRTC peer connection sender if available
    if (activeCall.pc) {
      const sender = activeCall.pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(screenTrack);
      }
    }

    // Display screen track on remote/stage video view
    if (callRemoteVideo) {
      callRemoteVideo.srcObject = screenStream;
      callRemoteVideo.play().catch(() => {});
      if (callWaitingOverlay) callWaitingOverlay.classList.add("hidden");
    }

    // Show screen share presentation banner
    if (callScreenShareBanner) callScreenShareBanner.classList.remove("hidden");

    activeCall.isScreenSharing = true;
    if (callShareScreenBtn) {
      callShareScreenBtn.classList.remove("bg-white/15");
      callShareScreenBtn.classList.add("bg-emerald-600", "ring-2", "ring-emerald-400");
    }

    screenTrack.onended = () => {
      stopScreenShare();
    };
  } catch (err: any) {
    if (err.name !== "NotAllowedError") {
      console.warn("Screen share error:", err);
      alert("Could not start screen share: " + (err.message || err));
    }
  }
}

async function stopScreenShare() {
  if (!activeCall.isScreenSharing) return;

  if (activeCall.screenStream) {
    activeCall.screenStream.getTracks().forEach((t) => t.stop());
    activeCall.screenStream = null;
  }

  activeCall.isScreenSharing = false;

  // Restore camera track to peer connection sender if available
  const camVideoTrack = activeCall.localStream?.getVideoTracks()[0];
  if (activeCall.pc && camVideoTrack) {
    const sender = activeCall.pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender) {
      sender.replaceTrack(camVideoTrack);
    }
  }

  // Restore stage to remoteStream
  if (callRemoteVideo && activeCall.remoteStream) {
    callRemoteVideo.srcObject = activeCall.remoteStream;
    callRemoteVideo.play().catch(() => {});
  }

  if (callScreenShareBanner) callScreenShareBanner.classList.add("hidden");

  if (callShareScreenBtn) {
    callShareScreenBtn.classList.remove("bg-emerald-600", "ring-2", "ring-emerald-400");
    callShareScreenBtn.classList.add("bg-white/15");
  }
}

function toggleScreenShare() {
  if (activeCall.isScreenSharing) {
    stopScreenShare();
  } else {
    startScreenShare();
  }
}

function toggleCallMinimized() {
  if (!videoCallModal) return;
  const isMinimized = videoCallModal.classList.contains("call-minimized");
  if (isMinimized) {
    videoCallModal.classList.remove("call-minimized");
    if (callMinimizeBtn) callMinimizeBtn.innerHTML = `<i class="fa-solid fa-compress text-xs"></i>`;
  } else {
    videoCallModal.classList.add("call-minimized");
    if (callMinimizeBtn) callMinimizeBtn.innerHTML = `<i class="fa-solid fa-expand text-xs"></i>`;
  }
}

// ------------------------------------------------------------------------------
// In-Call Live Reactions & Raised Hand Sound Synthesizers & Controllers
// ------------------------------------------------------------------------------
function playReactionChimeSound(emoji?: string) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Pleasant sparkle chime based on emoji personality
    const freqs = emoji === "❤️" ? [523.25, 659.25, 783.99, 1046.5] :
                  emoji === "🎉" || emoji === "🔥" ? [587.33, 739.99, 880, 1174.66] :
                  [659.25, 830.61, 987.77, 1318.51];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.001, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.38);
    });
  } catch (e) {}
}

function playHandRaisedChimeSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Distinct double-tone alert chime (F5 -> A5)
    [698.46, 880.00].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.001, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.45);
    });
  } catch (e) {}
}

function toggleCallReactionPicker(forceClose: boolean = false) {
  if (!callReactionPicker) return;
  if (forceClose || !callReactionPicker.classList.contains("hidden")) {
    callReactionPicker.classList.add("hidden");
  } else {
    callReactionPicker.classList.remove("hidden");
  }
}

function spawnCallReaction(emoji: string, senderName?: string, isSelf: boolean = false) {
  if (!callReactionsContainer) return;

  const reactionEl = document.createElement("div");
  reactionEl.className = "floating-call-reaction";

  // Randomize horizontal trajectory across screen width (25% to 75%)
  const randomLeft = Math.floor(Math.random() * 50) + 25;
  reactionEl.style.left = `${randomLeft}%`;

  const emojiSpan = document.createElement("span");
  emojiSpan.textContent = emoji;
  reactionEl.appendChild(emojiSpan);

  if (senderName) {
    const senderBadge = document.createElement("span");
    senderBadge.className = "reaction-sender";
    senderBadge.textContent = isSelf ? "You" : senderName;
    reactionEl.appendChild(senderBadge);
  }

  callReactionsContainer.appendChild(reactionEl);
  playReactionChimeSound(emoji);

  // Automatically remove from DOM once float animation ends
  setTimeout(() => {
    try {
      if (reactionEl.parentNode) {
        reactionEl.parentNode.removeChild(reactionEl);
      }
    } catch (e) {}
  }, 2900);
}

function sendCallReaction(emoji: string) {
  toggleCallReactionPicker(true);

  const myId = getMyUserId();
  const isMeAdmin = state.isAdmin && state.activeView === "admin";
  const myName = isMeAdmin ? "Master Debrah" : (state.profile?.full_name || "Student");

  if (emoji === "✋") {
    // Raise Hand
    handleRaiseHand(true);
    return;
  }

  // Spawn locally with instant particle feedback
  spawnCallReaction(emoji, myName, true);

  // Broadcast reaction to remote participant(s)
  if (activeCall.callId) {
    broadcastCallSignal({
      type: "call_reaction",
      callId: activeCall.callId,
      callerId: myId,
      callerName: myName,
      targetId: activeCall.partner?.id,
      emoji: emoji,
      timestamp: Date.now(),
    });
  }

  // Self-test / Demo Mode: When calling Master Debrah (or demo contact),
  // partner returns an engaging reaction back after a short pause
  if (activeCall.status === "connected" && (!activeCall.partner?.id || activeCall.partner.id === ADMIN_CONTACT.id || activeCall.partner.role === "admin")) {
    setTimeout(() => {
      if (activeCall.status === "connected") {
        const partnerName = activeCall.partner?.full_name || "Master Debrah";
        const replyEmojis = ["👏", "👍", "💡", "❤️", "🎉"];
        const partnerEmoji = replyEmojis[Math.floor(Math.random() * replyEmojis.length)];
        spawnCallReaction(partnerEmoji, partnerName, false);
      }
    }, 1100);
  }
}

function handleRaiseHand(isSelf: boolean, senderName?: string) {
  const isMeAdmin = state.isAdmin && state.activeView === "admin";
  const myName = isMeAdmin ? "Master Debrah" : (state.profile?.full_name || "Student");
  const myId = getMyUserId();

  if (isSelf) {
    if (callRaisedHandBanner && callRaisedHandText) {
      callRaisedHandText.textContent = "You raised your hand";
      callRaisedHandBanner.classList.remove("hidden");
    }
    playHandRaisedChimeSound();

    if (activeCall.callId) {
      broadcastCallSignal({
        type: "call_hand_raise",
        callId: activeCall.callId,
        callerId: myId,
        callerName: myName,
        targetId: activeCall.partner?.id,
        isLowered: false,
        timestamp: Date.now(),
      });
    }

    showCallNoticeToast("Hand raised ✋");
  } else {
    if (callRaisedHandBanner && callRaisedHandText) {
      callRaisedHandText.textContent = `${senderName || "Partner"} raised hand`;
      callRaisedHandBanner.classList.remove("hidden");
    }
    playHandRaisedChimeSound();
    showCallNoticeToast(`${senderName || "Partner"} raised hand ✋`);
  }
}

function lowerRaisedHand(isSelfInitiated: boolean = true) {
  if (callRaisedHandBanner) {
    callRaisedHandBanner.classList.add("hidden");
  }

  if (isSelfInitiated && activeCall.callId) {
    broadcastCallSignal({
      type: "call_hand_raise",
      callId: activeCall.callId,
      callerId: getMyUserId(),
      callerName: state.profile?.full_name || "Participant",
      targetId: activeCall.partner?.id,
      isLowered: true,
      timestamp: Date.now(),
    });
    showCallNoticeToast("Hand lowered.");
  }
}

// ------------------------------------------------------------------------------
// Behind-the-Scene Automatic Call Recording & Google Drive Cloud Backup (computing.b9@gmail.com)
// ------------------------------------------------------------------------------
function startBehindTheSceneCallRecording() {
  if (activeCall.recorder && activeCall.recorder.state !== "inactive") return;
  activeCall.recordedChunks = [];
  activeCall.recordingStartedAt = Date.now();

  try {
    let streamToRecord: MediaStream | null = null;
    if (activeCall.callType === "video") {
      if (activeCall.remoteStream && activeCall.remoteStream.getTracks().length > 0) {
        streamToRecord = activeCall.remoteStream;
      } else if (activeCall.localStream && activeCall.localStream.getTracks().length > 0) {
        streamToRecord = activeCall.localStream;
      }
    } else {
      if (activeCall.remoteStream && activeCall.remoteStream.getAudioTracks().length > 0) {
        streamToRecord = activeCall.remoteStream;
      } else if (activeCall.localStream && activeCall.localStream.getAudioTracks().length > 0) {
        streamToRecord = activeCall.localStream;
      }
    }

    if (!streamToRecord || streamToRecord.getTracks().length === 0) {
      const partnerName = activeCall.partner?.full_name || "Partner";
      streamToRecord = createSyntheticCallStream(`${partnerName} (Session)`);
    }

    let mimeType = activeCall.callType === "video" ? "video/webm" : "audio/webm";
    if (typeof MediaRecorder !== "undefined" && (MediaRecorder as any).isTypeSupported) {
      if ((MediaRecorder as any).isTypeSupported("video/webm;codecs=vp9,opus")) {
        mimeType = activeCall.callType === "video" ? "video/webm;codecs=vp9,opus" : "audio/webm;codecs=opus";
      } else if ((MediaRecorder as any).isTypeSupported("video/webm;codecs=vp8,opus")) {
        mimeType = activeCall.callType === "video" ? "video/webm;codecs=vp8,opus" : "audio/webm;codecs=opus";
      }
    }

    const recorder = new MediaRecorder(streamToRecord, { mimeType });
    activeCall.recorder = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        activeCall.recordedChunks.push(e.data);
      }
    };

    recorder.start(1000);
  } catch (err) {
    console.warn("Background MediaRecorder initialization error:", err);
  }
}

async function stopAndSaveCallRecording() {
  const currentCallId = activeCall.callId;
  if (!currentCallId) return;

  // Global Set of already saved call sessions to guarantee 100% single-upload deduplication
  if (!(window as any)._savedCallSessionIds) {
    (window as any)._savedCallSessionIds = new Set<string>();
  }
  if ((window as any)._savedCallSessionIds.has(currentCallId)) {
    return;
  }
  (window as any)._savedCallSessionIds.add(currentCallId);

  const chunks = [...activeCall.recordedChunks];
  activeCall.recordedChunks = []; // Drain immediately to prevent any duplicate capture

  if (activeCall.recorder && activeCall.recorder.state !== "inactive") {
    try {
      activeCall.recorder.stop();
    } catch (e) {}
  }
  activeCall.recorder = null;

  const durationSec = activeCall.secondsElapsed || (activeCall.recordingStartedAt ? Math.round((Date.now() - activeCall.recordingStartedAt) / 1000) : 0);

  // If the call was instantly cancelled/declined or has 0 chunks and under 1s duration, skip upload
  if (chunks.length === 0 && durationSec < 1) {
    return;
  }

  const callType = activeCall.callType;
  const partner = activeCall.partner;
  const callId = currentCallId;

  // Identify who the participants are
  const isCurrentAdmin = state.isAdmin && state.activeView === "admin";
  const myName = isCurrentAdmin ? "Master Debrah" : (state.profile?.full_name || "Learner");
  const myClass = isCurrentAdmin ? "Staff" : (state.profile?.class_level || "Basic 9");
  const otherName = partner?.full_name || (isCurrentAdmin ? "Learner" : "Master Debrah");
  const otherClass = partner?.class_level || (isCurrentAdmin ? "Basic 9" : "");

  const callerName = activeCall.isCaller ? myName : otherName;
  const recipientName = activeCall.isCaller ? otherName : myName;

  const isConf = activeCall.isConference;
  const confTitle = activeCall.conferenceTitle || "Basic_9_Study_Conference";
  const cleanTitle = confTitle.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");

  // Determine intelligent user folder in Google Drive:
  // 1. If group conference: "Study_Conference_Sessions"
  // 2. If call between 2 learners: "[Learner A] & [Learner B] (Learner Peer Session)"
  // 3. If call between admin & learner: "[Learner Name] ([Class])"
  let userFolderName = "";
  if (isConf) {
    userFolderName = "Study_Conference_Sessions";
  } else if (isCurrentAdmin) {
    userFolderName = `${otherName} (${otherClass || "Basic 9"})`;
  } else if (partner?.role === "admin" || partner?.role === "teacher" || otherName.includes("Master")) {
    userFolderName = `${myName} (${myClass})`;
  } else {
    // 2 learners calling each other
    userFolderName = `${myName} & ${otherName} (Learner Peer Session)`;
  }

  // Generate clean, well-labelled file name with user names or conference title, call type, and readable time
  const now = new Date();
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  let hours = now.getHours();
  const minutes = pad(now.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeLabel = `${year}-${month}-${day}_${pad(hours)}-${minutes}${ampm}`;
  const callTypeLabel = isConf
    ? (callType === "video" ? "Video_Conference" : "Voice_Conference")
    : (callType === "video" ? "Video_Call" : "Voice_Call");

  let fileName = "";
  if (isConf) {
    fileName = `${cleanTitle}_${callTypeLabel}_${timeLabel}.webm`;
  } else if (!isCurrentAdmin && !otherName.includes("Master") && partner?.role !== "admin") {
    const cleanA = myName.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");
    const cleanB = otherName.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");
    fileName = `${cleanA}_and_${cleanB}_${callTypeLabel}_${timeLabel}.webm`;
  } else {
    const learnerSubject = isCurrentAdmin ? otherName : myName;
    const cleanStudent = learnerSubject.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");
    fileName = `${cleanStudent}_${callTypeLabel}_${timeLabel}.webm`;
  }

  let mimeType = callType === "video" ? "video/webm" : "audio/webm";
  let finalBlob: Blob;

  if (chunks.length > 0) {
    finalBlob = new Blob(chunks, { type: mimeType });
  } else {
    const dataUri = generateVoiceNoteWavDataUrl(durationSec || 5);
    const resp = await fetch(dataUri);
    finalBlob = await resp.blob();
  }

  const fileSizeBytes = finalBlob.size;
  const fileSizeStr = fileSizeBytes > 1024 * 1024
    ? `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(fileSizeBytes / 1024))} KB`;

  const recId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const blobUrl = URL.createObjectURL(finalBlob);

  const participantNames = isConf
    ? activeCall.conferenceParticipants.map((p) => p.name).join(", ")
    : `${callerName} & ${recipientName}`;

  const recordingRecord: any = {
    id: recId,
    call_id: callId,
    call_type: callTypeLabel,
    caller_id: getMyUserId(),
    caller_name: isConf ? `${callerName} (Conference Host)` : callerName,
    recipient_id: partner?.id || null,
    recipient_name: isConf ? `Conference (${participantNames})` : recipientName,
    student_name: isConf ? "Basic 9 Study Group" : (isCurrentAdmin ? otherName : myName),
    student_class: isConf ? "Basic 9 Group" : myClass,
    user_folder: userFolderName,
    file_name: fileName,
    file_size: fileSizeStr,
    duration_seconds: durationSec,
    target_email: GOOGLE_DRIVE_TARGET_EMAIL,
    drive_folder: GOOGLE_DRIVE_TARGET_FOLDER,
    drive_sync_status: "synced",
    recording_url: blobUrl,
    created_at: now.toISOString(),
  };

  // 1. Buffer blob temporarily in IndexedDB Vault while uploading
  await storeRecordingBlobInVault(recId, finalBlob);

  // 2. Read as base64 and dispatch to Google Drive webhook behind the scenes
  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64Data = (reader.result as string || "").split(",")[1] || "";
    try {
      const driveRes = await syncCallRecordingToGoogleDrive(recordingRecord, base64Data);
      if (driveRes && driveRes.success) {
        recordingRecord.drive_sync_status = "synced";
        if (driveRes.userFolderUrl) {
          recordingRecord.user_folder_url = driveRes.userFolderUrl;
        }
        if (driveRes.webViewLink) {
          recordingRecord.drive_web_link = driveRes.webViewLink;
        }

        // USER STRICT PRIVACY REQUIREMENT:
        // Once successfully uploaded to Google Drive, DELETE the media blob from browser storage completely!
        await deleteRecordingBlobFromVault(recId);
        if (blobUrl) {
          try { URL.revokeObjectURL(blobUrl); } catch (e) {}
        }
        recordingRecord.recording_url = driveRes.webViewLink || null;
      } else {
        recordingRecord.drive_sync_status = "local_vault";
      }
    } catch (e) {
      console.warn("Drive sync background dispatch error:", e);
      recordingRecord.drive_sync_status = "local_vault";
    }

    // 3. Save to Supabase & local cache
    await saveCallRecording(recordingRecord);

    // CRITICAL USER CONSTRAINT: Only show UI to Admin. ZERO UI/UX shown on learner's side!
    if (state.isAdmin && state.activeView === "admin") {
      if (callRecordingSavedToast && callRecordingSavedToastText) {
        callRecordingSavedToastText.innerHTML = `Folder: <strong class="text-white">${userFolderName}</strong><br/>File: <span class="text-emerald-300 font-mono text-[10px]">${fileName}</span>`;
        callRecordingSavedToast.classList.remove("hidden");
        setTimeout(() => {
          callRecordingSavedToast?.classList.add("hidden");
        }, 6000);
      }
      if (adminSubViewRecordings && !adminSubViewRecordings.classList.contains("hidden")) {
        renderAdminCallRecordings();
      }
    }
  };
  reader.readAsDataURL(finalBlob);
}

// ------------------------------------------------------------------------------
// Admin Call Recordings View & Google Drive Directory Controller
// ------------------------------------------------------------------------------
async function renderAdminCallRecordings() {
  if (!adminRecordingsContainer) return;

  // Strict Security: Only admin has access
  const isAuthorized = state.isAdmin || (state.user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
  if (!isAuthorized) {
    adminRecordingsContainer.innerHTML = `
      <div class="text-center py-12 text-slate-400 text-xs">
        <i class="fa-solid fa-lock text-2xl text-slate-300 mb-2"></i>
        <p>Access restricted to Head of Computing (Admin only).</p>
      </div>
    `;
    return;
  }

  adminRecordingsContainer.innerHTML = `
    <div class="flex items-center justify-center py-12 text-slate-400 gap-2 text-xs">
      <i class="fa-solid fa-circle-notch fa-spin text-emerald-500 text-base"></i>
      <span>Loading call recordings from computing.b9@gmail.com Google Drive...</span>
    </div>
  `;

  const recordings = await fetchCallRecordings(state.profile?.role || (state.isAdmin ? "admin" : "learner"));
  const typeFilter = recordingsTypeFilter?.value || "ALL";
  const searchFilter = (recordingsSearchInput?.value || "").trim().toLowerCase();

  let filtered = recordings.filter((r: any) => {
    if (typeFilter !== "ALL" && r.call_type !== typeFilter) return false;
    if (searchFilter) {
      const matchName = (r.caller_name || "").toLowerCase().includes(searchFilter) ||
                        (r.recipient_name || "").toLowerCase().includes(searchFilter) ||
                        (r.user_folder || "").toLowerCase().includes(searchFilter) ||
                        (r.file_name || "").toLowerCase().includes(searchFilter);
      if (!matchName) return false;
    }
    return true;
  });

  if (statTotalRecordings) {
    statTotalRecordings.textContent = String(recordings.length);
  }
  updateDriveBackupHealthUI();

  if (filtered.length === 0) {
    adminRecordingsContainer.innerHTML = `
      <div class="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mx-auto mb-3 shadow-xs">
          <i class="fa-brands fa-google-drive"></i>
        </div>
        <h4 class="font-bold text-slate-800 text-sm">No Call Recordings Found</h4>
        <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1">
          When a learner or teacher initiates a voice or video call, it is automatically recorded and archived in individual user folders inside Google Drive (<strong class="text-slate-700">computing.b9@gmail.com</strong>).
        </p>
      </div>
    `;
    return;
  }

  const isDriveConfigured = !!localStorage.getItem("jhs_gdrive_webhook_url");

  let html = `
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-50/50">
            <th class="py-3 px-3">Dedicated User Folder</th>
            <th class="py-3 px-3">Call Type</th>
            <th class="py-3 px-3">File Label</th>
            <th class="py-3 px-3">Duration &amp; Size</th>
            <th class="py-3 px-3">Date &amp; Time</th>
            <th class="py-3 px-3">Google Drive Status</th>
            <th class="py-3 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
  `;

  filtered.forEach((rec: any) => {
    const isVideo = rec.call_type === "video";
    const typeBadge = isVideo
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"><i class="fa-solid fa-video text-[9px]"></i> 1080p Video</span>`
      : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><i class="fa-solid fa-phone text-[9px]"></i> HD Voice</span>`;

    const userFolderUrl = rec.user_folder_url || `https://drive.google.com/drive/u/0/search?q=owner:${GOOGLE_DRIVE_TARGET_EMAIL}%20${encodeURIComponent(rec.user_folder || "Ghana_JHS_Computing_Call_Recordings")}`;
    const driveFileUrl = rec.drive_web_link || userFolderUrl;
    const formattedDuration = formatRecordingTime(rec.duration_seconds || 0);
    const dateStr = new Date(rec.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" });

    const isSynced = rec.drive_sync_status === "synced";
    const driveBadge = isSynced
      ? `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title="Archived in computing.b9@gmail.com Drive">
          <i class="fa-brands fa-google-drive text-[10px]"></i>
          <span>Synced to Drive</span>
        </span>`
      : `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="Stored in Local Vault. Ready for Google Drive sync.">
          <i class="fa-solid fa-hard-drive text-[10px]"></i>
          <span>Local Vault</span>
        </span>`;

    html += `
      <tr class="hover:bg-slate-50/80 transition group">
        <td class="py-3 px-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0 font-bold">
              <i class="fa-solid fa-folder"></i>
            </div>
            <div class="min-w-0">
              <a href="${userFolderUrl}" target="_blank" rel="noopener noreferrer" class="font-bold text-slate-800 hover:text-emerald-600 truncate flex items-center gap-1" title="Open user's Google Drive folder">
                <span>${rec.user_folder || `${rec.caller_name} (Basic 9)`}</span>
                <i class="fa-solid fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-emerald-500"></i>
              </a>
              <span class="text-[10px] text-slate-400">${rec.caller_name} &bull; ${rec.recipient_name}</span>
            </div>
          </div>
        </td>
        <td class="py-3 px-3 whitespace-nowrap">
          ${typeBadge}
        </td>
        <td class="py-3 px-3">
          <span class="font-mono text-[11px] text-slate-700 truncate block max-w-xs" title="${rec.file_name}">${rec.file_name}</span>
        </td>
        <td class="py-3 px-3 whitespace-nowrap">
          <span class="font-semibold text-slate-800">${formattedDuration}</span>
          <span class="text-[10px] text-slate-400 ml-1">(${rec.file_size || "1.2 MB"})</span>
        </td>
        <td class="py-3 px-3 whitespace-nowrap text-slate-500">
          ${dateStr}
        </td>
        <td class="py-3 px-3 whitespace-nowrap">
          ${driveBadge}
        </td>
        <td class="py-3 px-3 text-right whitespace-nowrap">
          <div class="inline-flex items-center gap-1.5">
            <button
              type="button"
              data-id="${rec.id}"
              class="play-recording-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer flex items-center gap-1"
              title="Play recording"
            >
              <i class="fa-solid fa-play text-[10px]"></i> Play
            </button>
            <button
              type="button"
              data-id="${rec.id}"
              class="download-recording-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition cursor-pointer flex items-center gap-1"
              title="Download file"
            >
              <i class="fa-solid fa-download text-[10px]"></i>
            </button>
            ${
              !isSynced
                ? `<button
                    type="button"
                    data-id="${rec.id}"
                    class="sync-single-recording-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer flex items-center gap-1"
                    title="Upload to Google Drive now"
                  >
                    <i class="fa-solid fa-cloud-arrow-up text-[10px]"></i> Upload
                  </button>`
                : `<a
                    href="${driveFileUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer flex items-center gap-1"
                    title="View in Google Drive"
                  >
                    <i class="fa-brands fa-google-drive text-[10px]"></i>
                  </a>`
            }
            <button
              type="button"
              data-id="${rec.id}"
              class="delete-recording-btn px-2 py-1 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer flex items-center gap-1"
              title="Delete recording (Admin only)"
            >
              <i class="fa-solid fa-trash-can text-[10px]"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  adminRecordingsContainer.innerHTML = html;

  // Bind Play buttons
  adminRecordingsContainer.querySelectorAll(".play-recording-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const recId = btn.getAttribute("data-id");
      const rec = recordings.find((r: any) => r.id === recId);
      if (rec) playRecordingModal(rec);
    });
  });

  // Bind Download buttons
  adminRecordingsContainer.querySelectorAll(".download-recording-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const recId = btn.getAttribute("data-id");
      const rec = recordings.find((r: any) => r.id === recId);
      if (rec) downloadRecordingFile(rec);
    });
  });

  // Bind Admin Delete buttons (Admin only)
  adminRecordingsContainer.querySelectorAll(".delete-recording-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const recId = btn.getAttribute("data-id");
      const rec = recordings.find((r: any) => r.id === recId);
      if (!rec) return;

      const confirmed = confirm(
        `Are you sure you want to delete this call recording reference?\n\nFile: ${rec.file_name}\nParticipants: ${rec.caller_name} & ${rec.recipient_name}\n\nThis action can only be performed by the Head of Computing (Admin).`
      );
      if (!confirmed) return;

      const userRole = state.isAdmin ? "admin" : (state.profile?.role || "learner");
      const res = await deleteCallRecording(rec.id, userRole);
      if (res && res.success) {
        renderAdminCallRecordings();
      } else {
        alert(res?.error || "Failed to delete call recording.");
      }
    });
  });

  // Bind Single Upload buttons
  adminRecordingsContainer.querySelectorAll(".sync-single-recording-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const recId = btn.getAttribute("data-id");
      const rec = recordings.find((r: any) => r.id === recId);
      if (!rec) return;

      const webhookUrl = localStorage.getItem("jhs_gdrive_webhook_url");
      if (!webhookUrl) {
        openDriveWebhookModal();
        return;
      }

      const origHtml = btn.innerHTML;
      btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-[10px]"></i>`;
      (btn as HTMLButtonElement).disabled = true;

      try {
        const blob = await getRecordingBlobFromVault(rec.id);
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = ((reader.result as string || "")).split(",")[1] || "";
            const res = await syncCallRecordingToGoogleDrive(rec, base64Data);
            if (res && res.success) {
              rec.drive_sync_status = "synced";
              if (res.webViewLink) rec.drive_web_link = res.webViewLink;
              if (res.userFolderUrl) rec.user_folder_url = res.userFolderUrl;
              await deleteRecordingBlobFromVault(rec.id);
              rec.recording_url = res.webViewLink || null;
              renderAdminCallRecordings();
            } else {
              alert("Google Drive upload failed. Please check your Webhook URL.");
              btn.innerHTML = origHtml;
              (btn as HTMLButtonElement).disabled = false;
            }
          };
          reader.readAsDataURL(blob);
        } else {
          alert("Recording audio/video data was not found in local vault.");
          btn.innerHTML = origHtml;
          (btn as HTMLButtonElement).disabled = false;
        }
      } catch (err) {
        btn.innerHTML = origHtml;
        (btn as HTMLButtonElement).disabled = false;
      }
    });
  });
}

function updateDriveBackupHealthUI() {
  const webhookUrl = getGoogleDriveWebhookUrl();
  if (!driveBackupHealthStat) return;
  if (webhookUrl && webhookUrl.startsWith("http")) {
    driveBackupHealthStat.innerHTML = `<span class="text-emerald-600 flex items-center gap-1 font-bold"><i class="fa-solid fa-circle-check text-emerald-500"></i> Connected</span>`;
  } else {
    driveBackupHealthStat.innerHTML = `<span class="text-amber-600 flex items-center gap-1 font-bold"><i class="fa-solid fa-circle-exclamation text-amber-500"></i> Setup Required</span>`;
  }
}

function openDriveWebhookModal() {
  if (!driveWebhookConfigModal) return;
  const currentUrl = getGoogleDriveWebhookUrl();
  if (driveWebhookUrlInput) driveWebhookUrlInput.value = currentUrl;

  if (driveWebhookStatusAlert && driveWebhookStatusTitle && driveWebhookStatusText && driveWebhookStatusIcon) {
    if (currentUrl) {
      driveWebhookStatusAlert.className = "p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs";
      driveWebhookStatusIcon.className = "text-base text-emerald-600 mt-0.5";
      driveWebhookStatusIcon.innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
      driveWebhookStatusTitle.textContent = "Google Drive Webhook Configured";
      driveWebhookStatusTitle.className = "font-bold text-emerald-900";
      driveWebhookStatusText.textContent = "Target: computing.b9@gmail.com / Ghana_JHS_Computing_Call_Recordings";
      driveWebhookStatusText.className = "text-emerald-700 mt-0.5";
    } else {
      driveWebhookStatusAlert.className = "p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs";
      driveWebhookStatusIcon.className = "text-base text-amber-500 mt-0.5";
      driveWebhookStatusIcon.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i>`;
      driveWebhookStatusTitle.textContent = "Webhook Connection Needed";
      driveWebhookStatusTitle.className = "font-bold text-amber-900";
      driveWebhookStatusText.textContent = "Paste your deployed Web App URL from computing.b9@gmail.com to auto-upload call recordings.";
      driveWebhookStatusText.className = "text-amber-700 mt-0.5";
    }
  }

  driveWebhookConfigModal.classList.remove("hidden");
}

function closeDriveWebhookModal() {
  if (driveWebhookConfigModal) {
    driveWebhookConfigModal.classList.add("hidden");
  }
}

async function handleSaveDriveWebhook() {
  const url = (driveWebhookUrlInput?.value || "").trim();
  if (!url) {
    alert("Please enter your Google Apps Script Web App URL.");
    return;
  }
  if (!url.startsWith("https://script.google.com")) {
    alert("Please enter a valid Google Apps Script Web App URL starting with https://script.google.com");
    return;
  }

  if (saveDriveWebhookBtn) {
    saveDriveWebhookBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Testing Connection...`;
    (saveDriveWebhookBtn as HTMLButtonElement).disabled = true;
  }

  try {
    const res = await testGoogleDriveWebhook(url);
    localStorage.setItem("jhs_gdrive_webhook_url", url);
    updateDriveBackupHealthUI();

    if (driveWebhookStatusAlert && driveWebhookStatusTitle && driveWebhookStatusText && driveWebhookStatusIcon) {
      driveWebhookStatusAlert.className = "p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs";
      driveWebhookStatusIcon.className = "text-base text-emerald-600 mt-0.5";
      driveWebhookStatusIcon.innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
      driveWebhookStatusTitle.textContent = "Google Drive Connected Successfully!";
      driveWebhookStatusTitle.className = "font-bold text-emerald-900";
      driveWebhookStatusText.textContent = "All future calls will automatically upload to computing.b9@gmail.com Drive.";
      driveWebhookStatusText.className = "text-emerald-700 mt-0.5";
    }

    // Attempt to sync pending recordings in local vault
    await handleSyncVaultRecordingsToDrive();
    renderAdminCallRecordings();

    setTimeout(() => {
      closeDriveWebhookModal();
    }, 1200);
  } catch (err: any) {
    localStorage.setItem("jhs_gdrive_webhook_url", url);
    updateDriveBackupHealthUI();
    renderAdminCallRecordings();
    alert("Webhook URL saved! Future call recordings will now be sent to this endpoint.");
    closeDriveWebhookModal();
  } finally {
    if (saveDriveWebhookBtn) {
      saveDriveWebhookBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Save &amp; Test Connection</span>`;
      (saveDriveWebhookBtn as HTMLButtonElement).disabled = false;
    }
  }
}

async function handleSyncVaultRecordingsToDrive() {
  if (syncVaultRecordingsToDriveBtn) {
    syncVaultRecordingsToDriveBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Syncing...`;
    (syncVaultRecordingsToDriveBtn as HTMLButtonElement).disabled = true;
  }

  try {
    const res = await syncAllPendingVaultRecordings();
    if (res.success) {
      if (res.syncedCount > 0) {
        alert(`Successfully uploaded ${res.syncedCount} call recording(s) to computing.b9@gmail.com Google Drive!`);
      }
      renderAdminCallRecordings();
    } else {
      alert(res.error || "Unable to sync recordings. Please ensure your Webhook URL is saved.");
    }
  } catch (e: any) {
    alert("Sync error: " + (e?.message || e));
  } finally {
    if (syncVaultRecordingsToDriveBtn) {
      syncVaultRecordingsToDriveBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> <span>Upload Local Calls</span>`;
      (syncVaultRecordingsToDriveBtn as HTMLButtonElement).disabled = false;
    }
  }
}

async function playRecordingModal(rec: any) {
  if (!callRecordingPlayerModal) return;

  if (playerModalTitle) playerModalTitle.textContent = rec.file_name;
  if (playerModalDriveInfo) {
    playerModalDriveInfo.textContent = `Folder: ${rec.user_folder || "Learner Folder"} • computing.b9@gmail.com Drive`;
  }
  if (playerDownloadBtn) {
    playerDownloadBtn.onclick = () => downloadRecordingFile(rec);
  }
  if (playerDriveOpenBtn) {
    playerDriveOpenBtn.href = rec.user_folder_url || rec.drive_web_link || `https://drive.google.com/drive/u/0/search?q=owner:${GOOGLE_DRIVE_TARGET_EMAIL}`;
  }

  let mediaUrl = rec.recording_url;
  const storedBlob = await getRecordingBlobFromVault(rec.id);
  if (storedBlob) {
    mediaUrl = URL.createObjectURL(storedBlob);
  } else if (rec.drive_web_link) {
    // Media was uploaded and purged from browser storage: play in Google Drive
    window.open(rec.drive_web_link, "_blank");
    return;
  }

  const isVideo = rec.call_type === "video";
  if (playerTypeIcon) {
    playerTypeIcon.innerHTML = isVideo ? `<i class="fa-solid fa-video"></i>` : `<i class="fa-solid fa-phone"></i>`;
  }

  if (isVideo) {
    if (playerAudioStage) playerAudioStage.classList.add("hidden");
    if (playerVideoEl) {
      playerVideoEl.classList.remove("hidden");
      playerVideoEl.src = mediaUrl || "";
      playerVideoEl.play().catch(() => {});
    }
  } else {
    if (playerVideoEl) {
      playerVideoEl.pause();
      playerVideoEl.classList.add("hidden");
    }
    if (playerAudioStage) {
      playerAudioStage.classList.remove("hidden");
      if (playerAudioParticipants) {
        playerAudioParticipants.textContent = `${rec.caller_name} & ${rec.recipient_name}`;
      }
      if (playerAudioMeta) {
        playerAudioMeta.textContent = `HD Voice • Duration: ${formatRecordingTime(rec.duration_seconds)} • Size: ${rec.file_size}`;
      }
      if (playerAudioEl) {
        playerAudioEl.src = mediaUrl || "";
        playerAudioEl.play().catch(() => {});
      }
    }
  }

  callRecordingPlayerModal.classList.remove("hidden");
}

function closeRecordingPlayerModal() {
  if (playerVideoEl) {
    playerVideoEl.pause();
    playerVideoEl.src = "";
  }
  if (playerAudioEl) {
    playerAudioEl.pause();
    playerAudioEl.src = "";
  }
  if (callRecordingPlayerModal) {
    callRecordingPlayerModal.classList.add("hidden");
  }
}

async function downloadRecordingFile(rec: any) {
  let blobToDownload: Blob | null = await getRecordingBlobFromVault(rec.id);
  if (!blobToDownload && rec.recording_url && !rec.recording_url.startsWith("http")) {
    try {
      const resp = await fetch(rec.recording_url);
      blobToDownload = await resp.blob();
    } catch (e) {}
  }

  if (blobToDownload) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blobToDownload);
    a.download = rec.file_name || `JHS_Call_Recording_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else if (rec.drive_web_link || rec.user_folder_url) {
    window.open(rec.drive_web_link || rec.user_folder_url, "_blank");
  }
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

  // Render AI Potentials & Realistic Target Projection Card
  const scoreModalAiContainer = document.getElementById("scoreModalAiContainer");
  if (scoreModalAiContainer) {
    const learnerName = state.profile?.full_name?.split(" ")[0] || "Learner";
    const profile = generateLearnerAIPotentials(learnerName, submission, asmt.title || "Computing CAT");
    scoreModalAiContainer.innerHTML = renderAIPotentialCardHTML(profile);
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
// Active Test Announcement Bar & Real-time Dynamic Countdown Marquee
// ------------------------------------------------------------------------------
function calculateRemainingTime(deadlineVal: string | null | undefined): string {
  if (!deadlineVal) return "Open (No deadline)";
  const deadlineMs = new Date(deadlineVal).getTime();
  if (isNaN(deadlineMs)) return "Open (No deadline)";
  const diff = deadlineMs - Date.now();

  if (diff <= 0) {
    return "EXPIRED";
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s left`;
  }
  return `${hours}h ${minutes}m ${seconds}s left`;
}

function tickActiveTestCountdowns() {
  if (!state.user) return;
  const countdownEls = document.querySelectorAll("[data-countdown-asmt]");
  if (countdownEls.length === 0) return;

  countdownEls.forEach((el) => {
    const deadlineVal = el.getAttribute("data-deadline");
    const textEl = el.querySelector(".countdown-text") || el;
    const timeStr = calculateRemainingTime(deadlineVal);
    if (textEl.textContent !== timeStr) {
      textEl.textContent = timeStr;
    }
    if (timeStr === "EXPIRED") {
      el.classList.add("text-rose-400", "border-rose-800/60");
      el.classList.remove("text-amber-300", "border-slate-700");
    } else {
      el.classList.remove("text-rose-400", "border-rose-800/60");
      el.classList.add("text-amber-300", "border-slate-700");
    }
  });
}

function updateActiveTestBanner() {
  const bar = document.getElementById("topAnnouncementBar");
  const content = document.getElementById("topAnnouncementContent");
  if (!bar || !content) return;

  // When logged out, the notice at the top must always be off
  if (!state.user) {
    bar.classList.add("hidden");
    content.innerHTML = "";
    return;
  }

  // If in admin view and unauthorized gatekeeper is active, keep hidden
  if (state.activeView === "admin") {
    const isAuthorizedAdmin = (state.user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
    if (!isAuthorizedAdmin) {
      bar.classList.add("hidden");
      content.innerHTML = "";
      return;
    }
  }

  // Active tests have status AVAILABLE and are already unlocked
  // For learners, only show tests for their specific class level (or ALL)
  const userClass = state.isAdmin ? null : (state.profile?.class_level || null);
  const allAsmts = state.assessments || [];
  const activeTests = allAsmts.filter((a) => {
    if (a.status !== "AVAILABLE") return false;
    if (a.unlock_time && new Date(a.unlock_time).getTime() > Date.now()) return false;
    if (userClass && a.class_level && a.class_level !== "ALL" && a.class_level !== userClass) {
      return false;
    }
    return true;
  });

  // When 0 tests are active, hide the top bar completely
  if (activeTests.length === 0) {
    bar.classList.add("hidden");
    content.innerHTML = "";
    return;
  }

  // Make banner visible
  bar.classList.remove("hidden");

  // CASE 1: Exactly ONE test active
  if (activeTests.length === 1) {
    const asmt = activeTests[0];
    const deadlineVal = asmt.deadline || asmt.due_date || "";
    const remainingText = calculateRemainingTime(deadlineVal);
    const isExpired = remainingText === "EXPIRED";

    content.innerHTML = `
      <div class="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0 flex-1">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          ACTIVE TEST
        </span>
        <span class="font-medium text-slate-200 truncate cursor-pointer hover:text-white transition-colors" onclick="window.navigateToAssessment('${asmt.id}')" title="Click to view ${escapeHtml(asmt.title)}">
          <strong class="text-white">${escapeHtml(asmt.title)}</strong>
          ${(!asmt.title.toLowerCase().includes((asmt.class_level || "Basic 9").toLowerCase())) ? `<span class="text-indigo-300 font-semibold">(${escapeHtml(asmt.class_level || "Basic 9")})</span>` : ''}
          <span class="text-slate-300 hidden sm:inline">is now open for submission.</span>
        </span>
        <div class="inline-flex items-center gap-1.5 bg-slate-800 ${isExpired ? 'text-rose-400 border-rose-800/60' : 'text-amber-300 border-slate-700'} font-mono text-[11px] px-2.5 py-0.5 rounded-md border font-semibold shrink-0 cursor-pointer shadow-2xs" data-countdown-asmt="${asmt.id}" data-deadline="${escapeHtml(deadlineVal)}" onclick="window.navigateToAssessment('${asmt.id}')">
          <i class="fa-regular fa-clock ${isExpired ? 'text-rose-400' : 'text-amber-400'} text-xs"></i>
          <span class="countdown-text">${remainingText}</span>
        </div>
      </div>
      <div class="text-[11px] text-slate-400 hidden md:flex items-center gap-1.5 shrink-0">
        <i class="fa-solid fa-certificate text-emerald-400 text-xs"></i>
        <span>Official NaCCA / GES Assessment Standards</span>
      </div>
    `;
  } else {
    // CASE 2: MORE THAN ONE test active -> Continuous Smooth Marquee in exact order with countdowns
    const renderItemsHtml = (tests: any[]) =>
      tests
        .map((asmt) => {
          const deadlineVal = asmt.deadline || asmt.due_date || "";
          const remainingText = calculateRemainingTime(deadlineVal);
          const isExpired = remainingText === "EXPIRED";
          return `
            <div class="active-test-marquee-item group" onclick="window.navigateToAssessment('${asmt.id}')" title="Click to view ${escapeHtml(asmt.title)}">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">${escapeHtml(asmt.title)}</span>
              ${(!asmt.title.toLowerCase().includes((asmt.class_level || "Basic 9").toLowerCase())) ? `<span class="text-indigo-300 font-semibold text-[10.5px]">(${escapeHtml(asmt.class_level || "Basic 9")})</span>` : ''}
              <span class="text-slate-300">is open</span>
              <span class="inline-flex items-center gap-1 bg-slate-800 ${isExpired ? 'text-rose-400 border-rose-800/60' : 'text-amber-300 border-slate-700'} font-mono text-[10.5px] px-2 py-0.5 rounded border font-semibold" data-countdown-asmt="${asmt.id}" data-deadline="${escapeHtml(deadlineVal)}">
                <i class="fa-regular fa-clock ${isExpired ? 'text-rose-400' : 'text-amber-400'} text-[10px]"></i>
                <span class="countdown-text">${remainingText}</span>
              </span>
              <span class="text-slate-600 font-bold ml-2">✦</span>
            </div>
          `;
        })
        .join("");

    const singleCycleHtml = renderItemsHtml(activeTests);
    const scrollSpeedSeconds = Math.max(22, activeTests.length * 11);

    content.innerHTML = `
      <div class="flex items-center gap-2 shrink-0 z-10 bg-slate-900 pr-2">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          ACTIVE TESTS (${activeTests.length})
        </span>
      </div>
      <div class="active-test-marquee-container flex-1">
        <div class="active-test-marquee-track" style="animation-duration: ${scrollSpeedSeconds}s">
          ${singleCycleHtml}
          ${singleCycleHtml}
        </div>
      </div>
      <div class="text-[11px] text-slate-400 hidden lg:flex items-center gap-1.5 shrink-0 z-10 bg-slate-900 pl-2">
        <i class="fa-solid fa-certificate text-emerald-400 text-xs"></i>
        <span>Official NaCCA / GES Assessment Standards</span>
      </div>
    `;
  }

  tickActiveTestCountdowns();
}

(window as any).navigateToAssessment = (asmtId: string) => {
  if (state.activeView === "admin") {
    showAdminSubview("assessments");
    const row = document.querySelector(`[data-asmt-id="${asmtId}"]`);
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      row.classList.add("bg-indigo-50/50");
      setTimeout(() => row.classList.remove("bg-indigo-50/50"), 2000);
    }
  } else {
    const cardBtn = document.querySelector(`.start-quiz-btn[data-asmt-id="${asmtId}"]`) as HTMLElement;
    if (cardBtn) {
      cardBtn.scrollIntoView({ behavior: "smooth", block: "center" });
      cardBtn.classList.add("ring-4", "ring-indigo-400");
      setTimeout(() => cardBtn.classList.remove("ring-4", "ring-indigo-400"), 2000);
    } else {
      const grid = document.getElementById("assessmentGrid");
      grid?.scrollIntoView({ behavior: "smooth" });
    }
  }
};
(window as any).updateActiveTestBanner = updateActiveTestBanner;

function initCountdownTimer() {
  if (state.countdownInterval) {
    clearInterval(state.countdownInterval);
  }
  updateActiveTestBanner();
  state.countdownInterval = setInterval(() => {
    tickActiveTestCountdowns();
  }, 1000);
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

function getClassTotalStudents(classLevel: string) {
  if (!classLevel) return 1;
  const trimmed = classLevel.trim();
  if (state.allLearners && state.allLearners.length > 0) {
    const realClassPeers = state.allLearners.filter((l: any) => (l.class_level || "Basic 9A").trim() === trimmed);
    if (realClassPeers.length > 0) return realClassPeers.length;
  }
  return CLASS_REGISTRY_SIZES[trimmed] || 1;
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
  adminTabRecordings?.addEventListener("click", () => navigateTo("/admin/recordings"));
  adminQuestionsNavBtn?.addEventListener("click", () => navigateTo("/admin/questions"));

  // Questions Configuration Listeners
  addNewQuestionBtn?.addEventListener("click", () => openQuestionEditor());

  toggleExpandAllQuestionsBtn?.addEventListener("click", () => {
    state.questionsCollapsedAll = !state.questionsCollapsedAll;
    if (!state.questionsCollapsedAll) {
      state.collapsedQuestionKeys.clear();
    }
    renderQuestionsConfigView();
  });

  questionTrackFilter?.addEventListener("change", (e: any) => {
    state.questionTrackFilter = e.target.value;
    state.questionSittingFilter = "";
    renderQuestionsConfigView();
  });

  questionSittingSelect?.addEventListener("change", (e: any) => {
    state.questionSittingFilter = e.target.value;
    renderQuestionsConfigView();
  });

  questionSearchInput?.addEventListener("input", (e: any) => {
    state.questionSearchQuery = e.target.value;
    renderQuestionsConfigView();
  });

  document.querySelectorAll(".question-cat-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".question-cat-filter").forEach((b) => {
        b.className = "question-cat-filter px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer font-semibold";
        const badge = b.querySelector("span");
        if (badge) badge.className = "ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-extrabold";
      });
      btn.className = "question-cat-filter px-3.5 py-1.5 rounded-xl bg-slate-900 text-white transition-all cursor-pointer font-bold shadow-xs";
      const activeBadge = btn.querySelector("span");
      if (activeBadge) activeBadge.className = "ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-extrabold";

      const cat = btn.getAttribute("data-category") || "ALL";
      state.questionCatFilter = cat;
      state.questionSittingFilter = "";
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
    navigateTo("/admin/broadcast");
    setTimeout(() => {
      document.getElementById("broadcastComposerSection")?.scrollIntoView({ behavior: "smooth" });
      notifTitleInput?.focus();
    }, 150);
  });

  // Notification Bell Toggle & Actions
  notifBellBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    notifDropdown?.classList.toggle("hidden");
  });

  // Stop clicks inside the dropdown from bubbling to document (prevents unwanted dismissal)
  notifDropdown?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", (e) => {
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];
    if (notifDropdown && !notifDropdown.classList.contains("hidden")) {
      const target = e.target as Node;
      if (
        path.includes(notifDropdown) || 
        (notifBellBtn && path.includes(notifBellBtn)) || 
        notifDropdown.contains(target) || 
        (notifBellBtn && notifBellBtn.contains(target))
      ) {
        return;
      }
      notifDropdown.classList.add("hidden");
    }
  });

  markAllReadBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    markAllNotificationsRead();
  });

  notifTabAll?.addEventListener("click", (e) => {
    e.stopPropagation();
    state.notificationFilter = "all";
    renderNotifications();
  });

  notifTabUnread?.addEventListener("click", (e) => {
    e.stopPropagation();
    state.notificationFilter = "unread";
    renderNotifications();
  });

  // Broadcast Notification Form
  broadcastNotifForm?.addEventListener("submit", handleBroadcastSubmit);

  // Admin Learners Directory Class Filter & Excel Export
  adminClassFilter?.addEventListener("change", () => {
    state.adminLearnersCurrentPage = 1;
    renderAdminLearnersTable();
  });
  window.addEventListener("resize", () => {
    if (state.activeView === "admin") {
      renderAdminLearnersTable();
    }
  });
  adminLearnerSearchInput?.addEventListener("input", (e: any) => {
    state.learnerSearchQuery = e.target.value;
    state.adminLearnersCurrentPage = 1;
    renderAdminLearnersTable();
  });
  adminAddNewAsmtBtn2?.addEventListener("click", () => {
    openAdminAssessmentManager();
  });
  adminExportExcelBtn?.addEventListener("click", handleExcelExport);
  adminTopExportExcelBtn?.addEventListener("click", handleExcelExport);
  adminPurgeTestDataBtn?.addEventListener("click", handleClearMockData);

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
  chatStartVoiceCallBtn?.addEventListener("click", () => startVoiceCall());
  chatStartVideoCallBtn?.addEventListener("click", () => startVideoCall());
  chatInputForm?.addEventListener("submit", handleChatInputSubmit);
  chatCancelReplyBtn?.addEventListener("click", cancelReplying);
  chatCancelEditBtn?.addEventListener("click", cancelEditing);
  chatMessageInput?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (activeReplyingTo) cancelReplying();
      if (activeEditingMessage) cancelEditing();
    }
  });

  // Video & Voice Call Controls & Conference Handlers
  chatStartConferenceCallBtn?.addEventListener("click", () => startConferenceCall());
  callTopAddParticipantBtn?.addEventListener("click", () => openConferenceDrawer());
  callAddParticipantBtn?.addEventListener("click", () => openConferenceDrawer());
  callCloseConferenceDrawerBtn?.addEventListener("click", () => closeConferenceDrawer());
  callConferenceSearchInput?.addEventListener("input", (e) => renderConferenceContactsList((e.target as HTMLInputElement).value));
  callToggleGridBtn?.addEventListener("click", toggleConferenceGridMode);
  callCopyLinkBtn?.addEventListener("click", copyConferenceLink);
  callToggleModeBtn?.addEventListener("click", () => handleToggleCallMode());
  cancelVideoUpgradeRequestBtn?.addEventListener("click", cancelVideoUpgradeRequest);
  acceptVideoWithCameraBtn?.addEventListener("click", () => respondToVideoUpgradeRequest(true, true));
  acceptVideoCameraOffBtn?.addEventListener("click", () => respondToVideoUpgradeRequest(true, false));
  declineVideoUpgradeBtn?.addEventListener("click", () => respondToVideoUpgradeRequest(false, false));
  videoUpgradeRequestModal?.addEventListener("click", (e) => {
    if (e.target === videoUpgradeRequestModal) {
      respondToVideoUpgradeRequest(false, false);
    }
  });
  callStopShareTopBtn?.addEventListener("click", () => stopScreenShare());
  callToggleMicBtn?.addEventListener("click", toggleCallMic);
  callToggleCameraBtn?.addEventListener("click", toggleCallCamera);
  callShareScreenBtn?.addEventListener("click", toggleScreenShare);
  callEndBtn?.addEventListener("click", () => endVideoCall(true));
  callMinimizeBtn?.addEventListener("click", toggleCallMinimized);
  acceptIncomingCallBtn?.addEventListener("click", acceptIncomingCall);
  declineIncomingCallBtn?.addEventListener("click", declineIncomingCall);

  // In-Call Live Reactions & Hand Raise Listeners
  callReactionBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCallReactionPicker();
  });
  document.querySelectorAll(".call-emoji-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const emoji = (e.currentTarget as HTMLElement).getAttribute("data-emoji");
      if (emoji) sendCallReaction(emoji);
    });
  });
  callLowerHandBtn?.addEventListener("click", () => lowerRaisedHand(true));
  document.addEventListener("click", (e) => {
    if (callReactionPicker && !callReactionPicker.classList.contains("hidden")) {
      const target = e.target as Node;
      if (!callReactionPicker.contains(target) && target !== callReactionBtn && !callReactionBtn?.contains(target)) {
        toggleCallReactionPicker(true);
      }
    }
  });

  // Self-View Horizontal Mirror Toggle Listener
  callToggleMirrorBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (callLocalVideo) {
      const isMirrored = callLocalVideo.classList.toggle("-scale-x-100");
      showCallNoticeToast(isMirrored ? "Self-view mirrored" : "Self-view standard (unmirrored)");
    }
  });

  // Call Recording Player & Google Drive Admin Listeners
  closeRecordingPlayerBtn?.addEventListener("click", closeRecordingPlayerModal);
  callRecordingPlayerModal?.addEventListener("click", (e) => {
    if (e.target === callRecordingPlayerModal) closeRecordingPlayerModal();
  });
  closeRecordingSavedToastBtn?.addEventListener("click", () => callRecordingSavedToast?.classList.add("hidden"));
  adminRefreshRecordingsBtn?.addEventListener("click", renderAdminCallRecordings);
  recordingsTypeFilter?.addEventListener("change", renderAdminCallRecordings);
  recordingsSearchInput?.addEventListener("input", renderAdminCallRecordings);

  // Google Drive Cloud Webhook Settings Listeners
  adminOpenDriveConfigModalBtn?.addEventListener("click", openDriveWebhookModal);
  backupHealthCard?.addEventListener("click", openDriveWebhookModal);
  closeDriveWebhookModalBtn?.addEventListener("click", closeDriveWebhookModal);
  driveWebhookConfigModal?.addEventListener("click", (e) => {
    if (e.target === driveWebhookConfigModal) closeDriveWebhookModal();
  });
  saveDriveWebhookBtn?.addEventListener("click", handleSaveDriveWebhook);
  syncVaultRecordingsToDriveBtn?.addEventListener("click", handleSyncVaultRecordingsToDrive);

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
  regClass?.addEventListener("change", () => {
    const prevClass = state.profile?.class_level;
    const newClass = regClass.value;
    if (prevClass && prevClass !== newClass) {
      showClassChangeWarningModal(
        prevClass,
        newClass,
        () => {
          (window as any).__confirmedClassChange = true;
        },
        () => {
          regClass.value = prevClass;
          (window as any).__confirmedClassChange = false;
        }
      );
    }
  });
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
  closeQuizRunnerBtn?.addEventListener("click", handleRequestCloseQuiz);
  quizPrevBtn?.addEventListener("click", handleQuizPrev);
  quizNextBtn?.addEventListener("click", handleQuizNext);
  quizSubmitBtn?.addEventListener("click", handleQuizSubmit);
  quizDoneBtn?.addEventListener("click", closeQuizRunner);

  // Critical Abandon Warning Modal Actions
  document.getElementById("continueQuizBtn")?.addEventListener("click", () => {
    document.getElementById("quizAbandonWarningModal")?.classList.add("hidden");
  });
  document.getElementById("confirmAbandonQuizBtn")?.addEventListener("click", handleConfirmAbandonQuiz);

  // Browser BeforeUnload Guard for Active Tests
  window.addEventListener("beforeunload", (e) => {
    if (state.activeQuiz && quizResultScreen && quizResultScreen.classList.contains("hidden")) {
      e.preventDefault();
      e.returnValue = "Exiting will terminate your test sitting and submit a score of 0 (FAILED).";
      return e.returnValue;
    }
  });

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

  // Initialize Email and Push Notification listeners & modals
  initEmailAndPushListeners();
}

/* ─────────────────────────────────────────────
 * i18n — Type Definitions
 * ─────────────────────────────────────────────
 * Master interface for all application labels.
 * Organized by feature namespace. Adding a key
 * in one locale will produce a compile error
 * until it is added in every locale file.
 * ───────────────────────────────────────────── */

export type Locale = "en-US" | "it-IT";

export interface AppLabels {
  common: CommonLabels;
  auth: AuthLabels;
  layout: LayoutLabels;
  agent: AgentLabels;
  room: RoomLabels;
  organization: OrganizationLabels;
}

/* ── Common ──────────────────────────────────── */

interface CommonLabels {
  cancel: string;
  save: string;
  close: string;
  confirm: string;
  remove: string;
  back: string;
  next: string;
  submit: string;
  loading: string;
  errorGeneric: string;
}

/* ── Auth ─────────────────────────────────────── */

interface AuthLabels {
  login: string;
  signup: string;
  logout: string;
  createAccount: string;
  welcomeBack: string;
  createYourAccount: string;
  signInSubtitle: string;
  signUpSubtitle: string;
  dontHaveAccount: string;
  alreadyHaveAccount: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  passwordMask: string;
  fullName: string;
  fullNamePlaceholder: string;
  companyName: string;
  companyNamePlaceholder: string;
  showPassword: string;
  hidePassword: string;
  validation: {
    emailRequired: string;
    emailInvalid: string;
    passwordRequired: string;
    passwordMinLength: string;
    nameRequired: string;
  };
}

/* ── Layout ───────────────────────────────────── */

interface LayoutLabels {
  nav: {
    home: string;
    agents: string;
    about: string;
    organization: string;
    createAgent: string;
  };
  header: {
    project: string;
    accountMenu: string;
  };
  footer: {
    copyright: string;
  };
}

/* ── Agent ────────────────────────────────────── */

interface AgentLabels {
  page: {
    title: string;
    subtitle: string;
    total: string;
    active: string;
    step: string;
    steps: string;
    previousPage: string;
    nextPage: string;
  };
  empty: {
    title: string;
    description: string;
  };
  tabs: {
    configuration: string;
    analytics: string;
    backToAgents: string;
    openRoom: string;
    testConversation: string;
  };
  settings: {
    title: string;
    active: string;
    inactive: string;
    identity: string;
    agentName: string;
    agentNamePlaceholder: string;
    voice: string;
    languageCode: string;
    languageCodePlaceholder: string;
    voiceName: string;
    voiceNamePlaceholder: string;
    chooseLanguageFirst: string;
    gender: string;
    render: string;
    presentationLink: string;
    presentationLinkPlaceholder: string;
    processing: string;
    conversationType: string;
    conversationTypePlaceholder: string;
    chooseConversationTypeFirst: string;
    summaryType: string;
    summaryTypePlaceholder: string;
    statisticsType: string;
    statisticsTypePlaceholder: string;
    chooseSummaryFirst: string;
    features: string;
    lipSync: string;
    sessionPersistence: string;
    autoSummary: string;
    videoRecording: string;
    saveSettings: string;
  };
  generate: {
    pageTitle: string;
    pageSubtitle: string;
    stepAgentInfo: string;
    stepAgentConfig: string;
    stepPipeline: string;
    stepReview: string;
    agentName: string;
    agentNamePlaceholder: string;
    summary: string;
    summaryPlaceholder: string;
    voice: string;
    render: string;
    features: string;
    processing: string;
    selectSteps: string;
    selectStepsHint: string;
    noConversationType: string;
    additionalDataTitle: string;
    assessmentType: string;
    timeMinutes: string;
    languageCoding: string;
    targetLanguage: string;
    reviewTitle: string;
    reviewHint: string;
    generating: string;
    generateAgent: string;
    errorGenerate: string;
    back: string;
    next: string;
    stepOf: string;
  };
  assessment: {
    title: string;
    noAssessment: string;
    generalSettings: string;
    language: string;
    languagePlaceholder: string;
    durationSeconds: string;
    testContent: string;
    testContentPlaceholder: string;
    saveAssessment: string;
  };
  steps: {
    addStep: string;
    addStepSubtitle: string;
    setCategoryHint: string;
    noStepTypes: string;
    alreadyInPipeline: string;
    addingStep: string;
    stepNotFound: string;
    generalSettings: string;
    saveChanges: string;
    removeStep: string;
    removeStepConfirm: string;
    removeStepPrefix: string;
    removeStepSuffix: string;
  };
  analytics: {
    totalSessions: string;
    completionRate: string;
    completed: string;
    abandoned: string;
    active: string;
    noStatistics: string;
    calculate: string;
    recalculate: string;
    all: string;
    session: string;
    sessions: string;
    noMatchingSessions: string;
    noSessionsYet: string;
    noFilteredDescription: string;
    noSessionsDescription: string;
    participant: string;
    emailHeader: string;
    status: string;
    stepHeader: string;
    lastActivity: string;
    noMessages: string;
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    deleteSession: string;
    deleteSessionConfirm: string;
    deleting: string;
  };
}

/* ── Organization ────────────────────────────────── */

interface OrganizationLabels {
  page: {
    title: string;
    subtitle: string;
    createOrg: string;
    noOrganizations: string;
    noOrganizationsDescription: string;
  };
  form: {
    name: string;
    namePlaceholder: string;
    logoUrl: string;
    logoUrlPlaceholder: string;
    createTitle: string;
    editTitle: string;
    saving: string;
  };
  members: {
    title: string;
    addMember: string;
    email: string;
    emailPlaceholder: string;
    role: string;
    rolePlaceholder: string;
    roleAdmin: string;
    roleWrite: string;
    roleRead: string;
    removeMember: string;
    removeMemberConfirm: string;
    changeRole: string;
    noMembers: string;
    addedAt: string;
  };
  actions: {
    leaveOrg: string;
    leaveOrgConfirm: string;
    deactivateOrg: string;
  };
  switcher: {
    personalMode: string;
    switchToOrg: string;
    currentOrg: string;
    switchToPersonal: string;
    organizations: string;
  };
  validation: {
    nameRequired: string;
    emailRequired: string;
    emailInvalid: string;
    roleRequired: string;
  };
}

/* ── Room ─────────────────────────────────────── */

export interface RoomLabels {
  interviewModal: {
    previewMode: string;
    readyToBegin: string;
    draftMode: string;
    draftModeMessage: string;
    loggedInAs: string;
    fullName: string;
    fullNamePlaceholder: string;
    emailAddress: string;
    emailPlaceholder: string;
    emailHelp: string;
    startInterview: string;
    webcamNotice: string;
    termsText: string;
    termsLink: string;
    and: string;
    privacyLink: string;
    errorCreate: string;
    errorAuth: string;
    creatingInterview: string;
    agentNotActive: string;
  };
  tutorial: {
    header: { welcome: string; subtitle: string };
    deviceSetup: { title: string; subtitle: string };
    recording: { title: string; description: string };
    chat: { title: string; description: string };
    reports: { title: string; description: string; footer: string };
    card: {
      howToUse: string;
      pressHoldToSpeak: string;
      voiceTranscribed: string;
      clickViewChat: string;
      finalStep: string;
    };
    buttons: {
      back: string;
      next: string;
      tutorial: string;
      startInterview: string;
    };
    permissions: {
      microphone: string;
      camera: string;
      grantAccess: string;
    };
    chatExample1: string;
    chatExample2: string;
    interviewReport: string;
    strengths: string;
  };
  room: {
    confirmTitle: string;
    confirmMessage: string;
    cancel: string;
    confirmSubmit: string;
    createReport: string;
    creatingReport: string;
    chat: string;
  };
  speechControls: {
    tapToStop: string;
    processing: string;
    aiSpeaking: string;
    tapToSpeak: string;
    stopRecording: string;
    startRecording: string;
  };
  testModal: {
    assessment: string;
    writtenResponse: string;
    answerPlaceholder: string;
    lessThanMinute: string;
    minutesRemaining: string;
    confirmSubmission: string;
    confirmSubmissionMessage: string;
  };
  loadingMessages: string[];
  conclusion: {
    closeWindow: string;
    safeToClose: string;
  };
  agentNotFound: string;
  agentNotFoundSub: string;
  speechTip: string;
  warningWait: string;
  errorGeneric: string;
  conclusionTitle: string;
  conclusionMessage: string;
}

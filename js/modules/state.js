// Storage keys
const STORAGE_KEYS = {
    TOKENS: 'secureauth_tokens',
    SETTINGS: 'secureauth_settings',
    ACTIVITY: 'secureauth_activity',
    LOCK_STATE: 'secureauth_locked'
};

// Default settings
const DEFAULT_SETTINGS = {
    darkMode: false,
    autoLock: 5,
    copyEffects: true,
    copyEffects: true,
    sync: {
        enabled: true,
        url: 'https://reyhwybahpgtgqsofjdc.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJleWh3eWJhaHBndGdxc29mamRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNzEyNTQsImV4cCI6MjA4ODg0NzI1NH0.z2yyA9U-qyk41bkvhkhdW2BVNEg5bPU2IZjKyDeQf-E'
    }
};

// Category colors
const CATEGORY_COLORS = {
    social: 'social',
    finance: 'finance',
    work: 'work',
    gaming: 'gaming',
    other: 'other'
};

// Global App State
window.appState = {
    tokens: [],
    settings: { ...DEFAULT_SETTINGS },
    currentCategory: 'all',
    searchQuery: '',
    editingToken: null,
    importData: null,
    activities: [],
    currentUser: null,
    isRegisterMode: false
};

// DOM Elements cache
window.DOM = {};

window.cacheDOMElements = function() {
    DOM.tokenGrid = document.getElementById('tokenGrid');
    DOM.emptyState = document.getElementById('emptyState');
    DOM.searchInput = document.getElementById('searchInput');
    DOM.tokenCount = document.getElementById('tokenCount');

    DOM.badgeAll = document.getElementById('badgeAll');
    DOM.toastContainer = document.getElementById('toastContainer');
    DOM.copyFeedback = document.getElementById('copyFeedback');
    DOM.syncStatusDot = document.getElementById('syncStatusDot');
    
    DOM.darkModeToggle = document.getElementById('darkModeToggle');
    
    // Sync elements
    DOM.syncEnabledToggle = document.getElementById('syncEnabledToggle');
    DOM.syncFields = document.getElementById('syncFields');
    DOM.supabaseUrl = document.getElementById('supabaseUrl');
    DOM.supabaseKey = document.getElementById('supabaseKey');
    DOM.btnSaveSync = document.getElementById('btnSaveSync');
    
    // Auth elements
    DOM.btnAuth = document.getElementById('btnAuth');
    DOM.btnGoogleLogin = document.getElementById('btnGoogleLogin');
    DOM.userProfile = document.getElementById('userProfile');
    DOM.btnUser = document.getElementById('btnUser');
    DOM.userInitial = document.getElementById('userInitial');
    DOM.authModal = document.getElementById('authModal');
    DOM.authForm = document.getElementById('authForm');
    DOM.authEmail = document.getElementById('authEmail');
    DOM.authPassword = document.getElementById('authPassword');
    DOM.authTitle = document.getElementById('authTitle');
    DOM.btnAuthSubmit = document.getElementById('btnAuthSubmit');
    DOM.switchToRegister = document.getElementById('switchToRegister');
    DOM.authView = document.getElementById('authView');
    DOM.profileView = document.getElementById('profileView');
    DOM.userEmailText = document.getElementById('userEmailText');
    DOM.userAvatarLarge = document.getElementById('userAvatarLarge');
    DOM.btnSignOut = document.getElementById('btnSignOut');
    DOM.autoSyncToggle = document.getElementById('autoSyncToggle');
    DOM.btnEditSyncConfig = document.getElementById('btnEditSyncConfig');
    DOM.authSwitchText = document.getElementById('authSwitchText');
};

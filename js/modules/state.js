// Storage keys
const STORAGE_KEYS = {
    TOKENS: 'secureauth_tokens',
    SETTINGS: 'secureauth_settings',
    ACTIVITY: 'secureauth_activity',
    PASSWORD_HASH: 'secureauth_password',
    LOCK_STATE: 'secureauth_locked'
};

// Default settings
const DEFAULT_SETTINGS = {
    darkMode: false,
    autoLock: 5,
    copyEffects: true,
    lastBackup: null
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
    isLocked: true,
    currentCategory: 'all',
    searchQuery: '',
    editingToken: null,
    importData: null,
    activities: []
};

// DOM Elements cache
window.DOM = {};

window.cacheDOMElements = function() {
    DOM.lockScreen = document.getElementById('lockScreen');
    DOM.mainApp = document.getElementById('mainApp');
    DOM.tokenGrid = document.getElementById('tokenGrid');
    DOM.emptyState = document.getElementById('emptyState');
    DOM.searchInput = document.getElementById('searchInput');
    DOM.tokenCount = document.getElementById('tokenCount');
    DOM.lastBackup = document.getElementById('lastBackup');
    DOM.badgeAll = document.getElementById('badgeAll');
    DOM.toastContainer = document.getElementById('toastContainer');
    DOM.copyFeedback = document.getElementById('copyFeedback');
    DOM.unlockPassword = document.getElementById('unlockPassword');
    DOM.unlockForm = document.getElementById('unlockForm');
};

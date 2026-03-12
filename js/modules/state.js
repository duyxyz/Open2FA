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
    lastBackup: null,
    sync: {
        enabled: false,
        url: 'https://reyhwybahpgtgqsofjdc.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJleWh3eWJhaHBndGdxc29mamRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNzEyNTQsImV4cCI6MjA4ODg0NzI1NH0.z2yyA9U-qyk41bkvhkhdW2BVNEg5bPU2IZjKyDeQf-E',
        id: ''
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
    activities: []
};

// DOM Elements cache
window.DOM = {};

window.cacheDOMElements = function() {
    DOM.tokenGrid = document.getElementById('tokenGrid');
    DOM.emptyState = document.getElementById('emptyState');
    DOM.searchInput = document.getElementById('searchInput');
    DOM.tokenCount = document.getElementById('tokenCount');
    DOM.lastBackup = document.getElementById('lastBackup');
    DOM.badgeAll = document.getElementById('badgeAll');
    DOM.toastContainer = document.getElementById('toastContainer');
    DOM.copyFeedback = document.getElementById('copyFeedback');
    
    // Sync elements
    DOM.syncEnabledToggle = document.getElementById('syncEnabledToggle');
    DOM.syncFields = document.getElementById('syncFields');
    DOM.supabaseUrl = document.getElementById('supabaseUrl');
    DOM.supabaseKey = document.getElementById('supabaseKey');
    DOM.syncId = document.getElementById('syncId');
    DOM.btnSaveSync = document.getElementById('btnSaveSync');
};

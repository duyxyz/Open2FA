// Storage Management
window.loadState = function() {
    // Load settings from local storage for UI preferences (like Dark Mode)
    try {
        const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (storedSettings) {
            appState.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
        } else {
            appState.settings = { ...DEFAULT_SETTINGS };
        }
    } catch (e) {
        console.error('[Storage] Error loading settings', e);
        appState.settings = { ...DEFAULT_SETTINGS };
    }

    appState.tokens = []; 
    appState.activities = [];
};

// Save state
window.saveTokens = function() {
    if (appState.currentUser) {
        // Cloud is source of truth when logged in
        if (window.pushToCloud) window.pushToCloud();
    } else {
        console.log('[Storage] Save tokens ignored - user not logged in (Cloud-Only Policy)');
    }
};

window.saveSettings = function() {
    // Save settings locally for UI state persistance (e.g. Dark Mode)
    try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appState.settings));
    } catch (e) {
        console.error('[Storage] Failed to save settings to localStorage', e);
    }

    // Sync to cloud if logged in
    if (appState.currentUser && window.pushToCloud) {
        window.pushToCloud();
    }
};

window.saveActivity = function(activity) {
    // Activities are session-only unless we decide to sync them to cloud later
    appState.activities.unshift({
        ...activity,
        time: new Date().toISOString()
    });
    if (appState.activities.length > 100) appState.activities.pop();
};

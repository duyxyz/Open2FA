// Storage Management
window.loadState = function() {
    // Reset to defaults - NO LOCALSTORAGE
    appState.settings = { ...DEFAULT_SETTINGS };
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
    // NO LOCALSTORAGE - Settings are managed via appState and synced to cloud in sync.js
    console.log('[Storage] Settings updated in memory');
};

window.saveActivity = function(activity) {
    // Activities are session-only unless we decide to sync them to cloud later
    appState.activities.unshift({
        ...activity,
        time: new Date().toISOString()
    });
    if (appState.activities.length > 100) appState.activities.pop();
};

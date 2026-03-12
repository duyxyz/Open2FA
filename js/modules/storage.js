// Storage Management
window.loadState = function() {
    // Load settings
    const settingsJson = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (settingsJson) {
      try {
        appState.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) };
      } catch (e) {
        appState.settings = { ...DEFAULT_SETTINGS };
      }
    }

    // Load tokens - SKIP for cloud-only data policy
    // We only load from Supabase now once logged in.
    appState.tokens = []; 


    // Load activity
    const activityJson = localStorage.getItem(STORAGE_KEYS.ACTIVITY);
    if (activityJson) {
      try {
        appState.activities = JSON.parse(activityJson);
      } catch (e) {
        appState.activities = [];
      }
    }
};

// Save state
window.saveTokens = function() {
    if (appState.currentUser) {
        // Cloud is source of truth when logged in
        if (window.pushToCloud) window.pushToCloud();
    } else {
        // Offline fallback: save to localStorage
        localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(appState.tokens));
    }
    if (window.updateStats) window.updateStats();
};

window.saveSettings = function() {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appState.settings));
};

window.saveActivity = function(activity) {
    const activities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY) || '[]');
    activities.unshift({
        ...activity,
        time: new Date().toISOString()
    });
    if (activities.length > 100) activities.pop();
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
};

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

    // Load tokens
    const tokensJson = localStorage.getItem(STORAGE_KEYS.TOKENS);
    if (tokensJson) {
      try {
        appState.tokens = JSON.parse(tokensJson);
      } catch (e) {
        appState.tokens = [];
      }
    }

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
    localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(appState.tokens));
    if(window.updateStats) window.updateStats();
    if(window.pushToCloud) window.pushToCloud();
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

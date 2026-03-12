/**
 * SecureAuth - Modular initialization
 */

(async function() {
    // Initialize app
    async function init() {
      cacheDOMElements();
      loadState();
      setupEventListeners();
      applyTheme();
      
      // Auto-fill sync fields from settings if they exist
      if (appState.settings.sync) {
        if (DOM.supabaseUrl) DOM.supabaseUrl.value = appState.settings.sync.url || '';
        if (DOM.supabaseKey) DOM.supabaseKey.value = appState.settings.sync.key || '';
        if (DOM.autoSyncToggle) DOM.autoSyncToggle.checked = appState.settings.sync.enabled;
      }

      // Start the app directly
      initAppLayout();
      
      // Initialize sync if enabled
      if (window.initSync) await window.initSync();
    }
    
    // Start up once DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

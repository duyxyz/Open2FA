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
      
      // Auto-fill sync fields from settings
      if (appState.settings.sync) {
        DOM.supabaseUrl.value = appState.settings.sync.url || '';
        DOM.supabaseKey.value = appState.settings.sync.key || '';
        DOM.syncId.value = appState.settings.sync.id || '';
        DOM.syncEnabledToggle.checked = appState.settings.sync.enabled || false;
        DOM.syncFields.style.display = appState.settings.sync.enabled ? 'block' : 'none';
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

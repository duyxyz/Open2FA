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
      await checkLock();
    }
    
    // Start up once DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

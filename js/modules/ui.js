// UI functions
window.showLockScreen = function() {
    DOM.lockScreen.setAttribute('aria-hidden', 'false');
    DOM.mainApp.setAttribute('aria-hidden', 'true');
    setTimeout(() => DOM.unlockPassword.focus(), 100);
};

window.showMainApp = function() {
    DOM.lockScreen.setAttribute('aria-hidden', 'true');
    DOM.mainApp.setAttribute('aria-hidden', 'false');
    
    // Show skeleton first
    renderSkeletons();
    
    // Delayed actual render for visual effect
    setTimeout(() => {
        renderTokens(true);
        startTokenUpdate();
        updateStats();
    }, 600);
};

window.renderSkeletons = function() {
    const skeletonHTML = Array(3).fill(0).map(() => `
        <div class="token-card is-loading">
            <div class="token-card-header">
                <div class="token-icon skeleton"></div>
                <div class="token-info">
                    <div class="token-name skeleton"></div>
                    <div class="token-account skeleton"></div>
                </div>
            </div>
            <div class="token-card-body">
                <div class="token-otp skeleton"></div>
                <div class="token-timer skeleton"></div>
            </div>
        </div>
    `).join('');
    DOM.tokenGrid.innerHTML = skeletonHTML;
    DOM.emptyState.classList.remove('active');
};

window.applyTheme = function() {
    if (appState.settings.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      if(document.getElementById('darkModeToggle')) document.getElementById('darkModeToggle').checked = true;
    } else {
      document.documentElement.removeAttribute('data-theme');
      if(document.getElementById('darkModeToggle')) document.getElementById('darkModeToggle').checked = false;
    }
};

window.toggleTheme = function() {
    appState.settings.darkMode = !appState.settings.darkMode;
    saveSettings();
    applyTheme();
    
    const icon = document.getElementById('btnTheme').querySelector('i');
    if (appState.settings.darkMode) {
      icon.classList.replace('fa-moon', 'fa-sun');
    } else {
      icon.classList.replace('fa-sun', 'fa-moon');
    }
};

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
};

window.openModal = function(modalId) {
    document.getElementById(modalId).setAttribute('aria-hidden', 'false');
};

window.closeModal = function(modalId) {
    document.getElementById(modalId).setAttribute('aria-hidden', 'true');
};

window.resetTokenForm = function() {
    document.getElementById('tokenName').value = '';
    document.getElementById('tokenAccount').value = '';
    document.getElementById('tokenSecret').value = '';
    document.getElementById('tokenIcon').value = '';
    document.getElementById('tokenCategory').value = 'other';
};

window.generateId = function() {
    return 'token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

window.renderTokens = function(force = false) {
    const totalTokens = appState.tokens.length;
    
    // Check if we need to rebuild the grid (add/remove tokens)
    // Or if it's the first time
    const currentCardsCount = DOM.tokenGrid.children.length;
    
    if (totalTokens === 0) {
        DOM.tokenGrid.innerHTML = '';
        DOM.emptyState.classList.add('active');
        updateBadgeCounts();
        return;
    }

    DOM.emptyState.classList.remove('active');

    // If tokens were added or removed, or grid is empty, or forced, rebuild everything
    if (force || totalTokens !== currentCardsCount) {
        DOM.tokenGrid.innerHTML = appState.tokens.map((token, index) => createTokenCard(token, index)).join('');
        attachTokenEvents();
        updateTokens(); // Update values immediately
    }

    // Now handle filtering (Category/Search) by toggling visibility
    const filteredIds = new Set(filterTokens(appState.tokens).map(t => t.id));
    
    Array.from(DOM.tokenGrid.children).forEach(card => {
        const id = card.dataset.id;
        if (filteredIds.has(id)) {
            card.style.display = '';
            card.classList.remove('filtering'); // Prevent re-triggering animation
        } else {
            card.style.display = 'none';
        }
    });
    
    updateBadgeCounts();
};

window.filterTokens = function(tokens) {
    return tokens.filter(token => {
      const matchesCategory = appState.currentCategory === 'all' || token.category === appState.currentCategory;
      const matchesSearch = !appState.searchQuery || 
        token.name.toLowerCase().includes(appState.searchQuery.toLowerCase()) ||
        token.account.toLowerCase().includes(appState.searchQuery.toLowerCase()) ||
        (token.issuer && token.issuer.toLowerCase().includes(appState.searchQuery.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    });
};

window.createTokenCard = function(token, index) {
    const category = token.category || 'other';
    const firstChar = token.name.charAt(0).toUpperCase();
    const iconContent = token.iconUrl 
      ? `<img src="${token.iconUrl}" alt="${token.name}" class="token-icon-img" onerror="this.parentElement.innerHTML='${firstChar}';this.parentElement.classList.add('${category}')">`
      : `<span class="${category}">${firstChar}</span>`;
    
    return `
      <div class="token-card" data-id="${token.id}" draggable="true" style="animation-delay: ${index * 0.05}s">
        <div class="token-card-header">
          <div class="token-icon ${token.iconUrl ? '' : category}">${iconContent}</div>
          <div class="token-info">
            <div class="token-name">${token.name}</div>
            <div class="token-account">${token.account}</div>
          </div>
          <button class="edit-btn" data-id="${token.id}" data-action="edit" title="Chỉnh sửa">
            <i class="fas fa-edit"></i>
          </button>
        </div>
        <div class="token-card-body">
          <div class="token-otp-container">
            <div class="token-otp" id="otp-${token.id}">------</div>
            <div class="token-timer">
              <svg viewBox="0 0 36 36">
                <circle class="token-timer-bg" cx="18" cy="18" r="16"></circle>
                <circle class="token-timer-progress" id="timer-${token.id}" cx="18" cy="18" r="16" stroke-dasharray="100, 100"></circle>
              </svg>
              <div class="token-timer-text" id="timer-text-${token.id}">30</div>
            </div>
          </div>
        </div>
      </div>
    `;
};

window.attachTokenEvents = function() {
    // Edit button
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        openEditModal(id);
      });
    });

    // Card click - Copy token and ripple
    document.querySelectorAll('.token-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        if (window.createRipple) {
            window.createRipple(e);
        }
        const id = card.dataset.id;
        const otp = document.getElementById(`otp-${id}`)?.textContent;
        
        if (otp && otp !== '------') {
          await navigator.clipboard.writeText(otp);
          const token = appState.tokens.find(t => t.id === id);
          saveActivity({ type: 'copy', text: `Sao chép mã: ${token?.name}` });
        }
      });

      // Drag and Drop
      card.addEventListener('dragstart', (e) => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', card.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        document.querySelectorAll('.token-card').forEach(c => c.classList.remove('drag-over'));
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const draggingCard = document.querySelector('.token-card.dragging');
        if (draggingCard && draggingCard !== card) {
          card.classList.add('drag-over');
        }
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-over');
        const draggedId = e.dataTransfer.getData('text/plain');
        
        if (draggedId && draggedId !== card.dataset.id) {
            reorderTokens(draggedId, card.dataset.id);
        }
      });
    });
};

window.reorderTokens = function(draggedId, targetId) {
    const tokens = [...appState.tokens];
    const draggedIndex = tokens.findIndex(t => t.id === draggedId);
    const targetIndex = tokens.findIndex(t => t.id === targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = tokens.splice(draggedIndex, 1);
        tokens.splice(targetIndex, 0, removed);
        
        appState.tokens = tokens;
        saveTokens();
        
        // Small delay to let drop finish
        setTimeout(() => {
            renderTokens(true);
            saveActivity({ type: 'reorder', text: `Đổi vị trí: ${removed.name}` });
            showToast('Đã đổi vị trí', 'success');
        }, 50);
    }
};

window.openEditModal = function(id) {
    const token = appState.tokens.find(t => t.id === id);
    if (!token) return;

    document.getElementById('editTokenId').value = token.id;
    document.getElementById('editTokenName').value = token.name;
    document.getElementById('editTokenAccount').value = token.account;
    document.getElementById('editTokenCategory').value = token.category || 'other';
    document.getElementById('editTokenIcon').value = token.iconUrl || '';

    openModal('editTokenModal');
};

window.updateBadgeCounts = function() {
    const total = appState.tokens.length;
    DOM.badgeAll.textContent = total;
    DOM.tokenCount.textContent = `${total} token${total !== 1 ? 's' : ''}`;
};

window.updateStats = function() {
    if (appState.settings.lastBackup) {
      const date = new Date(appState.settings.lastBackup);
      DOM.lastBackup.textContent = `Sao lưu: ${date.toLocaleDateString('vi-VN')}`;
    }
};

let updateInterval;
window.startTokenUpdate = function() {
    if (updateInterval) clearInterval(updateInterval);
    updateTokens();
    updateInterval = setInterval(updateTokens, 50); // 50ms for smooth animation
};

window.updateTokens = async function() {
    const tokens = filterTokens(appState.tokens);
    const timeRemaining = TOTP.getTimeRemaining(30);
    const percentage = (timeRemaining / 30) * 100;
    for (const token of tokens) {
      const otpElement = document.getElementById(`otp-${token.id}`);
      const timerCircle = document.getElementById(`timer-${token.id}`);
      const timerText = document.getElementById(`timer-text-${token.id}`);

      if (otpElement) {
        const fullTime = Math.floor(Date.now() / 1000);
        // Only update OTP text if the second has changed to avoid UI flickering
        if (!otpElement.lastUpdate || otpElement.lastUpdate !== fullTime) {
            TOTP.generateAsync(token.secret).then(code => {
                otpElement.textContent = code;
                otpElement.lastUpdate = fullTime;
            });
        }
      }

      if (timerCircle) {
        // High-precision stroke update
        timerCircle.style.strokeDasharray = `${percentage}, 100`;
        
        // Change color when less than 5 seconds
        if (timeRemaining <= 5) {
          timerCircle.style.stroke = 'var(--danger)';
        } else {
          timerCircle.style.stroke = 'var(--success)';
        }
      }

      if (timerText) {
        timerText.textContent = Math.ceil(timeRemaining);
      }
    }
};

window.showCopyFeedback = function() {
    DOM.copyFeedback.classList.add('show');
    setTimeout(() => {
      DOM.copyFeedback.classList.remove('show');
    }, 1000);
};

window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      ${message}
    `;
    
    DOM.toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
};

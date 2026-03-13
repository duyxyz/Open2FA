// UI functions
window.initAppLayout = function() {
    renderSkeletons();
    
    // Delayed actual render for visual effect
    setTimeout(() => {
        renderTokens(true);
        startTokenUpdate();
        updateStats();
    }, 600);
};

window.renderSkeletons = function() {
    const skeletonHTML = Array(8).fill(0).map(() => `
        <div class="token-card is-loading">
            <div class="token-card-header">
                <div class="token-icon skeleton"></div>
                <div class="token-info">
                    <div class="token-name skeleton"></div>
                    <div class="token-account skeleton"></div>
                </div>
            </div>
            <div class="token-card-body">
                <div class="token-otp-container">
                    <div class="token-otp skeleton"></div>
                    <div class="token-timer pizza-timer skeleton"></div>
                </div>
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
};

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
};

window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    if ((modalId === 'addTokenModal' || modalId === 'exportModal') && !appState.currentUser) {
        showToast('Vui lòng đăng nhập để sử dụng tính năng này', 'info');
        // When opening authModal from a restricted action, show it as modal, not dropdown
        document.getElementById('authModal').classList.remove('dropdown');
        document.getElementById('authModal').setAttribute('aria-hidden', 'false');
        return;
    }

    // Special handling for authModal when logged in: show as dropdown
    if (modalId === 'authModal' && appState.currentUser) {
        modal.classList.add('dropdown');
    } else {
        modal.classList.remove('dropdown');
    }

    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
};

window.closeModal = function(modalId) {
    document.getElementById(modalId).setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
};

window.resetTokenForm = function() {
    document.getElementById('tokenName').value = '';
    document.getElementById('tokenAccount').value = '';
    document.getElementById('tokenSecret').value = '';
    document.getElementById('tokenIcon').value = '';
};

window.generateId = function() {
    return 'token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

window.renderTokens = function(force = false) {
    const totalTokens = appState.tokens.length;
    
    const currentCardsCount = DOM.tokenGrid.children.length;
    
    if (totalTokens === 0) {
        DOM.tokenGrid.innerHTML = '';
        DOM.emptyState.classList.add('active');
        return;
    }

    DOM.emptyState.classList.remove('active');

    if (force || totalTokens !== currentCardsCount) {
        DOM.tokenGrid.innerHTML = appState.tokens.map((token, index) => createTokenCard(token, index)).join('');
        attachTokenEvents();
        updateTokens();
    }

    const filteredIds = new Set(filterTokens(appState.tokens).map(t => t.id));
    
    Array.from(DOM.tokenGrid.children).forEach(card => {
        const id = card.dataset.id;
        if (filteredIds.has(id)) {
            card.style.display = '';
            card.classList.remove('filtering');
        } else {
            card.style.display = 'none';
        }
    });
};

window.filterTokens = function(tokens) {
    return tokens.filter(token => {
      const matchesSearch = !appState.searchQuery || 
        token.name.toLowerCase().includes(appState.searchQuery.toLowerCase()) ||
        token.account.toLowerCase().includes(appState.searchQuery.toLowerCase()) ||
        (token.issuer && token.issuer.toLowerCase().includes(appState.searchQuery.toLowerCase()));
      
      return matchesSearch;
    });
};

window.createTokenCard = function(token, index) {
    const firstChar = token.name.charAt(0).toUpperCase();
    const iconContent = token.iconUrl 
      ? `<img src="${token.iconUrl}" alt="${token.name}" class="token-icon-img" onerror="this.parentElement.innerHTML='${firstChar}'">`
      : `<span>${firstChar}</span>`;
    
    return `
      <div class="token-card" data-id="${token.id}" draggable="true" style="animation-delay: ${index * 0.05}s">
        <div class="token-card-header">
          <div class="token-icon">${iconContent}</div>
          <div class="token-info">
            <div class="token-name">${token.name}</div>
            <div class="token-account">${token.account}</div>
          </div>
          <button class="edit-btn" data-id="${token.id}" data-action="edit" title="Chỉnh sửa">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
        <div class="token-card-body">
          <div class="token-otp-container">
            <div class="token-otp" id="otp-${token.id}">------</div>
            <div class="token-timer pizza-timer">
              <svg viewBox="0 0 32 32">
                <circle class="pizza-bg" cx="16" cy="16" r="16"></circle>
                <circle class="pizza-slice" id="timer-${token.id}" cx="16" cy="16" r="8" stroke-width="16"></circle>
              </svg>
            </div>
          </div>
        </div>
      </div>
    `;
};

window.attachTokenEvents = function() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        openEditModal(id);
      });
    });

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
    document.getElementById('editTokenIcon').value = token.iconUrl || '';

    openModal('editTokenModal');
};

// function window.updateStats removed as per cloud-only requirement


let updateInterval;
window.startTokenUpdate = function() {
    if (updateInterval) clearInterval(updateInterval);
    updateTokens();
    updateInterval = setInterval(updateTokens, 50); 
};

window.updateTokens = async function() {
    const tokens = filterTokens(appState.tokens);
    const timeRemaining = TOTP.getTimeRemaining(30);
    const percentage = (timeRemaining / 30) * 100;
    for (const token of tokens) {
      const otpElement = document.getElementById(`otp-${token.id}`);
      const timerCircle = document.getElementById(`timer-${token.id}`);

      if (otpElement) {
        const fullTime = Math.floor(Date.now() / 1000);
        if (!otpElement.lastUpdate || otpElement.lastUpdate !== fullTime) {
            TOTP.generateAsync(token.secret).then(code => {
                otpElement.textContent = code;
                otpElement.lastUpdate = fullTime;
            });
        }
      }

      if (timerCircle) {
        const circumference = 50.265;
        const offset = (percentage / 100) * circumference;
        timerCircle.style.strokeDasharray = `${offset} ${circumference}`;
        
        // Keep timer color constant (not turning red)
        timerCircle.style.stroke = 'var(--timer-color)';
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

// Export and File Handlers
window.exportJSON = function() {
    try {
        const data = JSON.stringify(appState.tokens, null, 2);
        downloadFile(data, 'secureauth-backup.json', 'application/json');
        closeModal('exportModal');
        showToast('Đã xuất file JSON', 'success');
    } catch (e) {
        showToast('Lỗi khi xuất file', 'error');
    }
};

window.exportEncrypted = async function() {
    const password = prompt('Nhập mật khẩu để mã hóa:');
    if (!password) return;

    try {
        const key = await deriveKey(password);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const data = JSON.stringify(appState.tokens);
        const encoded = new TextEncoder().encode(data);
        
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          encoded
        );

        const result = {
          iv: Array.from(iv),
          data: Array.from(new Uint8Array(encrypted))
        };

        downloadFile(JSON.stringify(result), 'secureauth-backup-encrypted.json', 'application/json');
        closeModal('exportModal');
        showToast('Đã xuất file mã hóa', 'success');
    } catch (err) {
        showToast('Lỗi khi xuất file mã hóa', 'error');
    }
};

window.downloadFile = function(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

window.setupImportDropzone = function() {
    const dropzone = document.getElementById('importDropzone');
    const fileInput = document.getElementById('importFile');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());
    
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleImportFile(file);
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleImportFile(file);
    });

    const btnConfirm = document.getElementById('btnConfirmImport');
    if (btnConfirm) btnConfirm.addEventListener('click', confirmImport);
};

window.handleImportFile = async function(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        const data = JSON.parse(content);
        
        if (data.iv && data.data) {
          const password = document.getElementById('importPassword').value;
          if (!password) {
            showToast('Vui lòng nhập mật khẩu để giải mã', 'error');
            return;
          }
          
          try {
            const decrypted = await decryptData(data, password);
            appState.importData = JSON.parse(decrypted);
          } catch (err) {
            showToast('Mật khẩu không đúng', 'error');
            return;
          }
        } else if (Array.isArray(data)) {
          appState.importData = data;
        } else {
          throw new Error('Invalid format');
        }

        const preview = document.getElementById('importPreview');
        if (preview) {
            preview.innerHTML = `<strong>Tìm thấy ${appState.importData.length} token:</strong><br>` +
                appState.importData.slice(0, 5).map(t => `• ${t.name} (${t.account})`).join('<br>') +
              (appState.importData.length > 5 ? `<br>... và ${appState.importData.length - 5} token khác` : '');
            preview.classList.add('active');
        }
        
        const btnConfirm = document.getElementById('btnConfirmImport');
        if (btnConfirm) btnConfirm.disabled = false;
        
        showToast('Tải file thành công', 'success');
      } catch (err) {
        showToast('File không hợp lệ', 'error');
      }
    };
    reader.readAsText(file);
};

window.confirmImport = function() {
    if (!appState.importData || !appState.importData.length) return;

    const importMode = document.querySelector('input[name="importMode"]:checked')?.value || 'merge';
    let addedCount = 0;

    if (importMode === 'replace') {
        if (!confirm('Hành động này sẽ XÓA TOÀN BỘ token cũ và thay thế bằng dữ liệu mới. Bạn có chắc chắn không?')) {
            return;
        }
        appState.tokens = [...appState.importData];
        addedCount = appState.importData.length;
    } else {
        const existingIds = new Set(appState.tokens.map(t => t.id));
        const newTokens = appState.importData.filter(t => !existingIds.has(t.id));
        appState.tokens = [...appState.tokens, ...newTokens];
        addedCount = newTokens.length;
    }
    
    saveTokens();
    appState.settings.lastBackup = Date.now();
    saveSettings();
    closeModal('importModal');
    renderTokens(true);
    showToast(`Đã nhập hợp lệ ${addedCount} token`, 'success');
    
    appState.importData = null;
    const preview = document.getElementById('importPreview');
    if (preview) preview.classList.remove('active');
    const btnConfirm = document.getElementById('btnConfirmImport');
    if (btnConfirm) btnConfirm.disabled = true;
};

window.handleKeyboard = function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (DOM.searchInput) DOM.searchInput.focus();
    }
};

window.handleSaveToken = function() {
    const name = document.getElementById('tokenName').value.trim();
    const account = document.getElementById('tokenAccount').value.trim();
    const secret = document.getElementById('tokenSecret').value.trim().toUpperCase();
    const iconUrl = document.getElementById('tokenIcon') ? document.getElementById('tokenIcon').value.trim() : '';

    if (!name || !account || !secret) {
      showToast('Vui lòng điền đầy đủ thông tin', 'error');
      return;
    }

    const token = {
      id: generateId(),
      name,
      account,
      secret,
      iconUrl: iconUrl || '',
      createdAt: Date.now()
    };

    appState.tokens.push(token);
    saveTokens();
    renderTokens(true);
    closeModal('addTokenModal');
    resetTokenForm();
    showToast(`Đã thêm token ${name}`, 'success');
};

window.handleUpdateToken = function() {
    const id = document.getElementById('editTokenId').value;
    const name = document.getElementById('editTokenName').value.trim();
    const account = document.getElementById('editTokenAccount').value.trim();
    const iconUrl = document.getElementById('editTokenIcon') ? document.getElementById('editTokenIcon').value.trim() : '';

    const index = appState.tokens.findIndex(t => t.id === id);
    if (index === -1) return;

    appState.tokens[index] = {
      ...appState.tokens[index],
      name,
      account,
      iconUrl: iconUrl || ''
    };

    saveTokens();
    renderTokens(true);
    closeModal('editTokenModal');
    showToast(`Đã cập nhật token ${name}`, 'success');
};

window.handleDeleteToken = function() {
    const id = document.getElementById('editTokenId').value;
    const token = appState.tokens.find(t => t.id === id);
    if (!token) return;

    if (confirm(`Bạn có chắc muốn xóa token "${token.name}"?`)) {
      appState.tokens = appState.tokens.filter(t => t.id !== id);
      saveTokens();
      renderTokens(true);
      closeModal('editTokenModal');
      showToast(`Đã xóa token ${token.name}`, 'success');
    }
};

window.handleSaveSync = async function() {
    const url = DOM.supabaseUrl?.value.trim();
    const key = DOM.supabaseKey?.value.trim();

    if (!url || !key) {
        showToast('Vui lòng điền đầy đủ các trường cấu hình', 'error');
        return;
    }

    appState.settings.sync.url = url;
    appState.settings.sync.key = key;
    saveSettings();
    showToast('Đã lưu cấu hình Supabase', 'success');
    if (DOM.syncFields) DOM.syncFields.style.display = 'none';
    if (window.initSync) await window.initSync();
};

window.setupEventListeners = function() {
    const bind = (el, event, fn) => {
        if (el) el.addEventListener(event, fn);
    };

    const bindById = (id, event, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, fn);
    };

    // 0. Login Gate
    bindById('btnGateGoogle', 'click', () => {
        if (window.signInWithGoogle) window.signInWithGoogle();
    });

    bindById('gateAuthForm', 'submit', (e) => {
        if (window.handleAuthAction) window.handleAuthAction(e, 'gate');
    });

    bindById('gateSwitchLink', 'click', (e) => {
        e.preventDefault();
        appState.isRegisterMode = !appState.isRegisterMode;
        const text = document.getElementById('gateSwitchText');
        const link = document.getElementById('gateSwitchLink');
        const btn = document.getElementById('btnGateSubmit');
        
        if (appState.isRegisterMode) {
            text.textContent = 'Đã có tài khoản? ';
            link.textContent = 'Đăng nhập';
            btn.textContent = 'Đăng ký';
        } else {
            text.textContent = 'Chưa có tài khoản? ';
            link.textContent = 'Đăng ký ngay';
            btn.textContent = 'Đăng nhập';
        }
    });

    // 1. Auth & Profile
    bind(DOM.btnAuth, 'click', () => {
        appState.isRegisterMode = false;
        if (DOM.authTitle) DOM.authTitle.textContent = 'Đăng nhập';
        if (DOM.btnAuthSubmit) DOM.btnAuthSubmit.textContent = 'Đăng nhập';
        if (DOM.authView) DOM.authView.style.display = 'block';
        if (DOM.profileView) DOM.profileView.style.display = 'none';
        openModal('authModal');
    });

    bind(DOM.btnUser, 'click', () => openModal('authModal'));
    bind(DOM.btnGoogleLogin, 'click', () => window.signInWithGoogle());

    bind(DOM.switchToRegister, 'click', (e) => {
        e.preventDefault();
        appState.isRegisterMode = !appState.isRegisterMode;
        if (DOM.authTitle) DOM.authTitle.textContent = appState.isRegisterMode ? 'Đăng ký' : 'Đăng nhập';
        if (DOM.btnAuthSubmit) DOM.btnAuthSubmit.textContent = appState.isRegisterMode ? 'Đăng ký' : 'Đăng nhập';
        if (DOM.switchToRegister) DOM.switchToRegister.textContent = appState.isRegisterMode ? 'Đăng nhập ngay' : 'Đăng ký ngay';
        if (DOM.authSwitchText) DOM.authSwitchText.textContent = appState.isRegisterMode ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? ';
    });

    if (DOM.authForm) DOM.authForm.addEventListener('submit', (e) => window.handleAuthAction(e));
    bind(DOM.btnSignOut, 'click', () => window.handleSignOut());
    
    // Simplified settings - removed sync toggles from UI


    // 2. Header & Main Buttons
    bindById('btnAddToken', 'click', () => { switchTab('scan'); openModal('addTokenModal'); });
    
    // Updated Settings/Profile interactions
    const btnExportProfile = document.getElementById('btnExport');
    const btnImportProfile = document.getElementById('btnImport');
    bind(btnExportProfile, 'click', () => { 
        closeModal('authModal'); 
        setTimeout(() => openModal('exportModal'), 200); 
    });
    bind(btnImportProfile, 'click', () => { 
        closeModal('authModal'); 
        setTimeout(() => openModal('importModal'), 200); 
    });

    bind(DOM.darkModeToggle, 'change', toggleTheme);

    // 3. Empty State Buttons
    bindById('btnEmptyAdd', 'click', () => openModal('addTokenModal'));
    bindById('btnEmptyImport', 'click', () => openModal('importModal'));

    // 4. Modal Actions
    bindById('btnSaveToken', 'click', handleSaveToken);
    bindById('btnUpdateToken', 'click', handleUpdateToken);
    bindById('btnDeleteToken', 'click', handleDeleteToken);
    bindById('btnExportJson', 'click', exportJSON);
    bindById('btnExportEncrypted', 'click', exportEncrypted);
    bindById('btnSaveSync', 'click', handleSaveSync);
    bindById('btnGenerateSecret', 'click', () => {
        const secret = TOTP.generateSecret(16);
        const input = document.getElementById('tokenSecret');
        if (input) input.value = secret;
    });

    // 5. Search & Filters
    if (DOM.searchInput) DOM.searchInput.addEventListener('input', () => renderTokens());
    
    const modalSearchInput = document.getElementById('modalSearchInput');
    if (modalSearchInput) modalSearchInput.addEventListener('input', () => renderSearchResults());

    // Search button click handling for mobile
    const searchBtn = document.querySelector('.header .search-box i');
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                e.stopPropagation();
                openModal('searchModal');
            }
        });
    }

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // 6. Modal Close Generic
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const modalId = btn.dataset.close;
            closeModal(modalId);
            // Clear search on close
            if (modalId === 'searchModal') {
                const input = document.getElementById('modalSearchInput');
                const grid = document.getElementById('modalSearchGrid');
                if (input) input.value = '';
                if (grid) grid.innerHTML = '';
                renderTokens(); 
            }
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            const modal = overlay.closest('.modal');
            if (modal) {
                closeModal(modal.id);
                // Clear search on close
                if (modal.id === 'searchModal') {
                    const input = document.getElementById('modalSearchInput');
                    const grid = document.getElementById('modalSearchGrid');
                    if (input) input.value = '';
                    if (grid) grid.innerHTML = '';
                    renderTokens(); // Restore main grid state
                }
            }
        });
    });

    // 7. Global listeners
    setupImportDropzone();
    document.addEventListener('keydown', handleKeyboard);
};

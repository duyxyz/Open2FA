// Export and File Handlers
window.exportJSON = function() {
    const data = JSON.stringify(appState.tokens, null, 2);
    downloadFile(data, 'secureauth-backup.json', 'application/json');
    closeModal('exportModal');
    showToast('Đã xuất file JSON', 'success');
};

window.exportEncrypted = async function() {
    const password = prompt('Nhập mật khẩu để mã hóa:');
    if (!password) return;

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

    document.getElementById('btnConfirmImport').addEventListener('click', confirmImport);
};

window.handleImportFile = async function(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        
        // Try to parse as JSON
        const data = JSON.parse(content);
        
        // Check if it's encrypted
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

        // Show preview
        const preview = document.getElementById('importPreview');
        preview.innerHTML = `<strong>Tìm thấy ${appState.importData.length} token:</strong><br>` +
            appState.importData.slice(0, 5).map(t => `• ${t.name} (${t.account})`).join('<br>') +
          (appState.importData.length > 5 ? `<br>... và ${appState.importData.length - 5} token khác` : '');
        preview.classList.add('active');
        document.getElementById('btnConfirmImport').disabled = false;
        
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
        // Merge tokens
        const existingIds = new Set(appState.tokens.map(t => t.id));
        const newTokens = appState.importData.filter(t => !existingIds.has(t.id));
        appState.tokens = [...appState.tokens, ...newTokens];
        addedCount = newTokens.length;
    }
    
    saveTokens();
    
    appState.settings.lastBackup = Date.now();
    saveSettings();
    
    closeModal('importModal');
    renderTokens();
    
    showToast(`Đã nhập hợp lệ ${addedCount} token`, 'success');
    
    // Reset
    appState.importData = null;
    document.getElementById('importPreview').classList.remove('active');
    document.getElementById('btnConfirmImport').disabled = true;
    document.getElementById('importPassword').value = '';
};

window.handleKeyboard = function(e) {
    // Cmd/Ctrl + K for search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      DOM.searchInput.focus();
    }
};

window.handleSaveToken = function() {
    const name = document.getElementById('tokenName').value.trim();
    const account = document.getElementById('tokenAccount').value.trim();
    const secret = document.getElementById('tokenSecret').value.trim().toUpperCase();
    const category = document.getElementById('tokenCategory').value;
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
      category,
      iconUrl: iconUrl || '',
      createdAt: Date.now()
    };

    appState.tokens.push(token);
    saveTokens();
    renderTokens(true);
    closeModal('addTokenModal');
    resetTokenForm();
    
    saveActivity({ type: 'add', text: `Thêm token: ${name}` });
    showToast(`Đã thêm token ${name}`, 'success');
};

window.handleUpdateToken = function() {
    const id = document.getElementById('editTokenId').value;
    const name = document.getElementById('editTokenName').value.trim();
    const account = document.getElementById('editTokenAccount').value.trim();
    const category = document.getElementById('editTokenCategory').value;
    const iconUrl = document.getElementById('editTokenIcon') ? document.getElementById('editTokenIcon').value.trim() : '';

    const index = appState.tokens.findIndex(t => t.id === id);
    if (index === -1) return;

    appState.tokens[index] = {
      ...appState.tokens[index],
      name,
      account,
      category,
      iconUrl: iconUrl || ''
    };

    saveTokens();
    renderTokens(true);
    closeModal('editTokenModal');
    saveActivity({ type: 'update', text: `Cập nhật token: ${name}` });
    showToast(`Đã cập nhật token ${name}`, 'success');
};

window.handleGoogleAuthPaste = function(e) {
    const val = e.target.value.trim();
    if (val.startsWith('otpauth-migration://')) {
        try {
            const url = new URL(val);
            const dataBase64 = url.searchParams.get('data');
            if (dataBase64) {
                // Decode URL component and replace url-safe characters
                let b64 = decodeURIComponent(dataBase64).replace(/-/g, '+').replace(/_/g, '/');
                while (b64.length % 4 !== 0) b64 += '=';
                
                const bytes = decodeBase64(b64);
                const accounts = parseProtobuf(bytes);
                
                if (accounts.length > 0) {
                    const importMode = document.querySelector('input[name="googleImportMode"]:checked')?.value || 'merge';
                    
                    if (importMode === 'replace') {
                        if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ Token cũ và chép đè dữ liệu từ Google Auth sang không?')) {
                            e.target.value = '';
                            return;
                        }
                        appState.tokens = []; // Clear for replace mode
                    }

                    accounts.forEach(acc => {
                        const token = {
                            id: generateId(),
                            name: acc.name || acc.issuer || 'Google Auth Import',
                            account: acc.account || acc.name || '',
                            secret: acc.secretBase32,
                            category: 'other',
                            iconUrl: '',
                            createdAt: Date.now()
                        };
                        appState.tokens.push(token);
                    });
                    
                    saveTokens();
                    closeModal('addTokenModal');
                    e.target.value = '';
                    
                    renderTokens(true);
                    saveActivity({ type: 'add', text: `Nhập ${accounts.length} token từ Google Auth` });
                    showToast(`Đã thêm ${accounts.length} token từ Google Auth`, 'success');
                } else {
                    showToast('Không tìm thấy token hợp lệ', 'error');
                }
            }
        } catch (err) {
            console.error('Lỗi khi giải mã Google Auth:', err);
            showToast('URI không đúng định dạng', 'error');
        }
    }
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
      saveActivity({ type: 'delete', text: `Xóa token: ${token.name}` });
      showToast(`Đã xóa token ${token.name}`, 'success');
    }
};

window.handleSaveSync = async function() {
    const url = DOM.supabaseUrl.value.trim();
    const key = DOM.supabaseKey.value.trim();
    const id = DOM.syncId.value.trim();

    if (!url || !key || !id) {
        showToast('Vui lòng điền đầy đủ các trường đồng bộ', 'error');
        return;
    }

    appState.settings.sync.url = url;
    appState.settings.sync.key = key;
    appState.settings.sync.id = id;
    appState.settings.sync.enabled = true;
    DOM.syncEnabledToggle.checked = true;

    saveSettings();
    
    if (window.initSync) {
        await window.initSync();
        // Option to push local data immediately if cloud is empty
        await window.pushToCloud();
    }
};

window.setupEventListeners = function() {
    // Google Auth Import logic
    document.getElementById('otpauthUri').addEventListener('input', handleGoogleAuthPaste);

    // Header buttons
    document.getElementById('btnAddToken').addEventListener('click', () => {
        switchTab('scan');
        openModal('addTokenModal');
    });
    document.getElementById('btnImport').addEventListener('click', () => openModal('importModal'));
    document.getElementById('btnExport').addEventListener('click', () => openModal('exportModal'));
    document.getElementById('btnSettings').addEventListener('click', () => openModal('settingsModal'));
    document.getElementById('btnTheme').addEventListener('click', toggleTheme);

    // Empty state buttons
    document.getElementById('btnEmptyAdd').addEventListener('click', () => openModal('addTokenModal'));
    document.getElementById('btnEmptyImport').addEventListener('click', () => openModal('importModal'));

    // Search
    DOM.searchInput.addEventListener('input', (e) => {
      appState.searchQuery = e.target.value;
      renderTokens();
    });

    // Categories
    document.querySelectorAll('.category').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.category').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        appState.currentCategory = btn.dataset.category;
        renderTokens();
      });
    });

    // Modal tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
      });
    });

    // Modal close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        closeModal(modalId);
      });
    });

    // Modal overlays
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', () => {
        const modal = overlay.closest('.modal');
        if (modal) closeModal(modal.id);
      });
    });

    // Generate secret
    document.getElementById('btnGenerateSecret').addEventListener('click', () => {
      const secret = TOTP.generateSecret(16);
      document.getElementById('tokenSecret').value = secret;
    });

    // Save token
    document.getElementById('btnSaveToken').addEventListener('click', handleSaveToken);

    // Edit token
    document.getElementById('btnUpdateToken').addEventListener('click', handleUpdateToken);
    document.getElementById('btnDeleteToken').addEventListener('click', handleDeleteToken);

    // Settings
    document.getElementById('autoLockTime').addEventListener('change', (e) => {
      appState.settings.autoLock = parseInt(e.target.value);
      saveSettings();
    });
    document.getElementById('darkModeToggle').addEventListener('change', (e) => {
      appState.settings.darkMode = e.target.checked;
      saveSettings();
      applyTheme();
    });
    document.getElementById('copyEffectsToggle').addEventListener('change', (e) => {
      appState.settings.copyEffects = e.target.checked;
      saveSettings();
    });

    // Sync
    DOM.syncEnabledToggle.addEventListener('change', (e) => {
      appState.settings.sync.enabled = e.target.checked;
      DOM.syncFields.style.display = e.target.checked ? 'block' : 'none';
      saveSettings();
      if (!e.target.checked && window.initSync) window.initSync();
    });

    DOM.btnSaveSync.addEventListener('click', handleSaveSync);

    // Export
    document.getElementById('btnExportJson').addEventListener('click', exportJSON);
    document.getElementById('btnExportEncrypted').addEventListener('click', exportEncrypted);

    // Import
    setupImportDropzone();

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
};

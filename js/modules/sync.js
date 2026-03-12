// Supabase Realtime Sync Module
let supabaseClient = null;
let syncChannel = null;

window.initSync = async function() {
    const { url, key } = appState.settings.sync;
    
    if (!url || !key || !window.supabase) {
        console.warn('Supabase configuration or library missing');
        return;
    }

    try {
        supabaseClient = window.supabase.createClient(url, key);
        
        supabaseClient.auth.onAuthStateChange((event, session) => {
            handleAuthStateChange(event, session);
        });
        
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            handleAuthStateChange('SIGNED_IN', session);
        }
    } catch (error) {
        console.error('Supabase init error:', error);
    }
};

async function handleAuthStateChange(event, session) {
    if (session && session.user) {
        appState.currentUser = session.user;
        updateAuthUI(true);
        updateSyncStatus('online');
        // Explicitly clear local tokens storage to ensure no local traces
        localStorage.removeItem('secureauth_tokens');
        subscribeToUserSync(session.user.id);
        // Load tokens from cloud, it is the source of truth
        await loadFromCloud();
    } else {
        appState.currentUser = null;
        updateAuthUI(false);
        updateSyncStatus('offline');
        if (syncChannel) {
            syncChannel.unsubscribe();
            syncChannel = null;
        }
    }
}

function updateAuthUI(isLoggedIn) {
    const loginGate = document.getElementById('loginGate');
    const mainApp = document.getElementById('mainApp');

    if (isLoggedIn) {
        // App is always shown now, no need to toggle main layout
        
        if (!DOM.btnAuth) return;
        DOM.btnAuth.style.display = 'none';
        DOM.userProfile.style.display = 'flex';
        
        const user = appState.currentUser;
        const email = user.email || 'User';
        const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
        const initial = email.charAt(0).toUpperCase();

        if (avatarUrl) {
            DOM.userInitial.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            DOM.userAvatarLarge.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            DOM.userInitial.textContent = initial;
            DOM.userAvatarLarge.textContent = initial;
        }

        DOM.userEmailText.textContent = email;
        if (DOM.authView) DOM.authView.style.display = 'none';
        if (DOM.profileView) DOM.profileView.style.display = 'block';
        if (DOM.authTitle) DOM.authTitle.textContent = 'Tài khoản';
    } else {
        // App is always shown now
        
        if (!DOM.btnAuth) return;
        DOM.btnAuth.style.display = 'flex';
        DOM.userProfile.style.display = 'none';
        if (DOM.authView) DOM.authView.style.display = 'block';
        if (DOM.profileView) DOM.profileView.style.display = 'none';
        if (DOM.authTitle) DOM.authTitle.textContent = appState.isRegisterMode ? 'Đăng ký' : 'Đăng nhập';
    }
}

function subscribeToUserSync(userId) {
    if (syncChannel) syncChannel.unsubscribe();
    
    syncChannel = supabaseClient
        .channel('user-sync-' + userId)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'tokens_sync',
                filter: `user_id=eq.${userId}`
            },
            () => loadFromCloud()
        )
        .subscribe();
}

window.handleAuthAction = async function(e, type = 'modal') {
    if (e) e.preventDefault();
    if (!supabaseClient) {
        showToast('Chưa kết nối được máy chủ', 'error');
        return;
    }

    const email = type === 'gate' ? document.getElementById('gateEmail').value : DOM.authEmail.value;
    const password = type === 'gate' ? document.getElementById('gatePassword').value : DOM.authPassword.value;
    const btnSubmit = type === 'gate' ? document.getElementById('btnGateSubmit') : DOM.btnAuthSubmit;
    
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = appState.isRegisterMode ? 'Đang đăng ký...' : 'Đang đăng nhập...';
    }

    try {
        if (appState.isRegisterMode) {
            const { error } = await supabaseClient.auth.signUp({ 
                email, 
                password,
                options: { emailRedirectTo: window.location.origin }
            });
            if (error) throw error;
            showToast('Đăng ký thành công! Vui lòng kiểm tra email xác nhận.', 'success');
        } else {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            showToast('Đăng nhập thành công', 'success');
            if (type === 'modal') closeModal('authModal');
        }
    } catch (error) {
        showToast(error.message || 'Lỗi không xác định', 'error');
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = appState.isRegisterMode ? 'Đăng ký' : 'Đăng nhập';
        }
    }
};

window.signInWithGoogle = async function() {
    if (!supabaseClient) return;
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) throw error;
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.handleSignOut = async function() {
    if (!supabaseClient) return;
    try {
        await supabaseClient.auth.signOut();
        // Clear local tokens on sign out since cloud is source of truth
        appState.tokens = [];
        renderTokens(true);
        showToast('Đã đăng xuất', 'info');
        closeModal('authModal');
    } catch (error) {
        showToast('Lỗi khi đăng xuất', 'error');
    }
};

function updateSyncStatus(status) {
    if (!DOM.syncStatusDot) return;
    
    const dot = DOM.syncStatusDot;
    
    if (status === 'syncing') {
        dot.style.background = '#f59e0b'; // vàng (warning)
        dot.style.animation = 'pulse 1s infinite';
    } else if (status === 'success') {
        dot.style.background = '#10b981'; // xanh (success)
        dot.style.animation = 'none';
    } else if (status === 'error') {
        dot.style.background = '#ef4444'; // đỏ (danger)
        dot.style.animation = 'none';
    } else if (status === 'offline' || status === 'idle') {
        dot.style.background = '#9ca3af'; // xám (tertiary)
        dot.style.animation = 'none';
    } else if (status === 'online') {
        dot.style.background = '#10b981'; // xanh
        dot.style.animation = 'none';
    }
}

// === CLOUD IS SOURCE OF TRUTH ===

// Load token list from Supabase and replace local state
async function loadFromCloud() {
    if (!supabaseClient || !appState.currentUser) return;

    updateSyncStatus('syncing');
    try {
        const { data, error } = await supabaseClient
            .from('tokens_sync')
            .select('data')
            .eq('user_id', appState.currentUser.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No data in cloud yet. If we have local tokens, upload them.
                console.log('[Sync] No cloud data. Uploading local tokens if any.');
                if (appState.tokens.length > 0) {
                    await saveToCloud(appState.tokens);
                } else {
                    updateSyncStatus('success');
                }
            } else {
                console.error('[Sync] Pull error:', error);
                updateSyncStatus('error');
                showToast('Lỗi đọc dữ liệu từ đám mây: ' + error.message, 'error');
            }
            return;
        }

        if (data && data.data) {
            const decryptedTokens = await decryptTokens(data.data);
            if (decryptedTokens) {
                appState.tokens = decryptedTokens;
                renderTokens(true);
                updateSyncStatus('success');
                console.log('[Sync] Loaded', decryptedTokens.length, 'tokens from cloud');
            }
        } else {
            updateSyncStatus('success');
        }
    } catch (err) {
        console.error('[Sync] loadFromCloud error:', err);
        updateSyncStatus('error');
    }
}

// Save a token list directly to Supabase (cloud is source of truth)
async function saveToCloud(tokens) {
    if (!supabaseClient || !appState.currentUser) return;

    updateSyncStatus('syncing');
    try {
        const encryptedData = await encryptTokens(tokens);
        const { error } = await supabaseClient
            .from('tokens_sync')
            .upsert({
                user_id: appState.currentUser.id,
                data: encryptedData,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) {
            console.error('[Sync] Save error:', error);
            updateSyncStatus('error');
            showToast('Lỗi lưu lên đám mây: ' + error.message, 'error');
        } else {
            updateSyncStatus('success');
            console.log('[Sync] Saved', tokens.length, 'tokens to cloud');
        }
    } catch (err) {
        console.error('[Sync] saveToCloud error:', err);
        updateSyncStatus('error');
    }
}

// Called by storage.js after any change
window.pushToCloud = async function() {
    await saveToCloud(appState.tokens);
};

async function encryptTokens(tokens) {
    const json = JSON.stringify(tokens);
    const key = await deriveKey(appState.currentUser.id);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(json)
    );
    
    return {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted))
    };
}

async function decryptTokens(encryptedObj) {
    try {
        const key = await deriveKey(appState.currentUser.id);
        const iv = new Uint8Array(encryptedObj.iv);
        const data = new Uint8Array(encryptedObj.data);
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );
        
        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
        console.error('[Sync] Decrypt error:', e);
        return null;
    }
}

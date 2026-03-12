// Supabase Realtime Sync Module
let supabase = null;
let syncChannel = null;

window.initSync = async function() {
    const { url, key, enabled, id } = appState.settings.sync;
    
    if (!enabled || !url || !key || !id) {
        if (syncChannel) {
            syncChannel.unsubscribe();
            syncChannel = null;
        }
        return;
    }

    try {
        supabase = supabase.createClient(url, key);
        
        // Subscribe to changes for this syncId
        syncChannel = supabase
            .channel('tokens-sync')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tokens',
                    filter: `sync_id=eq.${id}`
                },
                (payload) => {
                    handleRemoteChange(payload);
                }
            )
            .subscribe();
            
        console.log('Sync initialized for ID:', id);
        showToast('Đồng bộ đám mây đã kết nối', 'success');
        
        // Initial pull
        await pullFromCloud();
    } catch (error) {
        console.error('Supabase init error:', error);
        showToast('Lỗi kết nối đồng bộ', 'error');
    }
};

window.pushToCloud = async function() {
    if (!supabase || !appState.settings.sync.enabled) return;

    const { id } = appState.settings.sync;
    
    // We store all tokens as a single JSON blob or individual rows
    // For simplicity and to avoid complex merging, let's try a tokens table
    // table: tokens (id: pk, sync_id: index, data: encrypted_json)
    
    // For this implementation, we'll sync the entire tokens array as one record
    // per sync_id to keep it simple and ensure order is preserved.
    
    const encryptedData = await encryptTokens(appState.tokens);
    
    const { error } = await supabase
        .from('tokens_sync')
        .upsert({ 
            sync_id: id, 
            data: encryptedData,
            updated_at: new Date().toISOString()
        }, { onConflict: 'sync_id' });

    if (error) {
        console.error('Push error:', error);
    }
};

async function pullFromCloud() {
    const { id } = appState.settings.sync;
    
    const { data, error } = await supabase
        .from('tokens_sync')
        .select('data')
        .eq('sync_id', id)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows"
        console.error('Pull error:', error);
        return;
    }

    if (data && data.data) {
        const decryptedTokens = await decryptTokens(data.data);
        if (decryptedTokens) {
            // Compare with local and update if different
            // Simple approach: Cloud wins if local is older or different
            if (JSON.stringify(decryptedTokens) !== JSON.stringify(appState.tokens)) {
                appState.tokens = decryptedTokens;
                saveTokens();
                renderTokens(true);
                showToast('Đã đồng bộ dữ liệu mới', 'success');
            }
        }
    }
}

function handleRemoteChange(payload) {
    console.log('Remote change detected:', payload);
    // If the record for our sync_id changed, pull the new data
    pullFromCloud();
}

// Helper to encrypt/decrypt cloud data using Sync ID as part of the key
async function encryptTokens(tokens) {
    const json = JSON.stringify(tokens);
    const syncId = appState.settings.sync.id;
    
    // We use the syncId as a password for deriving a key
    const key = await deriveKey(syncId);
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
        const syncId = appState.settings.sync.id;
        const key = await deriveKey(syncId);
        const iv = new Uint8Array(encryptedObj.iv);
        const data = new Uint8Array(encryptedObj.data);
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );
        
        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
        console.error('Sync Decrypt Error:', e);
        return null;
    }
}

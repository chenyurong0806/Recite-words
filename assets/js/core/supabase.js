/**
 * Supabase 客户端与默认离线词库
 * Module: assets/js/core/supabase.js
 */

/* ==========================================================================
   1. SUPABASE CLIENT & CORE VOCABULARY DATABASE
   ========================================================================== */
const SUPABASE_URL = 'https://mamubvgmcetepllznifl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HEeNPSqD75cWlnmZjcVHKA_Pw-OdL_A';

const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        },
        heartbeatIntervalMs: 15000,
        reconnectAfterMs: (tries) => Math.min(1000 * Math.pow(2, tries), 10000),
        timeout: 20000
    }
});

/* ==========================================================================
   1.1 弱网连接质量监控与状态徽标 (红/黄/绿指示灯)
   ========================================================================== */
let currentConnectionQuality = 'disconnected'; // 'connected' | 'degraded' | 'disconnected'

function updateGlobalNetworkBadge(status) {
    const badge = document.getElementById('hub-online-offline-badge');
    const badgeText = document.getElementById('hub-online-offline-text');
    const btnOnline = document.getElementById('btn-enter-online');
    const myPresenceStatus = (typeof currentPresenceStatus !== 'undefined') ? currentPresenceStatus : (window.currentPresenceStatus || localStorage.getItem('vocab_presence_status') || 'online');

    if (!badge || !badgeText) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        currentConnectionQuality = 'disconnected';
        badge.className = 'network-status-badge offline';
        badgeText.innerText = '离线';
        if (btnOnline) {
            btnOnline.disabled = true;
            btnOnline.style.opacity = '0.45';
        }
        return;
    }

    if (myPresenceStatus === 'invisible') {
        badge.className = 'network-status-badge invisible';
        badgeText.innerText = '隐身';
        if (btnOnline) {
            btnOnline.disabled = false;
            btnOnline.style.opacity = '1';
        }
        return;
    }

    switch (status) {
        case 'SUBSCRIBED':
        case 'connected':
        case 'open':
            currentConnectionQuality = 'connected';
            badge.className = 'network-status-badge online';
            badgeText.innerText = '在线';
            if (btnOnline) {
                btnOnline.disabled = false;
                btnOnline.style.opacity = '1';
            }
            break;

        case 'CONNECTING':
        case 'connecting':
        case 'reconnecting':
        case 'TIMED_OUT':
        case 'degraded':
            currentConnectionQuality = 'degraded';
            badge.className = 'network-status-badge connecting';
            badgeText.innerText = '连接中...';
            if (btnOnline) {
                btnOnline.disabled = false;
                btnOnline.style.opacity = '0.85';
            }
            break;

        case 'CLOSED':
        case 'CHANNEL_ERROR':
        case 'disconnected':
        case 'closed':
        default:
            currentConnectionQuality = 'disconnected';
            badge.className = 'network-status-badge offline';
            badgeText.innerText = status === 'CHANNEL_ERROR' ? '异常' : '未连接';
            if (btnOnline) {
                btnOnline.disabled = false;
                btnOnline.style.opacity = '0.7';
            }
            break;
    }
}
window.updateGlobalNetworkBadge = updateGlobalNetworkBadge;

// 监听 Supabase Realtime 底层 WebSocket 连接状态
if (sbClient && sbClient.realtime) {
    try {
        if (typeof sbClient.realtime.onOpen === 'function') {
            sbClient.realtime.onOpen(() => {
                console.log('[Supabase Realtime] WebSocket 连接开启');
                updateGlobalNetworkBadge('connecting');
            });
        }
        if (typeof sbClient.realtime.onClose === 'function') {
            sbClient.realtime.onClose((e) => {
                console.warn('[Supabase Realtime] WebSocket 连接关闭', e);
                updateGlobalNetworkBadge('CLOSED');
            });
        }
        if (typeof sbClient.realtime.onError === 'function') {
            sbClient.realtime.onError((err) => {
                console.warn('[Supabase Realtime] WebSocket 连接错误', err);
                updateGlobalNetworkBadge('CHANNEL_ERROR');
            });
        }
    } catch (e) {
        console.warn('[Supabase Realtime] 初始化底层连接事件监听失败:', e);
    }
}

/* ==========================================================================
   1.2 关键信令 ACK 确认重传机制 (解决跨境外网邀请丢失问题)
   ========================================================================== */
if (!window.pendingReliableAcks) window.pendingReliableAcks = new Map();
window.handleSignalAck = function (payload) {
    if (!payload || !payload.msgId) return;
    const handler = window.pendingReliableAcks.get(payload.msgId);
    if (typeof handler === 'function') {
        handler(payload);
    }
};

function sendReliableBroadcast(channel, event, payload = {}, timeout = 3000, maxRetries = 3) {
    if (!channel) {
        return Promise.reject(new Error('Channel is not initialized'));
    }

    return new Promise((resolve, reject) => {
        // 生成全局唯一消息 ID
        const msgId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : ('msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9));
        const timestamp = Date.now();
        const ackEvent = `ack_${msgId}`;
        const packet = {
            ...payload,
            msgId,
            timestamp
        };

        let attempts = 0;
        let ackReceived = false;
        let retryTimer = null;

        const cleanup = () => {
            if (retryTimer) {
                clearTimeout(retryTimer);
                retryTimer = null;
            }
            if (window.pendingReliableAcks) {
                window.pendingReliableAcks.delete(msgId);
            }
            if (channel._reliableAckMap && channel._reliableAckMap[ackEvent]) {
                delete channel._reliableAckMap[ackEvent];
            }
        };

        const onAck = (ackPayload) => {
            if (ackReceived) return;
            ackReceived = true;
            cleanup();
            console.log(`[sendReliableBroadcast] 收到 ACK 确认 (${event}, msgId: ${msgId})`);
            resolve(ackPayload);
        };

        window.pendingReliableAcks.set(msgId, onAck);

        if (!channel._reliableAckMap) {
            channel._reliableAckMap = {};
            try {
                channel.on('broadcast', { event: '*' }, ({ event: ev, payload: p }) => {
                    if (ev && ev.startsWith('ack_') && channel._reliableAckMap[ev]) {
                        channel._reliableAckMap[ev](p);
                    } else if (ev === 'signal_ack' && p && p.msgId) {
                        window.handleSignalAck(p);
                    }
                });
            } catch (e) {}
        }
        channel._reliableAckMap[ackEvent] = onAck;

        try {
            channel.on('broadcast', { event: ackEvent }, ({ payload: p }) => {
                onAck(p);
            });
        } catch (e) {}

        const executeSend = () => {
            if (ackReceived) return;
            attempts++;

            try {
                if (typeof channel.send === 'function') {
                    channel.send({
                        type: 'broadcast',
                        event: event,
                        payload: packet
                    }).catch(err => {
                        console.warn(`[sendReliableBroadcast] 发送失败 (${event}, 第${attempts}次):`, err);
                    });
                }
            } catch (e) {
                console.warn(`[sendReliableBroadcast] 发送异常 (${event}):`, e);
            }

            retryTimer = setTimeout(() => {
                if (ackReceived) return;
                if (attempts <= maxRetries) {
                    console.warn(`[sendReliableBroadcast] 未收到 ACK (${event}, msgId: ${msgId}), 正在触发重传 (${attempts}/${maxRetries})...`);
                    executeSend();
                } else {
                    cleanup();
                    const errMsg = '对方网络不佳，邀请超时';
                    console.error(`[sendReliableBroadcast] 重传超过最大次数 (${event}): ${errMsg}`);
                    if (typeof showToast === 'function') {
                        showToast(errMsg);
                    }
                    reject(new Error(errMsg));
                }
            }, timeout);
        };

        executeSend();
    });
}
window.sendReliableBroadcast = sendReliableBroadcast;

const DEFAULT_WORDS = [
    { word: "abandon", phone: "/əˈbændən/", meanings: [{ pos: "v.", meaning: "放弃，抛弃" }] },
    { word: "abundant", phone: "/əˈbʌndənt/", meanings: [{ pos: "adj.", meaning: "丰富的，充裕的" }] },
    { word: "ability", phone: "/əˈbɪləti/", meanings: [{ pos: "n.", meaning: "能力，本领" }] },
    { word: "abnormal", phone: "/æbˈnɔːrml/", meanings: [{ pos: "adj.", meaning: "反常的，异常的" }] },
    { word: "absolute", phone: "/ˈæbsəluːt/", meanings: [{ pos: "adj.", meaning: "绝对的，完全的" }] },
    { word: "academic", phone: "/ˌækəˈdemɪk/", meanings: [{ pos: "adj.", meaning: "学术的；院校的" }] },
    { word: "accelerate", phone: "/əkˈseləreɪt/", meanings: [{ pos: "v.", meaning: "加速，促进" }] },
    { word: "accumulate", phone: "/əˈkjuːmjəleɪt/", meanings: [{ pos: "v.", meaning: "积累，积聚" }] },
    { word: "accomplish", phone: "/əˈkɑːmplɪʃ/", meanings: [{ pos: "v.", meaning: "达到，完成" }] },
    { word: "accurate", phone: "/ˈækjərət/", meanings: [{ pos: "adj.", meaning: "准确的，精确的" }] },
    { word: "acquire", phone: "/əˈkwaɪər/", meanings: [{ pos: "v.", meaning: "取得，获得" }] },
    { word: "require", phone: "/rɪˈkwaɪər/", meanings: [{ pos: "v.", meaning: "要求，需要" }] },
    { word: "inquire", phone: "/ɪnˈkwaɪər/", meanings: [{ pos: "v.", meaning: "询问，调查" }] },
    { word: "adapt", phone: "/əˈdæpt/", meanings: [{ pos: "v.", meaning: "使适应；改编" }] },
    { word: "adopt", phone: "/əˈdɑːpt/", meanings: [{ pos: "v.", meaning: "收养；采纳" }] },
    { word: "adept", phone: "/əˈdept/", meanings: [{ pos: "adj.", meaning: "熟练的，内行的" }] },
    { word: "adequate", phone: "/ˈædɪkwət/", meanings: [{ pos: "adj.", meaning: "充足的，适当的" }] },
    { word: "advocate", phone: "/ˈædvəkeɪt/", meanings: [{ pos: "v.", meaning: "提倡，主张" }] },
    { word: "aesthetic", phone: "/esˈθetɪk/", meanings: [{ pos: "adj.", meaning: "美学的，审美的" }] },
    { word: "affection", phone: "/əˈfekʃn/", meanings: [{ pos: "n.", meaning: "喜爱，钟爱" }] }, {
        word: "affect", phone: "/əˈfekt/", meanings: [{ pos: "v.", meaning: "影响；感动" }]
    }, {
        word: "effect", phone: "/ɪˈfekt/", meanings: [{
            pos: "n.", meaning: "效果，影响"
        }]
    }, {
        word: "aggressive", phone: "/əˈɡresɪv/", meanings: [{
            pos: "adj.",
            meaning: "侵略的；有进取心的"
        }]
    }, {
        word: "alleviate", phone: "/əˈliːvieɪt/", meanings:
            [{ pos: "v.", meaning: "减轻，缓和" }]
    }, {
        word: "elevate", phone: "/ˈelɪveɪt/",
        meanings: [{ pos: "v.", meaning: "提升；举起" }]
    }, {
        word: "ambiguous", phone:
            "/æmˈbɪɡjuəs/", meanings: [{ pos: "adj.", meaning: "模棱两可的" }]
    }, {
        word:
            "ambitious", phone: "/æmˈbɪʃəs/", meanings: [{
                pos: "adj.", meaning:
                    "有抱负的，雄心勃勃的"
            }]
    }, {
        word: "anticipate", phone: "/ænˈtɪsɪpeɪt/", meanings: [{
            pos: "v.", meaning: "预料，预期"
        }]
    }, {
        word: "apparent", phone: "/əˈpærənt/",
        meanings: [{ pos: "adj.", meaning: "明显的，显而易见的" }]
    }, {
        word: "appreciate",
        phone: "/əˈpriːʃieɪt/", meanings: [{ pos: "v.", meaning: "欣赏；感激" }]
    }, {
        word:
            "arbitrary", phone: "/ˈɑːrbətreri/", meanings: [{
                pos: "adj.", meaning:
                    "随意的，武断的"
            }]
    }, {
        word: "brilliant", phone: "/ˈbrɪliənt/", meanings: [{
            pos:
                "adj.", meaning: "光辉的；卓越的"
        }]
    }, {
        word: "campaign", phone: "/kæmˈpeɪn/",
        meanings: [{ pos: "n.", meaning: "战役；竞选运动" }]
    }, {
        word: "champion", phone:
            "/ˈtʃæmpiən/", meanings: [{ pos: "n.", meaning: "冠军；拥护者" }]
    }, {
        word:
            "candidate", phone: "/ˈkændɪdət/", meanings: [{ pos: "n.", meaning: "候选人，求职者" }]
    }, {
        word: "capacity", phone: "/kəˈpæsəti/", meanings: [{
            pos: "n.", meaning:
                "容量；才能"
        }]
    }, {
        word: "capture", phone: "/ˈkæptʃər/", meanings: [{
            pos: "v.",
            meaning: "捕获；夺取"
        }]
    }, {
        word: "casual", phone: "/ˈkæʒuəl/", meanings: [{
            pos:
                "adj.", meaning: "偶然的；随便的"
        }]
    }, {
        word: "causal", phone: "/ˈkɔːzl/", meanings:
            [{ pos: "adj.", meaning: "因果关系的" }]
    }, {
        word: "challenge", phone:
            "/ˈtʃælɪndʒ/", meanings: [{ pos: "n./v.", meaning: "挑战；质疑" }]
    }, {
        word:
            "characteristic", phone: "/ˌkærəktəˈrɪstɪk/", meanings: [{
                pos: "adj./n.",
                meaning: "特有的；特征"
            }]
    }, {
        word: "collaborate", phone: "/kəˈlæbəreɪt/", meanings:
            [{ pos: "v.", meaning: "合作，协作" }]
    }, {
        word: "elaborate", phone: "/ɪˈlæbərət/",
        meanings: [{ pos: "adj./v.", meaning: "详尽的；精心制作" }]
    }, {
        word: "compromise",
        phone: "/ˈkɑːmprəmaɪz/", meanings: [{ pos: "n./v.", meaning: "妥协，和解" }]
    }, {
        word: "promise", phone: "/ˈprɑːmɪs/", meanings: [{
            pos: "n./v.", meaning:
                "允许，诺言"
        }]
    }, {
        word: "crucial", phone: "/ˈkruːʃl/", meanings: [{
            pos: "adj.",
            meaning: "决定性的，至关重要的"
        }]
    }, {
        word: "deficiency", phone: "/dɪˈfɪʃnsi/",
        meanings: [{ pos: "n.", meaning: "缺乏，不足" }]
    }, {
        word: "efficiency", phone:
            "/ɪˈfɪʃnsi/", meanings: [{ pos: "n.", meaning: "效率，功效" }]
    }, {
        word:
            "demonstrate", phone: "/ˈdemənstreɪt/", meanings: [{
                pos: "v.", meaning: "说明，演示"
            }]
    }, {
        word: "eliminate", phone: "/ɪˈlɪmɪneɪt/", meanings: [{
            pos: "v.",
            meaning: "消灭，消除"
        }]
    }, {
        word: "fascinate", phone: "/ˈfæsɪneɪt/", meanings: [{
            pos: "v.", meaning: "迷住，吸引"
        }]
    }, {
        word: "guarantee", phone: "/ˌɡærənˈtiː/",
        meanings: [{ pos: "n./v.", meaning: "保证，担保" }]
    }, {
        word: "mechanism", phone:
            "/ˈmekənɪzəm/", meanings: [{ pos: "n.", meaning: "机械装置；机制，机理" }]
    }, {
        word:
            "organic", phone: "/ɔːrˈɡænɪk/", meanings: [{ pos: "adj.", meaning: "有机的；器官的" }]
    }, {
        word: "organism", phone: "/ˈɔːrɡənɪzəm/", meanings: [{
            pos: "n.", meaning:
                "生物体，有机体"
        }]
    }];

/* ==========================================================================
   云端账号管理 (Supabase Cloud Account & Bilibili Toy Cloud Storage)
   ========================================================================== */
async function hashPassword(str) {
    if (!str) return '';
    try {
        if (window.crypto && window.crypto.subtle) {
            const enc = new TextEncoder();
            const data = enc.encode(str + '_vocab_pk_salt_2026');
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
    } catch (e) { }
    return 'h_' + btoa(encodeURIComponent(str));
}

async function supabaseRegisterUser(arg1, arg2, arg3 = '') {
    let username = '';
    let password = '';
    let avatarUrl = '';

    if (arg1 && typeof arg1 === 'object') {
        username = (arg1.username || '').trim();
        password = (arg1.password || '').trim();
        avatarUrl = arg1.avatar || arg1.avatar_url || arg1.avatarUrl || '';
    } else {
        username = (arg1 || '').trim();
        password = (arg2 || '').trim();
        avatarUrl = arg3 || '';
    }

    if (!username || !password) throw new Error('用户名和密码不能为空');

    const cleanName = username.trim();
    const deviceId = (typeof getDeviceId === 'function') ? getDeviceId() : 'dev_unknown';

    // 1. 检查本地是否被封禁
    if (typeof isDeviceBannedLocally === 'function' && isDeviceBannedLocally()) {
        throw new Error('当前设备已被管理员封禁，禁止注册新账号');
    }

    // 2. 检查云端：当前设备是否存在被封禁的账号
    try {
        const { data: bannedDevAccounts } = await sbClient
            .from('user_accounts')
            .select('username, is_banned')
            .eq('device_id', deviceId)
            .eq('is_banned', true)
            .limit(1);

        if (bannedDevAccounts && bannedDevAccounts.length > 0) {
            if (typeof markDeviceBanned === 'function') {
                markDeviceBanned(bannedDevAccounts[0].username, deviceId);
            }
            throw new Error(`当前设备绑定的账号（${bannedDevAccounts[0].username}）已被管理员封禁，禁止注册新账号`);
        }
    } catch (e) {
        if (e.message && e.message.includes('封禁')) throw e;
    }

    // 3. 检查设备注册限制：一个设备最多注册一个 Supabase 账号
    try {
        const { data: existingDevAccounts, error: devQueryErr } = await sbClient
            .from('user_accounts')
            .select('username')
            .eq('device_id', deviceId)
            .limit(1);

        if (!devQueryErr && existingDevAccounts && existingDevAccounts.length > 0) {
            const regName = existingDevAccounts[0].username;
            try {
                localStorage.setItem('vocab_registered_account', regName);
                localStorage.setItem('vocab_device_has_registered', 'true');
            } catch (e) { }
            throw new Error(`当前设备已绑定注册过账号“${regName}”，一台设备仅限注册一个账号`);
        }
    } catch (e) {
        if (e.message && e.message.includes('一台设备')) throw e;
    }

    // 检查用户名是否已存在
    const { data: existing, error: checkErr } = await sbClient
        .from('user_accounts')
        .select('username')
        .eq('username', cleanName)
        .maybeSingle();

    if (checkErr && checkErr.code !== 'PGRST116') {
        console.warn('Check user error:', checkErr);
    }
    if (existing && existing.username) {
        throw new Error(`用户名“${cleanName}”已被注册，请更换其他用户名`);
    }

    const hashedPassword = await hashPassword(password);
    const { data, error } = await sbClient
        .from('user_accounts')
        .insert([{
            username: cleanName,
            password: hashedPassword,
            avatar_url: avatarUrl || '',
            device_id: deviceId,
            is_banned: false,
            user_data: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) {
        throw new Error(error.message || '注册失败，请稍后重试');
    }

    // 注册成功，记录在本地设备绑定标记中
    try {
        localStorage.setItem('vocab_registered_account', cleanName);
        localStorage.setItem('vocab_device_has_registered', 'true');
    } catch (e) { }

    return data;
}

async function supabaseLoginUser(arg1, arg2) {
    let username = '';
    let password = '';

    if (arg1 && typeof arg1 === 'object') {
        username = (arg1.username || '').trim();
        password = (arg1.password || '').trim();
    } else {
        username = (arg1 || '').trim();
        password = (arg2 || '').trim();
    }

    if (!username || !password) throw new Error('请输入用户名和密码');

    const cleanName = username.trim();
    const hashedPassword = await hashPassword(password);

    const { data, error } = await sbClient
        .from('user_accounts')
        .select('*')
        .eq('username', cleanName)
        .eq('password', hashedPassword)
        .maybeSingle();

    if (error) {
        throw new Error(error.message || '登录异常，请稍后重试');
    }
    if (!data) {
        throw new Error('用户名或密码错误，请重试');
    }

    // 检查账号是否被封禁
    if (data.is_banned) {
        if (typeof markDeviceBanned === 'function') {
            markDeviceBanned(cleanName, data.device_id);
        }
        throw new Error(`账号“${cleanName}”已被管理员封禁，禁止登录！`);
    }

    // 自动补全设备绑定 (老账号初次登录时无 device_id)
    const currentDevId = (typeof getDeviceId === 'function') ? getDeviceId() : null;
    if (currentDevId && !data.device_id) {
        sbClient.from('user_accounts').update({ device_id: currentDevId }).eq('username', cleanName).then(() => { }).catch(() => { });
        data.device_id = currentDevId;
    }

    return data;
}

async function supabaseLoginWithHash(username, hashedPassword) {
    if (!username || !hashedPassword) throw new Error('缺少快速登录凭证');
    const cleanName = username.trim();
    const { data, error } = await sbClient
        .from('user_accounts')
        .select('*')
        .eq('username', cleanName)
        .eq('password', hashedPassword)
        .maybeSingle();

    if (error || !data) {
        throw new Error('登录凭证已失效，请重新输入密码');
    }

    // 检查账号是否被封禁
    if (data.is_banned) {
        if (typeof markDeviceBanned === 'function') {
            markDeviceBanned(cleanName, data.device_id);
        }
        throw new Error(`账号“${cleanName}”已被管理员封禁，禁止登录！`);
    }

    // 自动补全设备绑定
    const currentDevId = (typeof getDeviceId === 'function') ? getDeviceId() : null;
    if (currentDevId && !data.device_id) {
        sbClient.from('user_accounts').update({ device_id: currentDevId }).eq('username', cleanName).then(() => { }).catch(() => { });
        data.device_id = currentDevId;
    }

    return data;
}

async function supabaseVerifyAccountStatus(username) {
    if (!username || username.startsWith('游客')) {
        return { exists: false, isBanned: false, isGuest: true };
    }
    const cleanName = username.trim();
    try {
        const { data, error } = await sbClient
            .from('user_accounts')
            .select('username, is_banned, device_id')
            .eq('username', cleanName)
            .maybeSingle();

        if (error) {
            console.warn('[Supabase] verifyAccountStatus error:', error);
            // 网络异常或服务离线，返回 networkError 标记，避免在网络差时误踢下线或误删本地数据
            return { exists: true, isBanned: false, networkError: true, error };
        }

        if (!data) {
            // 明确表示该账号在云端已被删除或不存在
            return { exists: false, isBanned: false, user: null };
        }

        const isBanned = Boolean(data.is_banned);
        return { exists: true, isBanned, deviceId: data.device_id, user: data };
    } catch (e) {
        console.warn('[Supabase] verifyAccountStatus exception:', e);
        return { exists: true, isBanned: false, networkError: true, error: e };
    }
}
window.supabaseVerifyAccountStatus = supabaseVerifyAccountStatus;

async function supabaseUpdateUsername(oldUsername, newUsername) {
    if (!oldUsername || !newUsername) throw new Error('用户名不能为空');
    const cleanNew = newUsername.trim();
    if (oldUsername === cleanNew) return;

    // 检查新用户名是否已被占用
    const { data: existing } = await sbClient
        .from('user_accounts')
        .select('username')
        .eq('username', cleanNew)
        .maybeSingle();

    if (existing && existing.username) {
        throw new Error(`用户名“${cleanNew}”已被占用`);
    }

    const { error } = await sbClient
        .from('user_accounts')
        .update({ username: cleanNew, updated_at: new Date().toISOString() })
        .eq('username', oldUsername);

    if (error) throw new Error(error.message || '修改用户名失败');

    // 级联同步更新 daily_wordle_records 历史记录中的 username
    try {
        await sbClient
            .from('daily_wordle_records')
            .update({ username: cleanNew })
            .eq('username', oldUsername);
    } catch (e) {
        console.warn('Failed to cascade update daily_wordle_records:', e);
    }
}

async function supabaseUpdatePassword(username, oldPassword, newPassword) {
    if (!username || !oldPassword || !newPassword) throw new Error('请完整填写新旧密码');
    const hashedOld = await hashPassword(oldPassword);
    const hashedNew = await hashPassword(newPassword);

    const { data: user, error: verifyErr } = await sbClient
        .from('user_accounts')
        .select('username')
        .eq('username', username)
        .eq('password', hashedOld)
        .maybeSingle();

    if (verifyErr || !user) {
        throw new Error('旧密码错误，无法修改密码');
    }

    const { error } = await sbClient
        .from('user_accounts')
        .update({ password: hashedNew, updated_at: new Date().toISOString() })
        .eq('username', username);

    if (error) throw new Error(error.message || '修改密码失败');
}

async function supabaseDeleteAccount(username, password = null) {
    if (!username) throw new Error('用户名不能为空');
    if (password) {
        const hashedOld = await hashPassword(password);
        const { data: user, error: verifyErr } = await sbClient
            .from('user_accounts')
            .select('username')
            .eq('username', username)
            .eq('password', hashedOld)
            .maybeSingle();
        if (verifyErr || !user) {
            throw new Error('密码错误，无法注销账号');
        }
    }
    const { error } = await sbClient
        .from('user_accounts')
        .delete()
        .eq('username', username);
    if (error) throw new Error(error.message || '删除账号失败');
}
window.supabaseDeleteAccount = supabaseDeleteAccount;

async function supabaseUpdateAvatar(username, avatarUrl) {
    if (!username) return;
    const { error } = await sbClient
        .from('user_accounts')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('username', username);
    if (error) console.warn('[Supabase] Failed to update avatar:', error);
}

async function supabaseSyncUserData(username, userData) {
    if (!username) return;
    return syncAllUserDataToCloud(username);
}

function getCloudBooksMasterySummary() {
    const summary = {};
    try {
        const books = (typeof BookManager !== 'undefined' && BookManager.availableBooks) ? BookManager.availableBooks : [];
        books.forEach(b => {
            if (b && !String(b.id).startsWith('custom_') && b.id !== 'builtin_default') {
                if (typeof EbbinghausEngine !== 'undefined') {
                    const prog = EbbinghausEngine.getBookProgress(b.id, b.words);
                    summary[b.id] = {
                        name: b.name || b.id,
                        mastered: prog.mastered || 0,
                        learned: prog.learned || 0,
                        total: prog.total || b.count || 0,
                        percent: prog.progressPercent || 0
                    };
                }
            }
        });
    } catch (e) { }
    return summary;
}

// 全量同步用户学习数据、等级与统计至 Supabase 云端
async function syncAllUserDataToCloud(targetUsername = null, options = {}) {
    const u = targetUsername || (typeof currentUser !== 'undefined' ? currentUser : null);
    if (!u) return;
    if (typeof LevelManager !== 'undefined' && LevelManager.isGuestUser(u)) return;
    if (u.startsWith('游客_') || u.startsWith('游客')) return;

    // 检查是否为已登录用户 (支持云端账号与 B 站账号)
    const isRegisteredUser = (typeof currentUserProfile !== 'undefined' && currentUserProfile && currentUserProfile.isLoggedIn && currentUserProfile.username === u && (currentUserProfile.type === 'cloud' || currentUserProfile.type === 'bilibili'))
        || (!u.startsWith('游客'));
    if (!isRegisteredUser) return;

    let stats = null;
    try {
        if (typeof userStats !== 'undefined' && currentUser === u) {
            stats = userStats;
        } else {
            const raw = SafeStorage.getItem(`vocab_stats_${u}`);
            if (raw) stats = JSON.parse(raw);
        }
    } catch (e) { }

    let ebbinghaus = null;
    try {
        const raw = SafeStorage.getItem(`vocab_ebbinghaus_db_${u}`);
        if (raw) ebbinghaus = JSON.parse(raw);
    } catch (e) { }

    let daily_logs = null;
    try {
        const raw = SafeStorage.getItem(`vocab_daily_logs_${u}`);
        if (raw) daily_logs = JSON.parse(raw);
    } catch (e) { }

    let mastered_words = null;
    try {
        const raw = SafeStorage.getItem(`vocab_mastered_words_${u}`);
        if (raw) mastered_words = JSON.parse(raw);
    } catch (e) { }

    let wordle_history = null;
    try {
        const raw = SafeStorage.getItem(`vocab_wordle_history_${u}`);
        if (raw) wordle_history = JSON.parse(raw);
    } catch (e) { }

    let shici_progress = null;
    try {
        const raw = SafeStorage.getItem(`vocab_shici_progress_${u}`);
        if (raw) shici_progress = JSON.parse(raw);
    } catch (e) { }

    let levelData = null;
    let rankData = null;
    if (typeof LevelManager !== 'undefined') {
        levelData = LevelManager.getLevelData(u);
        rankData = LevelManager.getUserRankData(u);
    }

    const isBiliAccount = Boolean(currentUserProfile && currentUserProfile.username === u && currentUserProfile.type === 'bilibili');
    const cloudMastery = getCloudBooksMasterySummary();
    const mistakesCount = Object.keys((stats && stats.mistakes) || {}).length;
    const accuracyPercent = (stats && stats.total > 0) ? Math.round(((stats.correct || 0) / stats.total) * 100) : 0;

    const payload = {
        stats: stats || {},
        total_answered: (stats && stats.total) || 0,
        correct_count: (stats && stats.correct) || 0,
        accuracy_percent: accuracyPercent,
        mistakes_count: mistakesCount,
        cloud_books_mastery: cloudMastery,
        rank_data: rankData ? {
            rank: rankData.rank,
            rating: rankData.rating,
            isPromotionReady: rankData.isPromotionReady,
            battles: rankData.battles
        } : { rank: 1, rating: 0, isPromotionReady: false, battles: {} },
        account_type: isBiliAccount ? 'bilibili' : 'cloud',
        isBili: isBiliAccount,
        ebbinghaus: ebbinghaus || {},
        daily_logs: daily_logs || {},
        mastered_words: mastered_words || [],
        wordle_history: wordle_history || {},
        shici_progress: shici_progress || {},
        level: levelData ? levelData.level : 1,
        score: levelData ? levelData.score : 0,
        level: rankData ? rankData.rank : 1,
        score: rankData ? rankData.rating : 0,
        updated_at: new Date().toISOString()
    };

    const updateObj = {
        user_data: payload,
        level: payload.level,
        updated_at: payload.updated_at
    };

    if (options.keepalive && typeof fetch === 'function') {
        try {
            fetch(`${SUPABASE_URL}/rest/v1/user_accounts?username=eq.${encodeURIComponent(u)}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(updateObj),
                keepalive: true
            }).catch(() => { });
            return { success: true };
        } catch (e) { }
    }

    if (typeof sbClient !== 'undefined' && sbClient) {
        try {
            let updateError = null;
            const shouldToast = (options && options.silent === false) || (options && options.showToastOnFail);

            // 更新已存在用户的全量数据 (使用 update 避免触发 password NOT NULL 检查)
            const { error } = await sbClient
                .from('user_accounts')
                .update(updateObj)
                .eq('username', u);

            if (error) {
                if (error.message && error.message.includes('level')) {
                    const { error: err2 } = await sbClient
                        .from('user_accounts')
                        .update({
                            user_data: payload,
                            updated_at: payload.updated_at
                        })
                        .eq('username', u);
                    if (err2) updateError = err2;
                } else {
                    updateError = error;
                }
            }

            if (updateError) {
                console.warn('[Supabase] syncAllUserDataToCloud error:', updateError);
                if (shouldToast && typeof showToast === 'function') {
                    showToast('数据同步失败，请检查网络');
                }
                return { success: false, error: updateError };
            }

            // 同步今日 Wordle 记录到 daily_wordle_records 专用表，确保 username 与当前真实用户名同步
            try {
                const todayStr = (new Date()).toISOString().slice(0, 10);
                if (payload.wordle_history && payload.wordle_history[todayStr]) {
                    const todayRec = payload.wordle_history[todayStr];
                    await sbClient.from('daily_wordle_records').upsert({
                        date: todayStr,
                        username: u,
                        is_won: !!todayRec.isWon,
                        attempts: todayRec.attempts || (todayRec.attemptDetails ? todayRec.attemptDetails.length : 0) || 1,
                        time_spent: todayRec.timeSpent || 0
                    }, { onConflict: 'date,username' });
                }
            } catch (wordleSyncErr) {
                console.warn('[Wordle] daily_wordle_records sync warning:', wordleSyncErr);
            }

            window.lastCloudSyncTimestamp = Date.now();
            if (typeof updateSyncButtonStatus === 'function') {
                updateSyncButtonStatus(true);
            }
            return { success: true };
        } catch (e) {
            console.warn('[Supabase] syncAllUserDataToCloud exception:', e);
            const shouldToast = (options && options.silent === false) || (options && options.showToastOnFail);
            if (shouldToast && typeof showToast === 'function') {
                showToast('数据同步失败，请检查网络');
            }
            return { success: false, error: e };
        }
    }
    return { success: false, error: 'No Supabase client' };
}

// 从 Supabase 云端恢复用户全量学习记录与等级
// 从 Supabase 云端恢复用户全量学习记录、词书掌握度、段位与等级分
function restoreUserDataFromCloud(user) {
    if (!user || !user.username) return;
    const u = user.username;
    const ud = user.user_data;
    if (!ud || typeof ud !== 'object') return;

    if (ud.stats) {
        try {
            SafeStorage.setItem(`vocab_stats_${u}`, JSON.stringify(ud.stats));
            if (typeof currentUser !== 'undefined' && currentUser === u && typeof userStats !== 'undefined') {
                userStats = ud.stats;
            }
        } catch (e) { }
    }
    if (ud.rank_data) {
        try {
            SafeStorage.setItem(`vocab_rank_data_${u}`, JSON.stringify(ud.rank_data));
        } catch (e) { }
    } else if (ud.level || user.level) {
        try {
            const r = Math.max(1, Math.min(9, ud.level || user.level || 1));
            const s = Math.max(0, Math.min(100, ud.score || 0));
            SafeStorage.setItem(`vocab_rank_data_${u}`, JSON.stringify({
                rank: r,
                rating: s,
                isPromotionReady: (r < 9 && s >= 100),
                battles: { total: 0, wins: 0, losses: 0, draws: 0 }
            }));
        } catch (e) { }
    }
    if (ud.ebbinghaus) {
        try {
            const localRaw = SafeStorage.getItem(`vocab_ebbinghaus_db_${u}`) || (typeof localStorage !== 'undefined' ? localStorage.getItem(`vocab_ebbinghaus_db_${u}`) : null);
            const localRecords = localRaw ? JSON.parse(localRaw) : {};
            const merged = { ...ud.ebbinghaus };
            Object.keys(localRecords).forEach(k => {
                const locRec = localRecords[k];
                const cldRec = merged[k];
                if (!cldRec) {
                    merged[k] = locRec;
                } else {
                    const lTime = locRec.lastPracticed || 0;
                    const cTime = cldRec.lastPracticed || 0;
                    if (lTime >= cTime) {
                        merged[k] = locRec;
                    }
                }
            });
            const mergedStr = JSON.stringify(merged);
            SafeStorage.setItem(`vocab_ebbinghaus_db_${u}`, mergedStr);
            if (typeof localStorage !== 'undefined') {
                try { localStorage.setItem(`vocab_ebbinghaus_db_${u}`, mergedStr); } catch (e) { }
            }
        } catch (e) { }
    }
    if (ud.daily_logs) {
        try {
            SafeStorage.setItem(`vocab_daily_logs_${u}`, JSON.stringify(ud.daily_logs));
        } catch (e) { }
    }
    if (ud.mastered_words) {
        try {
            SafeStorage.setItem(`vocab_mastered_words_${u}`, JSON.stringify(ud.mastered_words));
        } catch (e) { }
    }
    if (ud.wordle_history) {
        try {
            SafeStorage.setItem(`vocab_wordle_history_${u}`, JSON.stringify(ud.wordle_history));
        } catch (e) { }
    }
    if (ud.shici_progress) {
        try {
            SafeStorage.setItem(`vocab_shici_progress_${u}`, JSON.stringify(ud.shici_progress));
        } catch (e) { }
    }

    if (window.EbbinghausEngine) {
        try { window.EbbinghausEngine.updateDueBadge(); } catch (e) { }
    }
    if (typeof updateHubLevelUI === 'function') {
        try { updateHubLevelUI(); } catch (e) { }
    }
    if (typeof updateHub === 'function') {
        try { updateHub(); } catch (e) { }
    }
}

// B 站用户登录同步至 Supabase (不使用 Toy 云储存)
async function supabaseSyncBiliUser(biliProfile) {
    if (!biliProfile || !biliProfile.username || !sbClient) return null;
    const u = biliProfile.username;
    try {
        const { data: existing, error: findErr } = await sbClient
            .from('user_accounts')
            .select('*')
            .eq('username', u)
            .maybeSingle();

        if (existing) {
            // 已有记录：恢复云端进度与段位
            const ud = existing.user_data || {};
            ud.account_type = 'bilibili';
            ud.isBili = true;
            if (biliProfile.toyOpenId) ud.open_id = biliProfile.toyOpenId;
            sbClient.from('user_accounts').update({
                avatar_url: biliProfile.avatar || existing.avatar_url || '',
                user_data: ud,
                updated_at: new Date().toISOString()
            }).eq('username', u).then(() => { }).catch(() => { });
            return existing;
        } else {
            // 新建记录
            const newUserData = {
                account_type: 'bilibili',
                isBili: true,
                open_id: biliProfile.toyOpenId || '',
                rank_data: { rank: 1, rating: 0, isPromotionReady: false, battles: { total: 0, wins: 0, losses: 0, draws: 0 } },
                stats: { total: 0, correct: 0, mistakes: {} }
            };
            const { data: created, error: insErr } = await sbClient
                .from('user_accounts')
                .insert([{
                    username: u,
                    password: '',
                    avatar_url: biliProfile.avatar || '',
                    level: 1,
                    user_data: newUserData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single();
            return created || null;
        }
    } catch (e) {
        console.warn('[Supabase] supabaseSyncBiliUser error:', e);
        return null;
    }
}

window.syncAllUserDataToCloud = syncAllUserDataToCloud;
window.restoreUserDataFromCloud = restoreUserDataFromCloud;
window.supabaseSyncBiliUser = supabaseSyncBiliUser;

async function supabaseFetchUserData(username) {
    if (!username) return null;
    try {
        const { data, error } = await sbClient
            .from('user_accounts')
            .select('*')
            .eq('username', username)
            .maybeSingle();
        if (error || !data) return null;
        return data;
    } catch (e) {
        return null;
    }
}

/* ----------------- B 站 Toy JS SDK 云端能力支持 ----------------- */
async function biliLogin() {
    if (typeof window.toy === 'undefined' || typeof window.toy.getUserProfile !== 'function') {
        throw new Error('当前未检测到 B 站 Toy JS SDK 环境');
    }
    const profile = await window.toy.getUserProfile();
    if (!profile || !profile.nickname) {
        throw new Error('获取 B 站用户资料失败或用户已取消授权');
    }
    let avatar = profile.avatar || '';
    if (avatar.startsWith('//')) {
        avatar = 'https:' + avatar;
    }
    return {
        type: 'bilibili',
        username: profile.nickname,
        avatar: avatar,
        toyOpenId: profile.toyOpenId || ''
    };
}

// 依用户需求已停用 Toy 云储存，全量迁移至 Supabase
async function biliSaveCloudData(data) {
    if (typeof syncAllUserDataToCloud === 'function' && typeof currentUser !== 'undefined') {
        syncAllUserDataToCloud(currentUser);
    }
}

async function biliLoadCloudData() {
    return null;
}

/**
 * 图像压缩辅助函数：将用户上传的头像压缩为微型 Base64 字符串
 */
function compressImageFile(file, maxWidth = 120, maxHeight = 120, quality = 0.82) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            return reject(new Error('请选择有效的图片文件'));
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width;
                let h = img.height;
                if (w > h) {
                    if (w > maxWidth) {
                        h = Math.round((h * maxWidth) / w);
                        w = maxWidth;
                    }
                } else {
                    if (h > maxHeight) {
                        w = Math.round((w * maxHeight) / h);
                        h = maxHeight;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, w);
                canvas.height = Math.max(1, h);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error('解析图片失败'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsDataURL(file);
    });
}



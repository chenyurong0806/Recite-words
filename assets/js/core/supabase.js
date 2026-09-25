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
    }
});

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
    if (isBilibiliToy) throw new Error('Toy 平台暂不支持注册 Supabase 云端账号');

    const cleanName = username.trim();
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
            user_data: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) {
        throw new Error(error.message || '注册失败，请稍后重试');
    }
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
    if (isBilibiliToy) throw new Error('Toy 平台中请使用 B 站授权登录');

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
    return data;
}

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

async function supabaseUpdateAvatar(username, avatarUrl) {
    if (!username) return;
    const { error } = await sbClient
        .from('user_accounts')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('username', username);
    if (error) console.warn('[Supabase] Failed to update avatar:', error);
}

async function supabaseSyncUserData(username, userData) {
    if (!username || !userData) return;
    try {
        await sbClient
            .from('user_accounts')
            .update({ user_data: userData, updated_at: new Date().toISOString() })
            .eq('username', username);
    } catch (e) {
        console.warn('[Supabase] Failed to sync user data:', e);
    }
}

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
    return {
        type: 'bilibili',
        username: profile.nickname,
        avatar: profile.avatar || '',
        toyOpenId: profile.toyOpenId || ''
    };
}

async function biliSaveCloudData(data) {
    if (typeof window.toy === 'undefined' || typeof window.toy.setCloudStorage !== 'function') return;
    try {
        const jsonStr = JSON.stringify(data || {});
        const CHUNK_SIZE = 900;
        const totalChunks = Math.ceil(jsonStr.length / CHUNK_SIZE);
        const payload = {
            'storage_meta': JSON.stringify({ chunks: totalChunks, len: jsonStr.length, time: Date.now() })
        };
        for (let i = 0; i < totalChunks; i++) {
            payload[`data_c_${i}`] = jsonStr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        }
        await window.toy.setCloudStorage(payload);
    } catch (e) {
        console.warn('[ToySDK] Failed to save cloud storage:', e);
    }
}

async function biliLoadCloudData() {
    if (typeof window.toy === 'undefined' || typeof window.toy.getCloudStorage !== 'function') return null;
    try {
        const all = await window.toy.getCloudStorage();
        if (!all || !all['storage_meta']) return null;
        const meta = JSON.parse(all['storage_meta']);
        let fullStr = '';
        for (let i = 0; i < meta.chunks; i++) {
            fullStr += (all[`data_c_${i}`] || '');
        }
        return JSON.parse(fullStr);
    } catch (e) {
        console.warn('[ToySDK] Failed to read cloud storage:', e);
        return null;
    }
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



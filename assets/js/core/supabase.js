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

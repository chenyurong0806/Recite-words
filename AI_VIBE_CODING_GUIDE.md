# 词迹 (Recite-Words) - AI Vibe Coding 模块导航指南

> **本指南专为 AI 辅助编程 (Vibe Coding) 设计**。在向 AI 提出需求时，AI 借助本指南可瞬间定位具体文件与函数，无需在 16,000+ 行单文件中检索，大幅节省 Token 消耗并提升代码修改精准度。

---

## 📁 模块目录树概览

```text
Recite-words/
├── index.html                   # 主页面骨架与所有 MD3 视图 (Views) / 弹窗 (Modals)
├── worker.js                    # Cloudflare Worker 边缘函数 (GitHub 词书代理与边缘缓存)
├── package.json                 # 项目配置与打包脚本
├── scripts/
│   └── bundle.js                # 一键将模块合并为 index.bundle.js 的辅助脚本
├── books/                       # 本地词书 JSON 数据仓库 (考纲/精选/实词/Doris)
└── assets/
    ├── css/
    │   └── style.css            # Google MD3 规范主样式表
    ├── fonts/
    │   └── material-symbols-rounded.woff2 # 离线/本地图标字体兜底
    └── js/
        ├── app.js               # [入口] 应用主启动生命周期与 DOM 就绪检查
        ├── index.bundle.js      # [兜底包] 28 个模块合并备份
        ├── core/                # 核心基础设施
        │   ├── env.js           # B 站 Toy 容器与运行环境嗅探
        │   ├── supabase.js      # Supabase 客户端初始化与离线默认词库
        │   ├── storage.js       # IndexedDB (VocabOfflineDB) 离线存储引擎
        │   ├── audio.js         # 有道 TTS 与 Web Speech 统一语音朗读引擎
        │   └── state.js         # 全局用户状态 (currentUser) 与做题错题记录器
        ├── managers/            # 数据管理与算法引擎
        │   ├── book-manager.js  # 云端/本地/缓存词书管理器 (BookManager)
        │   ├── tracker.js       # 每日打卡与学习周历热力图 (DailyStudyTracker)
        │   └── ebbinghaus.js    # 艾宾浩斯记忆曲线复习算法引擎 (EbbinghausEngine)
        ├── components/          # 共享交互组件
        │   ├── virtual-keyboard.js # MD3 底部滑入式全局虚拟键盘
        │   ├── folder-tree.js   # 树状选词书弹窗与分类折叠渲染器
        │   ├── md3-select.js    # MD3 风格自定义下拉单选组件
        │   └── version-card.js  # 版本更新浮动卡片与 Release 检查器
        └── views/               # 业务视图控制器
            ├── auth.js          # 用户中心与账号切换 (view-auth)
            ├── hub.js           # 学习主站大厅与导航中枢 (view-hub)
            ├── book-selector.js # 独立大屏选词书页面 (view-book-selector)
            ├── single.js        # 单人自学练习模式：闪卡/选择/拼写 (view-single)
            ├── words-engine.js  # 形近词挖掘与固定搭配词组拼装引擎
            ├── riddle.js        # Wordle 单词解谜与多行草稿逻辑 (view-riddle)
            ├── duel.js          # 在线联机大厅与实时对战引擎 (view-online)
            ├── ai-duel.js       # 人机对战核心引擎 (拔河机制)
            ├── mistakes.js      # 错题本复习与清除 (view-mistakes)
            ├── local-duel.js    # 希沃同屏双人触控对决 (view-local-duel)
            ├── dictation.js     # 听音/看义默写练习模式 (view-dictation)
            ├── shici.js         # 背实词模式 (ShiCiManager) 与结算小结 (view-shici)
            ├── profile.js       # 个人中心 (我)、熟词本、自建词书与回收站 (view-me)
            ├── search.js        # 沉浸式查词、有道建议、词块拖拽归类 (view-search)
            └── settings.js      # 系统设置、主题切换与数据备份导出 (view-settings)
```

---

## 🎯 业务功能与文件精准映射表 (Vibe Coding 快速查阅)

| 当你想开发或修改... | 优先让 AI 打开对应的 JS 模块 | 对应的 HTML 视图 / 关键容器 |
| :--- | :--- | :--- |
| **Wordle 单词解谜 / 草稿行** | `assets/js/views/riddle.js` | `<div id="view-riddle">` |
| **文言文实词闯关 / 结算小结** | `assets/js/views/shici.js` | `<div id="view-shici">` / `<div id="modal-shici-settings">` |
| **查词页面 / 有道建议 / 词块拖拽** | `assets/js/views/search.js` | `<div id="view-search">` / `<div id="search-page-wrapper">` |
| **单人背词 / 闪卡 / 拼写模式** | `assets/js/views/single.js` | `<div id="view-single">` / `<div id="modal-single-settings">` |
| **艾宾浩斯复习算法 / 复习轮次** | `assets/js/managers/ebbinghaus.js` | 核心算法对象 `window.EbbinghausEngine` |
| **联机大厅 / 房间创建 / 实时对战** | `assets/js/views/duel.js` | `<div id="view-online">` |
| **人机拔河对战 (AI Duel)** | `assets/js/views/ai-duel.js` | `<div id="modal-ai-duel-settings">` |
| **希沃同屏双人触控对决** | `assets/js/views/local-duel.js` | `<div id="view-local-duel">` |
| **听音/看义默写模式** | `assets/js/views/dictation.js` | `<div id="view-dictation">` |
| **词书管理 / 导入导出 / 封面选书** | `assets/js/managers/book-manager.js`<br>`assets/js/views/book-selector.js` | `<div id="view-book-selector">` |
| **个人主页 / 熟词本 / 回收站 / 自建词书** | `assets/js/views/profile.js` | `<div id="view-me">` |
| **错题本查看与复习** | `assets/js/views/mistakes.js` | `<div id="view-mistakes">` |
| **系统设置 / 外观主题 / 数据备份** | `assets/js/views/settings.js` | `<div id="view-settings">` |
| **学习周历打卡 / 热力图** | `assets/js/managers/tracker.js` | `window.DailyStudyTracker` / 周历容器 |
| **发音朗读 / TTS 降级引擎** | `assets/js/core/audio.js` | `playWordAudio(text, type)` |
| **IndexedDB 离线存储 / 缓存** | `assets/js/core/storage.js` | `window.VocabOfflineDB` |
| **底部滑入式虚拟键盘** | `assets/js/components/virtual-keyboard.js` | `<div id="global-virtual-keyboard">` |
| **树状多选词书组件** | `assets/js/components/folder-tree.js` | `renderBookFolderTree(containerId, options)` |
| **版本更新检测卡片** | `assets/js/components/version-card.js` | `<div id="version-update-card">` |

---

## ⚡ Vibe Coding 最佳实战提示

### 1. 向 AI 发出精准指令的 Prompt 范例

- **优化 Wordle 键盘交互**：
  > “请阅读 `assets/js/views/riddle.js`，为 Wordle 的草稿行添加回车自动验证功能，不要修改其他模块。”
- **修改背实词的复习规则**：
  > “请查看 `assets/js/views/shici.js`，优化 `ShiCiManager` 中实词复习轮次的判定逻辑。”
- **调整有道查词的释义过滤**：
  > “请查看 `assets/js/views/search.js` 中的 `cleanMeaningText` 与 `executeHubSearch`，增强对专业词汇释义的解析。”
- **为个人中心新增数据图表**：
  > “请阅读 `assets/js/views/profile.js` 的 `renderMeView()`，新增近 7 天学习词汇量对比卡片。”

### 2. 跨模块调用的约定
- 各模块均挂载在浏览器的顶层 `window` 命名空间下。
- 无需编译打包工具，修改任意 `assets/js/` 下的子文件，刷新浏览器即刻生效！
- 如需生成单文件部署版本，可在终端运行：
  ```bash
  npm run bundle
  # 或 node scripts/bundle.js
  ```
  这会将所有模块依序打包生成 `assets/js/index.bundle.js`。

### 3. 本地开发与测试
- 直接双击 `index.html` 或通过 VS Code **Live Server**（推荐）打开即可。
- 所有原生 `onclick` 和内联事件监听器均保持 100% 兼容。


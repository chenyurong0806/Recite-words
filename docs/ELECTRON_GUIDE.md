# 《词迹》Electron 桌面端开发、打包与更新推送指南

本文档详细介绍了《词迹》桌面端应用程序的结构设计、本地词书与数据备份功能，以及如何对接 GitHub Releases 推送自动更新。

---

## 一、应用核心特性与架构

1. **零庞大词书打包（轻量纯净）**
   - 打包配置已严格排除 `books/` 文件夹（`!books/**`）。
   - 安装包体积保持轻巧，升级时不会重复下载庞大的词书库。

2. **专属本地词书目录**
   - **物理路径**：`%APPDATA%\recite-words\books`（Windows 用户目录，随系统独立持久化，卸载或更新应用不丢失）。
   - **功能支持**：
     - **在 App 中一键打开目录**：在“管理词书”或“系统设置”页面点击 **“打开词书目录”**，即可自动唤起 Windows 资源管理器。
     - **自动保存**：用户在应用内“下载词书”或“导入 JSON 词书”时，程序会自动在此目录同步保存一份对应的 `.json` 文件。
     - **外部放置自动识别**：用户只需把任何第三方或自建的 `.json` 词书直接拖入该文件夹，在应用内点击 **“扫描词书”**（或下次启动时），应用即可全自动扫描并加载使用。

3. **本地用户数据安全备份与历史还原**
   - **备份目录**：`%APPDATA%\recite-words\backups`。
   - **功能支持**：
     - **定时与退出自动备份**：自动静默备份艾宾浩斯复习曲线、学习日志、熟词表、错词本、成就统计等关键数据，自动保留最近 15 份快照。
     - **手动一键备份**：在“系统设置 -> 本地备份管理”中点击“立即生成新备份”。
     - **历史备份一键还原**：在备份管理弹窗中可查看历史备份列表（包含日期、大小、手动/自动标识），点击“还原”即可一键恢复任意历史状态。
     - **打开备份文件夹**：可一键在资源管理器中打开备份文件夹，方便导出或转移到其他电脑。

4. **对接 GitHub Releases 的自动无缝更新**
   - 集成 `electron-updater`。
   - 客户端启动时自动检测新版本，或在“设置 -> 关于 -> 检查更新”中手动触发。
   - 发现新版本时弹出 MD3 更新弹窗（包含版本号、更新日志）。
   - 点击“立即更新”直接在应用内实时下载，显示进度百分比与下载速度。
   - 下载完成后提供“立即重启并安装更新”按钮，重启即完成安装。

---

## 二、本地开发与打包命令

在项目根目录下打开终端（PowerShell 或 CMD）：

### 1. 本地启动开发预览
```bash
npm start
```
*可在桌面窗口中直接启动并调试《词迹》桌面客户端。*

### 2. 编译静态资源（如果修改了 assets/js 源码）
```bash
npm run bundle
```

### 3. 本地打包为 Windows 安装包（不上传）
```bash
npm run build
```
打包成功后，输出文件位于 `dist/` 目录下：
- `Recite-Words-Setup-x.x.x.exe`：标准 Windows 安装包（NSIS）
- `latest.yml`：自动更新元数据文件
- `Recite-Words-Setup-x.x.x.exe.blockmap`：增量更新分块数据

---

## 三、如何向 GitHub 推送版本更新（重点）

当您开发了新功能或修复了问题，准备向所有已安装的用户推送新版本更新时，请按照以下两种推荐方式之一操作：

### 推荐方式 A：使用 GitHub Actions 自动云端打包发布（最轻松、全自动）

项目已配置 `.github/workflows/release.yml`，只要推送一个版本号 Git Tag，GitHub 云端服务器就会自动编译打包并创建 Release！

1. **修改版本号**：
   在 `package.json` 中将 `"version"` 改为新版本号（如从 `2.7.0` 改为 `2.7.1`）。
2. **提交代码并打标签推送到 GitHub**：
   ```bash
   git add .
   git commit -m "发布 v2.7.1 新版本"
   git tag v2.7.1
   git push origin main
   git push origin v2.7.1
   ```
3. **完成**：
   GitHub Actions 会自动在 Windows 虚拟机上打包，并在您的仓库 Releases 页面生成对应的 `v2.7.1` 发布。用户的客户端即可检测到并自动升级！

---

### 推荐方式 B：在本地一键打包并自动上传发布（适合本地构建）

如果您希望在本地电脑上直接构建并上传到 GitHub Releases：

#### 第一步：准备 GitHub Personal Access Token（只需生成一次）
1. 打开浏览器登录 GitHub，点击右上角头像 -> **Settings**。
2. 左侧栏滑到底部，点击 **Developer settings** -> **Personal access tokens** -> **Tokens (classic)**。
3. 点击 **Generate new token (classic)**：
   - Note 填写：`electron-builder-token`
   - Expiration 选：`No expiration` 或您喜欢的时长
   - 勾选权限：**`repo`**（包含全部仓库读写权限）
4. 点击底部绿色按钮 **Generate token**，**复制保存好生成的 Token**（形如 `ghp_xxxxxxxxxxxx`）。

#### 第二步：修改版本号
打开 `package.json`，把 `"version"` 升级，例如：
```json
"version": "2.7.1"
```

#### 第三步：执行打包并推送命令
在项目根目录下打开 **PowerShell**：
```powershell
# 设置环境变量（将下面的 ghp_xxx 替换为您刚才生成的 Token）
$env:GH_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 执行打包并自动上传到 GitHub Releases
npm run release
```
*`electron-builder` 会自动构建安装包，并在您的 GitHub 仓库创建一个对应的 Release 草稿（Draft），将安装包和 `latest.yml` 自动上传！*

#### 第四步：在 GitHub 上确认发布
1. 打开浏览器访问您的仓库 Releases 页面：
   `https://github.com/chenyurong0806/Recite-words/releases`
2. 您会看到刚刚上传的 Draft（草稿）版本。
3. 点击 **Edit**（编辑），确认附件中包含：
   - `Recite-Words-Setup-2.7.1.exe`
   - `latest.yml`
   - `Recite-Words-Setup-2.7.1.exe.blockmap`
4. 填写本次更新说明，点击 **Publish release**（发布 Release）。

> 发布完成后，所有打开客户端的用户将自动收到新版本弹窗提示，点击即可完成无缝更新！

---

### 推荐方式 C：手动网页上传（无需配置 Token）

如果您不想配置 Token，也不想使用命令行推送：
1. 修改 `package.json` 中的 `version`（例如 `2.7.1`）。
2. 在本地终端运行：`npm run build`。
3. 打开 `dist/` 文件夹，准备好以下 3 个文件：
   - `Recite-Words-Setup-2.7.1.exe`
   - `latest.yml`
   - `Recite-Words-Setup-2.7.1.exe.blockmap`
4. 打开 GitHub 仓库页面 -> 点击 **Releases** -> **Draft a new release**。
5. Tag version 填写 `v2.7.1`，Title 填写 `词迹 v2.7.1`。
6. 将上述 3 个文件一起拖入附件上传区域中。
7. 点击 **Publish release** 即可！


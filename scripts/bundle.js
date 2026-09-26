/**
 * bundle.js
 * 纯 Node.js 零依赖打包辅助脚本：
 * 将 assets/js/ 各子模块按加载顺序合并为单个 assets/js/index.bundle.js
 * 运行方式: node scripts/bundle.js
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const jsBase = path.join(rootDir, 'assets/js');

const loadOrder = [
  // 1. Core
  'core/env.js',
  'core/supabase.js',
  'core/storage.js',
  'core/audio.js',
  'core/state.js',

  // 2. Managers
  'managers/book-manager.js',
  'managers/tracker.js',
  'managers/ebbinghaus.js',
  'managers/level-manager.js',

  // 3. Components
  'components/virtual-keyboard.js',
  'components/folder-tree.js',
  'components/md3-select.js',
  'components/version-card.js',
  'components/avatar-cropper.js',

  // 4. Views
  'views/auth.js',
  'views/hub.js',
  'views/book-selector.js',
  'views/leaderboard.js',
  'views/riddle.js',
  'views/single.js',
  'views/words-engine.js',
  'views/profile.js',
  'views/duel.js',
  'views/ai-duel.js',
  'views/mistakes.js',
  'views/local-duel.js',
  'views/dictation.js',
  'views/shici.js',
  'views/settings.js',
  'views/search.js',

  // 5. Bootstrap
  'app.js'
];

console.log('Merging modular files into index.bundle.js...');
const bundles = [];

loadOrder.forEach(file => {
  const filePath = path.join(jsBase, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  bundles.push(`/* --- Begin: ${file} --- */\n` + content + `\n/* --- End: ${file} --- */\n`);
});

const outputPath = path.join(jsBase, 'index.bundle.js');
fs.writeFileSync(outputPath, bundles.join('\n'), 'utf8');
console.log(`Successfully generated ${outputPath} (${bundles.length} modules merged).`);


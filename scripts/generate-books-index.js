/**
 * generate-books-index.js
 * 扫描 books/ 目录（排除 Doris 内部资源）并生成 books/books-index.json 索引文件
 * 运行方式: node scripts/generate-books-index.js
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const booksDir = path.join(rootDir, 'books');
const categories = ['高中', '初中', '大学', '实词', '翻译', '其他'];
const books = [];

function scan(dir, cat) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      scan(full, cat);
    } else if (item.endsWith('.json') && item !== 'books-index.json') {
      const stat = fs.statSync(full);
      const name = item.replace(/\.json$/i, '');
      const content = fs.readFileSync(full, 'utf8');
      let count = 0;
      try {
        const d = JSON.parse(content);
        if (Array.isArray(d)) {
          count = d.length;
        } else if (d && typeof d === 'object') {
          if (Array.isArray(d.words)) {
            count = d.words.length;
          } else if (Array.isArray(d.list)) {
            count = d.list.length;
          } else if (Object.values(d).some(Array.isArray)) {
            count = Object.values(d).filter(Array.isArray).reduce((sum, arr) => sum + arr.length, 0);
          }
        }
      } catch (e) {}
      const rel = path.relative(rootDir, full).replace(/\\/g, '/');
      books.push({
        id: rel,
        name: name,
        category: cat,
        path: rel,
        count: count,
        size: stat.size,
        updatedAt: Math.round(stat.mtimeMs)
      });
    }
  }
}

for (const cat of categories) {
  scan(path.join(booksDir, cat), cat);
}

books.sort((a, b) => {
  if (a.id === 'books/高中/高中考纲.json') return -1;
  if (b.id === 'books/高中/高中考纲.json') return 1;
  return 0;
});

const indexData = {
  version: '2.10.0',
  generatedAt: Date.now(),
  categories: categories,
  books: books
};

const targetFile = path.join(booksDir, 'books-index.json');
fs.writeFileSync(targetFile, JSON.stringify(indexData, null, 2), 'utf8');
console.log(`Successfully generated ${targetFile} with ${books.length} books.`);


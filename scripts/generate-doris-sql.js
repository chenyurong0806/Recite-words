/**
 * generate-doris-sql.js
 * 读取 books/Doris 文件夹下的所有词书，并生成可直接在 Supabase SQL Editor 中运行的 SQL 脚本
 * 运行方式: node scripts/generate-doris-sql.js
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dorisDir = path.join(rootDir, 'books/Doris');
const sqlFile = path.join(rootDir, 'scripts/supabase_doris_books.sql');

if (!fs.existsSync(dorisDir)) {
  console.error('Doris folder not found:', dorisDir);
  process.exit(1);
}

const files = fs.readdirSync(dorisDir).filter(f => f.endsWith('.json'));

let sql = `-- ========================================================
-- Supabase Doris 内部词书数据表与初始数据导入脚本
-- 在 Supabase 控制台 -> SQL Editor 中粘贴并点击 Run 执行
-- ========================================================

-- 1. 创建 doris_books 内部词书表
CREATE TABLE IF NOT EXISTS public.doris_books (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Doris',
    count INTEGER DEFAULT 0,
    words JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 启用行级安全策略 (RLS)
ALTER TABLE public.doris_books ENABLE ROW LEVEL SECURITY;

-- 3. 允许匿名与认证用户读取内部词书数据 (网站前端通过密码 Shier#123 验证后请求)
DROP POLICY IF EXISTS "Allow anon read doris_books" ON public.doris_books;
CREATE POLICY "Allow anon read doris_books"
    ON public.doris_books
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 4. 插入 Doris 词书数据
`;

files.forEach(f => {
  const filePath = path.join(dorisDir, f);
  const name = f.replace(/\.json$/i, '');
  const id = 'doris_' + name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
  const raw = fs.readFileSync(filePath, 'utf8');
  let words = [];
  try {
    words = JSON.parse(raw);
  } catch (e) {
    console.error('Parse error in', f, e.message);
    return;
  }
  const count = Array.isArray(words) ? words.length : 0;
  // 转义 SQL 字符串中的单引号
  const jsonStr = JSON.stringify(words).replace(/'/g, "''");
  const nameSafe = name.replace(/'/g, "''");

  sql += `
INSERT INTO public.doris_books (id, name, category, count, words, updated_at)
VALUES (
    '${id}',
    '${nameSafe}',
    'Doris',
    ${count},
    '${jsonStr}'::jsonb,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    count = EXCLUDED.count,
    words = EXCLUDED.words,
    updated_at = NOW();
`;
});

fs.writeFileSync(sqlFile, sql, 'utf8');
console.log(`Generated ${sqlFile} for ${files.length} Doris books.`);


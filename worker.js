// worker.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 跨域响应头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const REPO = 'chenyurong0806/Recite-words';

    // 统一 GitHub API 请求头
    const ghHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Recite-Words-Worker',
      'Accept': 'application/vnd.github.v3+json'
    };
    if (env.GITHUB_TOKEN) {
      ghHeaders['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`;
    }

    // ==========================================
    // 路由 1: 获取词书目录 (增强边缘缓存)
    // ==========================================
    if (url.pathname === '/api/books') {
      try {
        const ghTreeRes = await fetch(`https://api.github.com/repos/${REPO}/git/trees/main?recursive=1`, {
          headers: ghHeaders,
          cf: { cacheTtl: 600, cacheEverything: true } // 边缘缓存 10 分钟
        });

        if (ghTreeRes.ok) {
          const treeData = await ghTreeRes.json();
          if (Array.isArray(treeData.tree)) {
            const books = treeData.tree
              .filter(item => item.path.startsWith('books/') && item.path.endsWith('.json'))
              .map(item => {
                const parts = item.path.split('/');
                const fileName = parts[parts.length - 1];
                const name = fileName.replace(/\.json$/i, '');
                const category = parts.length > 2 ? parts[1] : '精选';
                return {
                  id: item.path,
                  name: name,
                  category: category,
                  path: item.path,
                  size: item.size,
                  // 词书优先通过当前 Worker 自带的代理接口下载，避免直连 GitHub 失败
                  downloadUrl: `${url.origin}/api/book?path=${encodeURIComponent(item.path)}`,
                  isCloud: true
                };
              });

            if (books.length > 0) {
              return new Response(JSON.stringify(books), {
                headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=600' }
              });
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch books from GitHub API:', err);
      }

      // 静态备用目录
      const defaultBooks = [
        // 经典分类 (11本)
        { id: 'books/经典/高中考纲词汇.json', name: '高中考纲词汇', category: '经典', count: 3892, path: 'books/经典/高中考纲词汇.json', isCloud: true },
        { id: 'books/经典/初中考纲词汇.json', name: '初中考纲词汇', category: '经典', count: 1741, path: 'books/经典/初中考纲词汇.json', isCloud: true },
        { id: 'books/经典/初中考纲词组.json', name: '初中考纲词组', category: '经典', count: 347, path: 'books/经典/初中考纲词组.json', isCloud: true },
        { id: 'books/经典/高中考纲词组.json', name: '高中考纲词组', category: '经典', count: 1200, path: 'books/经典/高中考纲词组.json', isCloud: true },
        { id: 'books/经典/高中518词组.json', name: '高中518词组', category: '经典', count: 570, path: 'books/经典/高中518词组.json', isCloud: true },
        { id: 'books/经典/高考真题高频.json', name: '高考真题高频', category: '经典', count: 785, path: 'books/经典/高考真题高频.json', isCloud: true },
        { id: 'books/经典/高考阅读高频.json', name: '高考阅读高频', category: '经典', count: 686, path: 'books/经典/高考阅读高频.json', isCloud: true },
        { id: 'books/经典/基础词汇.json', name: '基础词汇', category: '经典', count: 2991, path: 'books/经典/基础词汇.json', isCloud: true },
        { id: 'books/经典/四级词汇.json', name: '四级词汇', category: '经典', count: 2607, path: 'books/经典/四级词汇.json', isCloud: true },
        { id: 'books/经典/六级词汇.json', name: '六级词汇', category: '经典', count: 2088, path: 'books/经典/六级词汇.json', isCloud: true },
        { id: 'books/经典/考研红宝书.json', name: '考研红宝书', category: '经典', count: 5493, path: 'books/经典/考研红宝书.json', isCloud: true },

        // 高中精选分类 (11本)
        { id: 'books/高中精选/Wordbank 1.json', name: 'Wordbank 1', category: '高中精选', count: 84, path: 'books/高中精选/Wordbank 1.json', isCloud: true },
        { id: 'books/高中精选/Wordbank 3.json', name: 'Wordbank 3', category: '高中精选', count: 81, path: 'books/高中精选/Wordbank 3.json', isCloud: true },
        { id: 'books/高中精选/Wordbank 4.json', name: 'Wordbank 4', category: '高中精选', count: 77, path: 'books/高中精选/Wordbank 4.json', isCloud: true },
        { id: 'books/高中精选/基础闯关a-as.json', name: '基础闯关a-as', category: '高中精选', count: 67, path: 'books/高中精选/基础闯关a-as.json', isCloud: true },
        { id: 'books/高中精选/基础闯关a-b.json', name: '基础闯关a-b', category: '高中精选', count: 42, path: 'books/高中精选/基础闯关a-b.json', isCloud: true },
        { id: 'books/高中精选/基础闯关b-c.json', name: '基础闯关b-c', category: '高中精选', count: 42, path: 'books/高中精选/基础闯关b-c.json', isCloud: true },
        { id: 'books/高中精选/基础闯关c-d.json', name: '基础闯关c-d', category: '高中精选', count: 42, path: 'books/高中精选/基础闯关c-d.json', isCloud: true },
        { id: 'books/高中精选/翻译.json', name: '翻译', category: '高中精选', count: 107, path: 'books/高中精选/翻译.json', isCloud: true },
        { id: 'books/高中精选/词汇测试a-as.json', name: '词汇测试a-as', category: '高中精选', count: 25, path: 'books/高中精选/词汇测试a-as.json', isCloud: true },
        { id: 'books/高中精选/高一高二.json', name: '高一高二', category: '高中精选', count: 1021, path: 'books/高中精选/高一高二.json', isCloud: true },
        { id: 'books/高中精选/高三.json', name: '高三', category: '高中精选', count: 446, path: 'books/高中精选/高三.json', isCloud: true },

        // 实词分类 (2本)
        { id: 'books/实词/初中150实词.json', name: '初中150实词', category: '实词', count: 150, path: 'books/实词/初中150实词.json', isCloud: true },
        { id: 'books/实词/高中300实词.json', name: '高中300实词', category: '实词', count: 300, path: 'books/实词/高中300实词.json', isCloud: true }
      ];
      return new Response(JSON.stringify(defaultBooks), { headers: corsHeaders });
    }

    // ==========================================
    // 路由 2: 获取词书内容 (多镜像 + 边缘强缓存)
    // ==========================================
    if (url.pathname === '/api/book') {
      const id = url.searchParams.get('id') || url.searchParams.get('path');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing book id' }), { status: 400, headers: corsHeaders });
      }

      let bookPath = id.trim();
      const legacyMap = {
        'GaoKao3500': 'books/经典/高中考纲词汇.json',
        'books/考纲/高考3500.json': 'books/经典/高中考纲词汇.json',
        'books/考纲/初中考纲词汇.json': 'books/经典/初中考纲词汇.json',
        'books/考纲/初中考纲词组.json': 'books/经典/初中考纲词组.json',
        'books/考纲/518.json': 'books/经典/高中518词组.json',
        'books/考纲/高中518词组.json': 'books/经典/高中518词组.json',
        'books/考纲/考纲词组.json': 'books/经典/高中考纲词组.json',
        'books/考纲/高中考纲词组.json': 'books/经典/高中考纲词组.json',
        'books/其他/CET4.json': 'books/经典/四级词汇.json',
        'books/其他/CET6.json': 'books/经典/六级词汇.json',
        'books/其他/小学词汇.json': 'books/经典/基础词汇.json',
        'books/Doris/高一高二笔记.json': 'books/高中精选/高一高二.json',
        'books/Doris/高三笔记.json': 'books/高中精选/高三.json'
      };
      if (legacyMap[bookPath]) {
        bookPath = legacyMap[bookPath];
      } else if (bookPath.startsWith('books/Doris/')) {
        bookPath = bookPath.replace('books/Doris/', 'books/高中精选/');
      } else if (bookPath.startsWith('books/其他/')) {
        bookPath = bookPath.replace('books/其他/', 'books/经典/');
      }

      if (!bookPath.startsWith('books/') && !bookPath.includes('/')) {
        const idLower = bookPath.toLowerCase();
        if (idLower.includes('gaokao') || idLower.includes('3500') || idLower.includes('高中考纲词汇')) bookPath = 'books/经典/高中考纲词汇.json';
        else if (idLower.includes('初中考纲词汇')) bookPath = 'books/经典/初中考纲词汇.json';
        else if (idLower.includes('初中考纲词组')) bookPath = 'books/经典/初中考纲词组.json';
        else if (idLower.includes('518')) bookPath = 'books/经典/高中518词组.json';
        else if (idLower.includes('cet4') || idLower.includes('四级')) bookPath = 'books/经典/四级词汇.json';
        else if (idLower.includes('cet6') || idLower.includes('六级')) bookPath = 'books/经典/六级词汇.json';
        else if (idLower.includes('考研') || idLower.includes('红宝书')) bookPath = 'books/经典/考研红宝书.json';
        else if (idLower.includes('小学') || idLower.includes('基础词汇')) bookPath = 'books/经典/基础词汇.json';
        else if (idLower.includes('初中150') || idLower.includes('150实词')) bookPath = 'books/实词/初中150实词.json';
        else if (idLower.includes('高中300') || idLower.includes('300实词')) bookPath = 'books/实词/高中300实词.json';
        else if (idLower.includes('实词')) bookPath = 'books/实词/高中300实词.json';
        else if (idLower.includes('高一高二')) bookPath = 'books/高中精选/高一高二.json';
        else if (idLower.includes('高三')) bookPath = 'books/高中精选/高三.json';
        else if (idLower.includes('词组')) bookPath = 'books/经典/高中考纲词组.json';
        else bookPath = `books/经典/${bookPath}.json`;
      }
      if (bookPath === 'books/实词/实词.json') {
        bookPath = 'books/实词/高中300实词.json';
      }
      if (!bookPath.endsWith('.json')) bookPath += '.json';

      // 依次尝试：GitHub Raw -> 国内 FastGit/GHProxy 镜像 -> jsDelivr
      const candidateUrls = [
        `https://raw.githubusercontent.com/${REPO}/main/${encodeURI(bookPath)}`,
        `https://ghfast.top/https://raw.githubusercontent.com/${REPO}/main/${encodeURI(bookPath)}`,
        `https://cdn.jsdelivr.net/gh/${REPO}@main/${encodeURI(bookPath)}`
      ];

      for (const targetUrl of candidateUrls) {
        try {
          const fetchRes = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Recite-Words-Worker' },
            cf: { cacheTtl: 86400, cacheEverything: true } // CF 边缘直接缓存 24 小时
          });
          if (fetchRes.ok) {
            const bookData = await fetchRes.text();
            return new Response(bookData, {
              headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=86400' }
            });
          }
        } catch (e) {
          // 尝试下一个候选地址
        }
      }

      // KV 降级
      const kvData = (await env.VOCAB_BOOKS?.get(id)) || (await env.VOCAB_BOOKS?.get(bookPath));
      if (kvData) {
        return new Response(kvData, { headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=86400' } });
      }

      return new Response(JSON.stringify({ error: 'Book not found' }), { status: 404, headers: corsHeaders });
    }

    // ==========================================
    // 路由 3: 版本与更新日志接口
    // ==========================================
    if (url.pathname === '/api/version') {
      let versionData = null;

      // 通道 1: GitHub API
      try {
        const ghRes = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=1`, {
          headers: ghHeaders
        });
        if (ghRes.ok) {
          const releases = await ghRes.json();
          if (Array.isArray(releases) && releases.length > 0) {
            const latest = releases[0];
            const tag = (latest.tag_name || '').replace(/^v/i, '');
            const body = latest.body || '';

            const changelog = body
              .replace(/\r\n/g, '\n')
              .split('\n')
              .map(l => l.trim())
              .filter(l => l && !l.startsWith('#'))
              .map(l => l.replace(/^[-*•\d.]+\s*/, ''));

            const zipAsset = Array.isArray(latest.assets) ? latest.assets.find(a => a.name && a.name.endsWith('.zip')) : null;
            const zipRawUrl = zipAsset ? zipAsset.browser_download_url : `https://github.com/${REPO}/archive/refs/tags/${latest.tag_name}.zip`;

            // 核心：把下载链接指向 Worker 自身的代理加速下载接口与镜像
            versionData = {
              version: tag,
              releaseDate: (latest.published_at || '').substring(0, 10),
              changelog: changelog.length > 0 ? changelog : ['常规更新及性能优化'],
              downloadUrl: `${url.origin}/api/download-latest?tag=${latest.tag_name}`, // 走 Worker 代理下载 zip
              mirrorDownloadUrl: `https://ghfast.top/${zipRawUrl}`, // 备用国内镜像 zip
              githubReleaseUrl: latest.html_url
            };
          }
        }
      } catch (err) {
        console.warn('API error:', err);
      }

      // 通道 2: Atom Feed (免限流保底)
      if (!versionData) {
        try {
          const feedRes = await fetch(`https://github.com/${REPO}/releases.atom`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          if (feedRes.ok) {
            const feedXml = await feedRes.text();
            const entryMatch = feedXml.match(/<entry>([\s\S]*?)<\/entry>/);
            if (entryMatch) {
              const entry = entryMatch[1];
              const tagMatch = entry.match(/<id>.*?\/releases\/tag\/(.*?)<\/id>/);
              const tagRaw = tagMatch ? tagMatch[1] : '1.9.2';
              const tag = tagRaw.replace(/^v/i, '');

              const contentMatch = entry.match(/<content type="html">([\s\S]*?)<\/content>/);
              let changelog = [];
              if (contentMatch) {
                let html = contentMatch[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                changelog = html
                  .replace(/<li>/gi, '\n* ')
                  .replace(/<[^>]+>/g, '')
                  .split('\n')
                  .map(l => l.trim())
                  .filter(l => l && !l.startsWith('#'))
                  .map(l => l.replace(/^[-*•\d.]+\s*/, ''));
              }

              versionData = {
                version: tag,
                releaseDate: new Date().toISOString().substring(0, 10),
                changelog: changelog.length > 0 ? changelog : ['常规更新及性能优化'],
                downloadUrl: `${url.origin}/api/download-latest?tag=${tagRaw}`,
                mirrorDownloadUrl: `https://ghfast.top/https://github.com/${REPO}/releases/download/${tagRaw}/index.html`,
                githubReleaseUrl: `https://github.com/${REPO}/releases/tag/${tagRaw}`
              };
            }
          }
        } catch (err) {
          console.warn('Feed error:', err);
        }
      }

      if (!versionData) {
        versionData = {
          version: '1.9.2',
          releaseDate: new Date().toISOString().substring(0, 10),
          changelog: ['常规优化更新'],
          downloadUrl: `${url.origin}/api/download-latest?tag=1.9.2`,
          githubReleaseUrl: `https://github.com/${REPO}/releases/latest`
        };
      }

      return new Response(JSON.stringify(versionData), {
        headers: { ...corsHeaders, 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
    }


    // ==========================================
    // 路由：代理全量 Releases 列表（解决前端直连 GitHub 失败）
    // ==========================================
    if (url.pathname === '/api/releases') {
      try {
        const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=15`, {
          headers: ghHeaders,
          cf: { cacheTtl: 1800, cacheEverything: true } // CF 边缘缓存 30 分钟
        });
        if (res.ok) {
          const data = await res.text();
          return new Response(data, {
            headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=1800' }
          });
        }
      } catch (err) {}
      return new Response('[]', { headers: corsHeaders });
    }

    // ==========================================
    // 路由 4: 下载最新版 ZIP 压缩包 (关键优化：Worker 代下中转，免翻墙满速)
    // ==========================================
    if (url.pathname === '/api/download-latest') {
      const tag = url.searchParams.get('tag') || 'latest';
      const fileUrl = tag === 'latest' 
        ? `https://github.com/${REPO}/archive/refs/heads/main.zip`
        : `https://github.com/${REPO}/archive/refs/tags/${tag}.zip`;

      try {
        const upstreamRes = await fetch(fileUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          redirect: 'follow'
        });

        if (upstreamRes.ok) {
          const downloadHeaders = new Headers(upstreamRes.headers);
          downloadHeaders.set('Access-Control-Allow-Origin', '*');
          downloadHeaders.set('Content-Disposition', `attachment; filename="Recite-words-${tag}.zip"`);
          downloadHeaders.set('Content-Type', 'application/zip');
          downloadHeaders.delete('x-frame-options');

          return new Response(upstreamRes.body, {
            status: 200,
            headers: downloadHeaders
          });
        }
      } catch (err) {
        console.warn('Worker direct download failed, redirecting to mirror...', err);
      }

      return Response.redirect(`https://ghfast.top/${fileUrl}`, 302);
    }

    // ==========================================
    // 路由 5: 有道词典 Suggest 代理 (解决纯浏览器端直接跨域阻断)
    // ==========================================
    if (url.pathname === '/api/youdao') {
      const query = url.searchParams.get('q') || '';
      const num = url.searchParams.get('num') || '8';
      if (!query) {
        return new Response(JSON.stringify({ result: { code: 400, msg: 'Missing query' }, data: { entries: [] } }), {
          headers: corsHeaders
        });
      }

      try {
        const cleanQuery = query.trim();
        const targetSuggest = `https://dict.youdao.com/suggest?q=${encodeURIComponent(cleanQuery)}&num=${encodeURIComponent(num)}&doctype=json`;
        const targetJsonapi = `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(cleanQuery)}&doctype=json&jsonversion=2`;

        const [suggestRes, jsonApiRes] = await Promise.all([
          fetch(targetSuggest, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Recite-Words-App' } })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null),
          fetch(targetJsonapi, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Recite-Words-App' } })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        ]);

        let entries = (suggestRes && suggestRes.data && Array.isArray(suggestRes.data.entries)) ? suggestRes.data.entries : [];

        // 提取 ec (英汉完整词典) 未截断释义
        if (jsonApiRes && jsonApiRes.ec && Array.isArray(jsonApiRes.ec.word) && jsonApiRes.ec.word.length > 0) {
          const ecWord = jsonApiRes.ec.word[0];
          const fullExplains = [];
          if (Array.isArray(ecWord.trs)) {
            ecWord.trs.forEach(trItem => {
              if (trItem && Array.isArray(trItem.tr) && trItem.tr[0] && trItem.tr[0].l && Array.isArray(trItem.tr[0].l.i)) {
                trItem.tr[0].l.i.forEach(line => {
                  let text = '';
                  if (typeof line === 'string') text = line;
                  else if (line && line['#text']) text = line['#text'];
                  if (text && !/人名[）\)]?$/.test(text) && !/^【名】.*人名/.test(text)) {
                    fullExplains.push(text);
                  }
                });
              }
            });
          }
          if (fullExplains.length > 0) {
            const combined = fullExplains.join('; ');
            const matchedExact = entries.find(e => e.entry && e.entry === cleanQuery);
            if (matchedExact) {
              matchedExact.explain = combined;
            } else {
              const matchedLower = entries.find(e => e.entry && e.entry.toLowerCase() === cleanQuery.toLowerCase());
              if (matchedLower) {
                matchedLower.entry = cleanQuery;
                matchedLower.explain = combined;
              } else {
                entries.unshift({ entry: cleanQuery, explain: combined });
              }
            }
          }
        }

        // 提取 ce (汉英完整词典) 释义
        if (jsonApiRes && jsonApiRes.ce && Array.isArray(jsonApiRes.ce.word) && jsonApiRes.ce.word.length > 0) {
          const ceWord = jsonApiRes.ce.word[0];
          const fullExplains = [];
          if (Array.isArray(ceWord.trs)) {
            ceWord.trs.forEach(trItem => {
              if (trItem && Array.isArray(trItem.tr) && trItem.tr[0]) {
                const tran = trItem.tr[0]['#tran'];
                if (tran) fullExplains.push(tran);
              }
            });
          }
          if (fullExplains.length > 0) {
            const combined = fullExplains.join('; ');
            const matchedExact = entries.find(e => e.entry && e.entry === cleanQuery);
            if (matchedExact) {
              matchedExact.explain = combined;
            } else {
              const matchedLower = entries.find(e => e.entry && e.entry.toLowerCase() === cleanQuery.toLowerCase());
              if (matchedLower) {
                matchedLower.entry = cleanQuery;
                matchedLower.explain = combined;
              } else {
                entries.unshift({ entry: cleanQuery, explain: combined });
              }
            }
          }
        }

        return new Response(JSON.stringify({ result: { code: 200, msg: 'success' }, data: { entries } }), {
          headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=3600' }
        });
      } catch (err) {
        console.warn('Youdao API proxy error:', err);
      }
      return new Response(JSON.stringify({ result: { code: 500, msg: 'Failed to fetch Youdao API' }, data: { entries: [] } }), {
        headers: corsHeaders
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};
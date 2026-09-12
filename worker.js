export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 设置跨域 CORS 响应头，允许任何网页前端读取
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8'
    };

    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 路由 1: 获取词书目录 (优先从 GitHub 代码库 books 目录动态抓取)
    if (url.pathname === '/api/books') {
      try {
        const ghTreeRes = await fetch('https://api.github.com/repos/chenyurong0806/Recite-words/git/trees/main?recursive=1', {
          headers: {
            'User-Agent': 'Recite-Words-Cloudflare-Worker'
          }
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
                  downloadUrl: `https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/${encodeURI(item.path)}`,
                  cdnUrl: `https://cdn.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodeURI(item.path)}`,
                  isCloud: true
                };
              });

            if (books.length > 0) {
              return new Response(JSON.stringify(books), {
                headers: {
                  ...corsHeaders,
                  'Cache-Control': 'public, max-age=300' // 缓存 5 分钟
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch books from GitHub API:', err);
      }

      // KV 降级
      const kvManifest = await env.VOCAB_BOOKS?.get('__book_manifest__');
      if (kvManifest) {
        return new Response(kvManifest, { headers: corsHeaders });
      }

      // 静态已知词书备用目录
      const defaultBooks = [
        { id: 'books/Doris/基础闯关a-as.json', name: '基础闯关a-as', category: 'Doris', count: 68, path: 'books/Doris/基础闯关a-as.json', isCloud: true },
        { id: 'books/Doris/翻译.json', name: '翻译', category: 'Doris', count: 58, path: 'books/Doris/翻译.json', isCloud: true },
        { id: 'books/Doris/词汇测试a-as.json', name: '词汇测试a-as', category: 'Doris', count: 25, path: 'books/Doris/词汇测试a-as.json', isCloud: true },
        { id: 'books/Doris/高一高二笔记.json', name: '高一高二', category: 'Doris', count: 1039, path: 'books/Doris/高一高二笔记.json', isCloud: true },
        { id: 'books/Doris/高三笔记.json', name: '高三', category: 'Doris', count: 31, path: 'books/Doris/高三笔记.json', isCloud: true },
        { id: 'books/考纲/518.json', name: '518', category: '考纲', count: 570, path: 'books/考纲/518.json', isCloud: true },
        { id: 'books/考纲/考纲词组.json', name: '考纲词组', category: '考纲', count: 1201, path: 'books/考纲/考纲词组.json', isCloud: true },
        { id: 'books/考纲/高考3500.json', name: '高考3500', category: '考纲', count: 3893, path: 'books/考纲/高考3500.json', isCloud: true },
        { id: 'books/其他/CET4.json', name: 'CET4', category: '其他', count: 2607, path: 'books/其他/CET4.json', isCloud: true },
        { id: 'books/其他/GRE1500.json', name: 'GRE1500', category: '其他', count: 1533, path: 'books/其他/GRE1500.json', isCloud: true },
        { id: 'books/其他/小学词汇.json', name: '小学词汇', category: '其他', count: 2991, path: 'books/其他/小学词汇.json', isCloud: true }
      ];
      return new Response(JSON.stringify(defaultBooks), { headers: corsHeaders });
    }

    // 路由 2: 获取单本词书数据 (优先从 GitHub 获取，支持 CDN 与 KV 降级)
    if (url.pathname === '/api/book') {
      const id = url.searchParams.get('id') || url.searchParams.get('path');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing book id' }), { status: 400, headers: corsHeaders });
      }

      // 规范化文件路径
      let bookPath = id.trim();
      if (!bookPath.startsWith('books/') && !bookPath.includes('/')) {
        const idLower = bookPath.toLowerCase();
        if (idLower.includes('gaokao') || idLower.includes('3500')) bookPath = 'books/考纲/高考3500.json';
        else if (idLower.includes('518')) bookPath = 'books/考纲/518.json';
        else if (idLower.includes('cet4')) bookPath = 'books/其他/CET4.json';
        else if (idLower.includes('gre')) bookPath = 'books/其他/GRE1500.json';
        else if (idLower.includes('小学')) bookPath = 'books/其他/小学词汇.json';
        else if (idLower.includes('词组')) bookPath = 'books/考纲/考纲词组.json';
        else bookPath = `books/其他/${bookPath}.json`;
      }
      if (!bookPath.endsWith('.json')) bookPath += '.json';

      // 1. 优先从 GitHub Raw / jsdelivr CDN 获取
      const ghRawUrl = `https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/${encodeURI(bookPath)}`;
      const cdnUrl = `https://cdn.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodeURI(bookPath)}`;

      try {
        let fetchRes = await fetch(ghRawUrl, {
          headers: { 'User-Agent': 'Recite-Words-Cloudflare-Worker' }
        });
        if (!fetchRes.ok) {
          fetchRes = await fetch(cdnUrl, {
            headers: { 'User-Agent': 'Recite-Words-Cloudflare-Worker' }
          });
        }
        if (fetchRes.ok) {
          const bookData = await fetchRes.text();
          return new Response(bookData, {
            headers: {
              ...corsHeaders,
              'Cache-Control': 'public, max-age=86400' // 缓存 24 小时
            }
          });
        }
      } catch (err) {
        console.warn('Failed to fetch book content from GitHub:', err);
      }

      // 2. 降级：从 KV 中尝试读取
      const kvData = (await env.VOCAB_BOOKS?.get(id)) || (await env.VOCAB_BOOKS?.get(bookPath));
      if (kvData) {
        return new Response(kvData, {
          headers: {
            ...corsHeaders,
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }

      return new Response(JSON.stringify({ error: 'Book not found' }), { status: 404, headers: corsHeaders });
    }

    // 路由 3: 版本与更新日志接口 (优先从 GitHub Releases 获取)
    if (url.pathname === '/api/version') {
      try {
        const ghRes = await fetch('https://api.github.com/repos/chenyurong0806/Recite-words/releases/latest', {
          headers: {
            'User-Agent': 'Recite-Words-Cloudflare-Worker'
          }
        });

        if (ghRes.ok) {
          const ghData = await ghRes.json();
          const tag = (ghData.tag_name || 'v1.8.0').replace(/^v/, '');
          const releaseDate = (ghData.published_at || '').substring(0, 10) || new Date().toISOString().substring(0, 10);
          
          let changelogItems = [];
          if (ghData.body) {
            changelogItems = ghData.body
              .split('\n')
              .map(line => line.trim())
              .filter(line => line && !line.startsWith('#'))
              .map(line => line.replace(/^[-*•\d.]+\s*/, ''));
          }

          let downloadUrl = `https://github.com/chenyurong0806/Recite-words/releases/download/${ghData.tag_name}/index.html`;
          if (Array.isArray(ghData.assets)) {
            const htmlAsset = ghData.assets.find(a => a.name === 'index.html' || a.name.endsWith('.html'));
            if (htmlAsset && htmlAsset.browser_download_url) {
              downloadUrl = htmlAsset.browser_download_url;
            }
          }

          return new Response(JSON.stringify({
            version: tag,
            releaseDate: releaseDate,
            changelog: changelogItems.length > 0 ? changelogItems : [ghData.name || '最新功能发布与稳定性修复'],
            downloadUrl: downloadUrl,
            githubReleaseUrl: ghData.html_url
          }), { headers: corsHeaders });
        }
      } catch (err) {
        console.warn('Failed to fetch from GitHub API:', err);
      }

      // 降级备用数据 (当 GitHub API 超频或故障时)
      const fallbackVersionInfo = {
        version: '1.8.0',
        releaseDate: '2026-09-12',
        changelog: [
          '1. 重构更新日志与版本下载功能，直连 GitHub Releases；',
          '2. 全面优化词组背诵：固定虚词词块直接给出，不占用备选词框；',
          '3. 修复开局残留上局提示框与冷却遮罩的 Bug；',
          '4. Wordle 单词解谜全面支持实体键盘直接输入、退格与提交；',
          '5. 降低人机对决中词组回答速度，按词块数量梯度增加延时；',
          '6. 所有系统“开启/关闭”选项升级为 MD3 原生平滑滑动开关；',
          '7. 远程联机 P2 页面仅展示房主已选定的词书，彻底避免选词不同步；',
          '8. 听音写词模式隐藏音标显示；',
          '9. 优化即时复习机制，多次答错不再在组末重复提问。'
        ],
        downloadUrl: 'https://github.com/chenyurong0806/Recite-words/releases/latest/download/index.html',
        githubReleaseUrl: 'https://github.com/chenyurong0806/Recite-words/releases/latest'
      };
      return new Response(JSON.stringify(fallbackVersionInfo), { headers: corsHeaders });
    }

    // 路由 4: 下载最新版 HTML 文件 (直接重定向至 GitHub Releases 下载)
    if (url.pathname === '/api/download-latest') {
      const targetDownloadUrl = 'https://github.com/chenyurong0806/Recite-words/releases/latest/download/index.html';
      return Response.redirect(targetDownloadUrl, 302);
    }

    return new Response('Not Found', { status: 404 });
  }
};
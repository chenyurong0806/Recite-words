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

    // 路由 1: 获取词书目录
    if (url.pathname === '/api/books') {
      const manifest = await env.VOCAB_BOOKS.get('__book_manifest__');
      return new Response(manifest || '[]', { headers: corsHeaders });
    }

    // 路由 2: 获取单本词书数据 (例如 /api/book?id=cet4)
    if (url.pathname === '/api/book') {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing book id' }), { status: 400, headers: corsHeaders });
      }
      
      const bookData = await env.VOCAB_BOOKS?.get(id);
      if (!bookData) {
        return new Response(JSON.stringify({ error: 'Book not found' }), { status: 404, headers: corsHeaders });
      }

      // 给静态词书添加 24 小时浏览器缓存，加速二次加载
      const responseHeaders = {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=86400'
      };
      return new Response(bookData, { headers: responseHeaders });
    }

    // 路由 3: 版本与更新日志接口
    if (url.pathname === '/api/version') {
      const versionInfo = {
        version: '2.5.0',
        releaseDate: '2026-09-09',
        changelog: [
          '1. 新增 Material Design 3 桌面端左侧导航栏与移动端底部导航栏；',
          '2. 深度重构设置中心：页面尺寸/缩放调节、更新日志常态浏览；',
          '3. 词书管理原生无弹窗嵌入设置子页面，支持分类文件夹与词汇查看；',
          '4. 设置中支持一键快速切换账号与新建账号；',
          '5. 智能版本比对：本地运行提供更新日志与最新版 HTML 快速下载，网页端提示一键刷新；',
          '6. 修复单人专练中词组拼装答对后界面卡死的 Bug，增加平滑自动流转与反馈；',
          '7. 默写模式新增屏幕虚拟键盘，支持在设置中灵活开启/关闭；',
          '8. 联机房间升级：支持自定义房间名称与人数上限、保存自建房间与房主主动删除；',
          '9. 联机大厅增加在线房间列表，房名、房主、人数一览无余，支持一键入局；',
          '10. 首页集成在线用户列表，支持实时发起与接受对局邀请，自动生成双方对决房间；',
          '11. 全面精细适配手机移动端触控交互与 MD3 视觉规范。'
        ],
        downloadUrl: `${url.origin}/api/download-latest`
      };
      return new Response(JSON.stringify(versionInfo), { headers: corsHeaders });
    }

    // 路由 4: 下载最新版 HTML 文件
    if (url.pathname === '/api/download-latest') {
      const storedHtml = await env.VOCAB_BOOKS?.get('__latest_index_html__');
      if (storedHtml) {
        return new Response(storedHtml, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': 'attachment; filename="index.html"',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      return new Response(JSON.stringify({
        message: '可在 Cloudflare 页面或代码库获取最新版 index.html 文件',
        version: '2.5.0'
      }), { headers: corsHeaders });
    }

    return new Response('Not Found', { status: 404 });
  }
};
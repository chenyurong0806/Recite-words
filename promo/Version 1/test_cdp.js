const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.flac': 'audio/flac'
};

const rootDir = path.resolve(__dirname, '..');

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/promo/index.html';
  const filePath = path.join(rootDir, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
  }
});

const PORT = 8095;
server.listen(PORT, async () => {
  console.log(`[Static Server] Listening on http://localhost:${PORT}`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(__dirname, '.edge-temp');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--window-size=1920,1080',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { stdio: 'ignore' });

  // Wait for debug port to be accessible
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const resp = await fetch('http://127.0.0.1:9225/json/list');
      const list = await resp.json();
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        wsUrl = list[0].webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error('Failed to get WebSocket debugger URL from Edge');
    edgeProcess.kill();
    server.close();
    process.exit(1);
  }

  console.log('[CDP] Connected to Edge at:', wsUrl);
  const ws = new WebSocket(wsUrl);

  await new Promise(res => {
    if (ws.readyState === WebSocket.OPEN) res();
    else ws.addEventListener('open', res, { once: true });
  });

  let idCounter = 1;
  const consoleMessages = [];
  const errors = [];

  ws.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        consoleMessages.push(msg.params.args.map(a => a.value || a.description).join(' '));
      } else if (msg.method === 'Runtime.exceptionThrown') {
        errors.push(msg.params.exceptionDetails.text + ': ' + (msg.params.exceptionDetails.exception?.description || ''));
      }
    } catch (e) {}
  });

  function sendCDP(method, params = {}) {
    return new Promise((resolve, reject) => {
      const curId = idCounter++;
      const timeout = setTimeout(() => {
        ws.removeEventListener('message', onMsg);
        reject(new Error(`Timeout waiting for CDP ${method}`));
      }, 5000);

      const onMsg = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.id === curId) {
            clearTimeout(timeout);
            ws.removeEventListener('message', onMsg);
            if (d.error) reject(new Error(d.error.message));
            else resolve(d.result);
          }
        } catch (err) {}
      };

      ws.addEventListener('message', onMsg);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  await sendCDP('Page.enable');
  await sendCDP('Runtime.enable');
  await sendCDP('Console.enable');

  console.log('[CDP] Navigating to promo page...');
  await sendCDP('Page.navigate', { url: `http://localhost:${PORT}/promo/index.html` });

  // Wait for page to settle and load fonts
  await new Promise(r => setTimeout(r, 1200));

  const shotDir = path.join(__dirname, 'shots');
  if (!fs.existsSync(shotDir)) fs.mkdirSync(shotDir, { recursive: true });

  const captureTimestamps = [
    { time: 0, name: 'shot_00_standby' },
    { time: 1.2, name: 'shot_01_flyover' },
    { time: 4.2, name: 'shot_01_intro_title' },
    { time: 9.2, name: 'shot_02_search_tab' },
    { time: 13.6, name: 'shot_02_search_edit' },
    { time: 18.5, name: 'shot_03_remote_invite' },
    { time: 20.8, name: 'shot_03_real_room' },
    { time: 23.2, name: 'shot_03_transition_bridge' },
    { time: 25.8, name: 'shot_03_ai_slider' },
    { time: 27.6, name: 'shot_03_local_neutral' },
    { time: 28.8, name: 'shot_03_tug_red_lead' },
    { time: 30.5, name: 'shot_03_tug_penalty' },
    { time: 33.8, name: 'shot_03_5_book_select' },
    { time: 36.8, name: 'shot_04_recite_typing' },
    { time: 38.6, name: 'shot_04_recite_success' },
    { time: 40.8, name: 'shot_04_ancient_drawer' },
    { time: 43.5, name: 'shot_05_wordle_flip' },
    { time: 47.8, name: 'shot_05_wordle_row2' },
    { time: 49.0, name: 'shot_05_wordle_winner' },
    { time: 53.0, name: 'shot_06_cloud_synced' },
    { time: 55.0, name: 'shot_06_devices_gallery' },
    { time: 61.0, name: 'shot_07_finale' }
  ];

  for (const item of captureTimestamps) {
    process.stdout.write(`[CDP] Capturing ${item.name} (t=${item.time}s)... `);
    await sendCDP('Runtime.evaluate', {
      expression: `window.__seek(${item.time}, true)`
    });
    await new Promise(r => setTimeout(r, 100));

    const shotRes = await sendCDP('Page.captureScreenshot', { format: 'png' });
    if (shotRes && shotRes.data) {
      const filePath = path.join(shotDir, `${item.name}.png`);
      fs.writeFileSync(filePath, Buffer.from(shotRes.data, 'base64'));
      console.log(`OK!`);
    } else {
      console.log(`Failed!`);
    }
  }

  console.log('[CDP] Finished capturing all shots.');
  console.log('[CDP] Console messages:', consoleMessages);
  console.log('[CDP] Errors caught:', errors);

  ws.close();
  edgeProcess.kill();
  server.close();

  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch (e) {}

  process.exit(errors.length > 0 ? 1 : 0);
});


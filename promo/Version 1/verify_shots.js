const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.flac': 'audio/flac'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/promo/index.html';
  const filePath = path.join(__dirname, '..', reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
  }
});

const PORT = 8090;
server.listen(PORT, async () => {
  console.log(`Server listening on http://localhost:${PORT}`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const shotPath = path.join(__dirname, 'shot_standby.png');

  try {
    const cmd = `"${edgePath}" --headless --window-size=1920,1080 --screenshot="${shotPath}" http://localhost:${PORT}/promo/index.html`;
    execSync(cmd, { stdio: 'inherit' });
    console.log('Saved screenshot to:', shotPath);
  } catch (err) {
    console.error('Edge execution error:', err);
  }

  server.close();
  process.exit(0);
});


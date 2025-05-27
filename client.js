#!/usr/bin/env node
const WebSocket = require('ws');
const { exec } = require('child_process');

// Simple arg parser
let port = 5000;
let url = null;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--url' && args[i + 1]) {
    url = args[i + 1];
    i++;
  }
}

// If url is specified, open it in the browser with the port param
if (url) {
  const urlObj = new URL(url);
  urlObj.searchParams.set('port', port);
  const openCmd =
    process.platform === 'darwin'
      ? `open "${urlObj.toString()}"`
      : process.platform === 'win32'
      ? `start "" "${urlObj.toString()}"`
      : `xdg-open "${urlObj.toString()}"`;
  exec(openCmd, (err) => {
    if (err) {
      console.error('Failed to open browser:', err);
    }
  });
}

const wss = new WebSocket.Server({ port });

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
} else {
  console.warn('Warning: Not running in a TTY. Ctrl+C may not work.');
}

process.stdin.on('data', (data) => {
  if (data.toString() === '\u0003') {
    console.log('\nReceived Ctrl+C, exiting...');
    process.exit();
  }
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'stdin', data: data.toString() }));
    }
  });
});

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT (Ctrl+C), exiting...');
  process.exit();
});

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    const { type, data } = JSON.parse(msg);
    if (type === 'stdout') process.stdout.write(data);
    if (type === 'stderr') process.stderr.write(data);
    if (type === 'exit') {
      console.log('Received exit signal from browser. Exiting...');
      process.exit();
    }
  });
});

console.log(`Shellpage client listening on ws://localhost:${port}`);
if (url) {
  console.log(`Opened browser to: ${url}?port=${port}`);
}
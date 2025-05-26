#!/usr/bin/env node
const WebSocket = require('ws');

const port = process.argv[2] ? parseInt(process.argv[2], 10) : 5000;
const wss = new WebSocket.Server({ port });

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
} else {
  console.warn('Warning: Not running in a TTY. Ctrl+C may not work.');
}

// Always listen for Ctrl+C
process.stdin.on('data', (data) => {
  if (data.toString() === '\u0003') {
    console.log('\nReceived Ctrl+C, exiting...');
    process.exit();
  }
  // If a client is connected, forward input
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

console.log(`Inkwell-CLI Ready on Port ${port}\n`);
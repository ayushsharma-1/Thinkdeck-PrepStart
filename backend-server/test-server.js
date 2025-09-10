// Minimal server test
require('dotenv').config();
const express = require('express');
const http = require('http');

console.log('Creating Express app...');
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

console.log('Setting up basic route...');
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Minimal server is running' });
});

console.log(`Starting server on port ${PORT}...`);
server.listen(PORT, () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('Server setup complete, waiting for connections...');

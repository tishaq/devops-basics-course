'use strict';

const http = require('http');
const { handleRequest } = require('./app');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const result = handleRequest(req.url);
  const contentType = result.contentType || 'application/json';
  const body = contentType === 'application/json' ? JSON.stringify(result.body) : result.body;

  res.writeHead(result.status, { 'Content-Type': contentType });
  res.end(body);
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} ${result.status}`);
});

server.listen(PORT, () => {
  console.log(`devops-demo-app listening on port ${PORT}`);
});

// Kubernetes sends SIGTERM before killing a pod; exit cleanly (module 7).
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});

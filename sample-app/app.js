'use strict';

const startTime = Date.now();
let requestCount = 0;

function greet(name) {
  if (!name || typeof name !== 'string') {
    return 'Hello, world!';
  }
  return `Hello, ${name.trim()}!`;
}

function handleRequest(url) {
  requestCount += 1;
  const parsed = new URL(url, 'http://localhost');

  switch (parsed.pathname) {
    case '/':
      return { status: 200, body: { message: greet(parsed.searchParams.get('name')) } };
    case '/health':
      return { status: 200, body: { status: 'ok', uptimeSeconds: Math.floor((Date.now() - startTime) / 1000) } };
    case '/metrics':
      // Plain-text exposition format; Prometheus scrapes this in module 11.
      return {
        status: 200,
        contentType: 'text/plain',
        body: `demo_app_requests_total ${requestCount}\ndemo_app_uptime_seconds ${Math.floor((Date.now() - startTime) / 1000)}\n`
      };
    default:
      return { status: 404, body: { error: 'not found' } };
  }
}

module.exports = { greet, handleRequest };

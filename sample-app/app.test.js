'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { greet, handleRequest } = require('./app');

test('greet returns default greeting without a name', () => {
  assert.strictEqual(greet(), 'Hello, world!');
});

test('greet greets by name', () => {
  assert.strictEqual(greet('Ada'), 'Hello, Ada!');
});

test('greet trims whitespace', () => {
  assert.strictEqual(greet('  Grace  '), 'Hello, Grace!');
});

test('root route returns a greeting', () => {
  const result = handleRequest('/?name=Linus');
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.message, 'Hello, Linus!');
});

test('health route reports ok', () => {
  const result = handleRequest('/health');
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.status, 'ok');
});

test('unknown routes return 404', () => {
  const result = handleRequest('/nope');
  assert.strictEqual(result.status, 404);
});

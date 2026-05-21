import { test } from 'node:test';
import assert from 'node:assert';
import { getCachedData, getIsReady } from './db.js';

test('Initial state of db cache is empty and not ready', () => {
  // Inicialmente el caché debe estar vacío
  assert.deepEqual(getCachedData(), []);
  
  // Inicialmente el estado de inicialización debe ser falso
  assert.strictEqual(getIsReady(), false);
});

import { test } from 'node:test';
import assert from 'node:assert';
import { getCachedData, getIsReady } from './db.js';

test('ID-UT-01: Estado Inicial del Cache DB', () => {
  // Inicialmente el cache debe estar vacio
  assert.deepEqual(getCachedData(), []);
  
  // Inicialmente el estado de inicializacion debe ser falso
  assert.strictEqual(getIsReady(), false);
});

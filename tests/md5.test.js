import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { md5 } from '../src/md5.js';

test('md5 matches RFC1321 known vectors', () => {
  assert.equal(md5(''), 'd41d8cd98f00b204e9800998ecf8427e');
  assert.equal(md5('abc'), '900150983cd24fb0d6963f7d28e17f72');
});

test('md5 matches node:crypto oracle for arbitrary strings', () => {
  const samples = ['hello world', '엔드필드', 'a'.repeat(200), '1756123456,ABC123,someHash'];
  for (const s of samples) {
    const expected = createHash('md5').update(s, 'utf8').digest('hex');
    assert.equal(md5(s), expected, `mismatch for input: ${s}`);
  }
});

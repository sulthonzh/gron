import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { flatten, gron, ungron, tokenize, setPath, grepGron } = require('../index.js');

describe('flatten', () => {
  it('flattens a flat object', () => {
    const result = flatten({ name: 'Alice', age: 30 });
    assert.deepEqual(result, [
      { path: 'json', value: {} },
      { path: 'json.name', value: 'Alice' },
      { path: 'json.age', value: 30 },
    ]);
  });

  it('flattens nested objects', () => {
    const result = flatten({ a: { b: { c: 1 } } });
    assert.equal(result.length, 4);
    assert.equal(result[3].path, 'json.a.b.c');
    assert.equal(result[3].value, 1);
  });

  it('flattens arrays', () => {
    const result = flatten([10, 20]);
    assert.deepEqual(result, [
      { path: 'json', value: [] },
      { path: 'json[0]', value: 10 },
      { path: 'json[1]', value: 20 },
    ]);
  });

  it('handles null', () => {
    const result = flatten(null);
    assert.deepEqual(result, [{ path: 'json', value: null }]);
  });

  it('handles mixed nested structure', () => {
    const result = flatten({ items: [{ id: 1 }, { id: 2 }] });
    const paths = result.map(r => r.path);
    assert.ok(paths.includes('json.items[0].id'));
    assert.ok(paths.includes('json.items[1].id'));
  });

  it('escapes keys with special characters', () => {
    const result = flatten({ 'weird key': 'val' });
    assert.ok(result[1].path.includes('["weird key"]'));
  });

  it('handles booleans and numbers', () => {
    const result = flatten({ flag: true, count: 0, empty: false });
    assert.equal(result[1].value, true);
    assert.equal(result[2].value, 0);
    assert.equal(result[3].value, false);
  });

  it('uses custom prefix', () => {
    const result = flatten({ x: 1 }, 'data');
    assert.equal(result[1].path, 'data.x');
  });
});

describe('gron', () => {
  it('formats flat object', () => {
    const out = gron({ name: 'Bob' });
    assert.equal(out, 'json = {};\njson.name = "Bob";');
  });

  it('formats array', () => {
    const out = gron([1, 2]);
    assert.ok(out.includes('json[0] = 1'));
    assert.ok(out.includes('json[1] = 2'));
  });

  it('formats null value', () => {
    const out = gron(null);
    assert.equal(out, 'json = null;');
  });
});

describe('ungron', () => {
  it('round-trips flat object', () => {
    const text = 'json = {};\njson.name = "Alice";';
    const result = ungron(text);
    assert.deepEqual(result, { name: 'Alice' });
  });

  it('round-trips nested object', () => {
    const original = { a: { b: 1 } };
    const text = gron(original);
    const result = ungron(text);
    assert.deepEqual(result, original);
  });

  it('round-trips array', () => {
    const original = [10, 20, 30];
    const text = gron(original);
    const result = ungron(text);
    assert.deepEqual(result, original);
  });

  it('round-trips mixed structure', () => {
    const original = { users: [{ name: 'A' }, { name: 'B' }], count: 2 };
    const text = gron(original);
    const result = ungron(text);
    assert.deepEqual(result, original);
  });

  it('ignores comments', () => {
    const text = '// comment\njson = {};\njson.x = 1;';
    const result = ungron(text);
    assert.deepEqual(result, { x: 1 });
  });

  it('handles empty input', () => {
    const result = ungron('');
    assert.deepEqual(result, {});
  });
});

describe('tokenize', () => {
  it('tokenizes dot path', () => {
    assert.deepEqual(tokenize('json.a.b'), ['json', 'a', 'b']);
  });

  it('tokenizes bracket path', () => {
    assert.deepEqual(tokenize('json[0]'), ['json', 0]);
  });

  it('tokenizes mixed path', () => {
    assert.deepEqual(tokenize('json.items[0].id'), ['json', 'items', 0, 'id']);
  });

  it('tokenizes quoted key', () => {
    assert.deepEqual(tokenize('json["weird key"]'), ['json', 'weird key']);
  });
});

describe('setPath', () => {
  it('sets a deep value', () => {
    const obj = {};
    setPath(obj, 'json.a.b', 42);
    assert.equal(obj.json.a.b, 42);
  });

  it('creates arrays for numeric keys', () => {
    const obj = {};
    setPath(obj, 'json[0]', 'first');
    assert.equal(obj.json[0], 'first');
  });
});

describe('grepGron', () => {
  it('filters by substring', () => {
    const output = 'json = {};\njson.name = "Alice";\njson.age = 30;';
    const result = grepGron(output, 'name');
    assert.ok(result.includes('name'));
    assert.ok(!result.includes('age'));
  });

  it('filters by regex', () => {
    const output = 'json = {};\njson.city = "NYC";\njson.state = "NY";';
    const result = grepGron(output, 'cit');
    assert.ok(result.includes('city'));
    assert.ok(!result.includes('state'));
  });

  it('returns empty for no match', () => {
    const output = 'json = {};\njson.x = 1;';
    const result = grepGron(output, 'nonexistent');
    assert.equal(result, '');
  });
});

describe('HELP', () => {
  it('CLI help flag works', async () => {
    const { execSync } = await import('child_process');
    const out = execSync('node ' + resolve(__dirname, '..', 'cli.js') + ' --help', { encoding: 'utf8' });
    assert.ok(out.includes('Flatten JSON'));
    assert.ok(out.includes('--unflatten'));
    assert.ok(out.includes('--grep'));
  });
});

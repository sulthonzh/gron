'use strict';

/**
 * gron — Flatten JSON into assignable paths, and unflatten them back.
 *
 * Example:
 *   { "name": "Alice", "address": { "city": "NYC" } }
 *   → json.address.city = "NYC";
 *     json.name = "Alice";
 */

/**
 * Flatten a value into path = value assignments.
 * @param {*} val - The value to flatten.
 * @param {string} [prefix='json'] - Root path prefix.
 * @returns {Array<{path: string, value: *}>}
 */
function flatten(val, prefix = 'json') {
  const results = [];

  if (val === null) {
    results.push({ path: prefix, value: null });
  } else if (Array.isArray(val)) {
    results.push({ path: prefix, value: [] });
    for (let i = 0; i < val.length; i++) {
      results.push(...flatten(val[i], `${prefix}[${i}]`));
    }
  } else if (typeof val === 'object') {
    const keys = Object.keys(val);
    results.push({ path: prefix, value: {} });
    for (const key of keys) {
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`;
      results.push(...flatten(val[key], `${prefix}${safeKey}`));
    }
  } else {
    results.push({ path: prefix, value: val });
  }

  return results;
}

/**
 * Format a single assignment line.
 * @param {{path: string, value: *}} entry
 * @returns {string}
 */
function formatLine(entry) {
  return `${entry.path} = ${JSON.stringify(entry.value)};`;
}

/**
 * Flatten and format a value as gron output.
 * @param {*} val
 * @param {string} [prefix='json']
 * @returns {string}
 */
function gron(val, prefix = 'json') {
  return flatten(val, prefix).map(formatLine).join('\n');
}

/**
 * Parse gron output back into a JSON value.
 * @param {string} text - Gron-formatted text.
 * @returns {*}
 */
function ungron(text) {
  const lines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));

  // Collect all leaf assignments
  const assignments = [];
  for (const line of lines) {
    const match = line.match(/^(\S+(?:\.\w+|\[\d+\]|\["[^"]*"\])*)\s*=\s*(.+);?\s*$/);
    if (!match) continue;
    const path = match[1];
    let value;
    try {
      value = JSON.parse(match[2].replace(/;$/, ''));
    } catch {
      continue;
    }
    // Skip container markers ({} and [])
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0) continue;

    assignments.push({ path, value });
  }

  // Build the object from paths
  const root = {};
  for (const { path, value } of assignments) {
    setPath(root, path, value);
  }

  return root.json !== undefined ? root.json : root;
}

/**
 * Set a value at a dot/bracket path on an object.
 */
function setPath(obj, path, value) {
  const tokens = tokenize(path);
  let current = obj;

  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];
    const nextIsArray = typeof nextToken === 'number';

    if (current[token] === undefined) {
      current[token] = nextIsArray ? [] : {};
    }
    current = current[token];
  }

  const last = tokens[tokens.length - 1];
  current[last] = value;
}

/**
 * Tokenize a path like "json.address.city" or "json[0].name" or 'json["weird key"]'
 */
function tokenize(path) {
  const tokens = [];
  let i = 0;

  while (i < path.length) {
    if (path[i] === '.') {
      i++;
      let start = i;
      while (i < path.length && /[a-zA-Z0-9_$]/.test(path[i])) i++;
      tokens.push(path.slice(start, i));
    } else if (path[i] === '[') {
      i++;
      if (path[i] === '"') {
        i++;
        let start = i;
        while (i < path.length && path[i] !== '"') i++;
        tokens.push(path.slice(start, i));
        i++; // skip closing "
      } else {
        let start = i;
        while (i < path.length && path[i] !== ']') i++;
        const num = Number(path.slice(start, i));
        tokens.push(Number.isInteger(num) ? num : path.slice(start, i));
      }
      i++; // skip ]
    } else {
      // Root identifier (e.g. "json")
      let start = i;
      while (i < path.length && /[a-zA-Z0-9_$]/.test(path[i])) i++;
      tokens.push(path.slice(start, i));
    }
  }

  return tokens;
}

/**
 * Filter gron output by a grep pattern.
 * @param {string} gronOutput
 * @param {string} pattern - Simple substring or regex.
 * @returns {string}
 */
function grepGron(gronOutput, pattern) {
  const re = new RegExp(pattern);
  return gronOutput.split('\n').filter(line => re.test(line)).join('\n');
}

module.exports = { flatten, formatLine, gron, ungron, tokenize, setPath, grepGron };

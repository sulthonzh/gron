#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { gron, ungron, grepGron } = require('./index');

function parseArgs(argv) {
  const args = { _: [], unflatten: false, grep: null, pretty: false, help: false };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--unflatten' || arg === '-u') args.unflatten = true;
    else if (arg === '--grep' || arg === '-g') { args.grep = argv[++i]; }
    else if (arg === '--pretty' || arg === '-p') args.pretty = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--') { args._ = argv.slice(i + 1); break; }
    else args._.push(arg);
  }

  return args;
}

const HELP = `
gron — Flatten JSON for easy grepping

Usage:
  gron <file.json>           Flatten JSON into path assignments
  gron <file.json> -g <pat>  Grep flattened output
  gron -u < assignments.txt  Unflatten gron output back to JSON
  cat file.json | gron -     Read from stdin

Options:
  -u, --unflatten    Reverse: turn gron output back to JSON
  -g, --grep <pat>   Filter flattened lines by pattern
  -p, --pretty       Pretty-print JSON output (for -u)
  -h, --help         Show this help

Examples:
  gron data.json                    # Flatten
  gron data.json -g "address"       # Find address-related paths
  gron data.json -g "\\.city"       # Regex grep
  gron data.json | grep city | gron -u  # Round-trip
`.trim();

function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }

  const input = args._[0];

  if (args.unflatten) {
    // Read gron text from stdin or file
    let text;
    if (input && input !== '-') {
      text = fs.readFileSync(input, 'utf8');
    } else {
      text = fs.readFileSync(0, 'utf8');
    }
    const result = ungron(text);
    console.log(args.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result));
    return;
  }

  // Read JSON
  let jsonText;
  if (input && input !== '-') {
    jsonText = fs.readFileSync(input, 'utf8');
  } else {
    jsonText = fs.readFileSync(0, 'utf8');
  }

  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (e) {
    process.stderr.write(`Error: Invalid JSON — ${e.message}\n`);
    process.exit(1);
  }

  let output = gron(data);

  if (args.grep) {
    output = grepGron(output, args.grep);
  }

  console.log(output);
}

main();

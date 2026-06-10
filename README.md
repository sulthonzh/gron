# gron

Flatten JSON into path assignments so you can grep it. Then unflatten it back.

Inspired by [gron](https://github.com/TomNomNom/gron) but zero dependencies, pure Node.js.

## Why?

JSON is hard to grep. You can't just `grep "city"` a JSON file and know where it lives in the structure. Gron turns JSON into flat path assignments:

```
$ gron data.json
json = {};
json.name = "Alice";
json.address = {};
json.address.city = "NYC";
json.address.zip = 10001;
json.tags = [];
json.tags[0] = "dev";
json.tags[1] = "node";
```

Now you can grep, filter, and pipe:

```
$ gron data.json | grep city
json.address.city = "NYC";
```

And unflatten back to JSON:

```
$ gron data.json | grep city | gron -u
{"address":{"city":"NYC"}}
```

## Install

```bash
npm install -g gron
```

Or just run it directly:

```bash
npx gron data.json
```

## Usage

```
gron <file.json>           Flatten JSON into path assignments
gron <file.json> -g <pat>  Filter flattened lines by pattern
gron -u < assignments.txt  Unflatten gron output back to JSON
cat file.json | gron -     Read from stdin
```

### Options

- `-u, --unflatten` — Reverse: turn gron output back to JSON
- `-g, --grep <pattern>` — Filter flattened lines (regex supported)
- `-p, --pretty` — Pretty-print JSON output (with `-u`)
- `-h, --help` — Show help

### Examples

```bash
# Flatten a file
gron package.json

# Find all version fields
gron package.json -g "version"

# Round-trip: flatten → grep → unflatten
gron data.json | grep "\.url" | gron -u -p

# From stdin
curl -s https://api.github.com/users/octocat | gron -

# Pretty unflatten
gron data.json -g "name" | gron -u -p
```

## API

```javascript
const { gron, ungron, flatten, grepGron } = require('gron');

// Flatten to string
const output = gron({ name: 'Alice', address: { city: 'NYC' } });
// json = {};
// json.name = "Alice";
// json.address = {};
// json.address.city = "NYC";

// Unflatten back
const data = ungron(output);
// { name: 'Alice', address: { city: 'NYC' } }

// Get structured flat entries
const entries = flatten(data);
// [{ path: 'json', value: {} }, { path: 'json.name', value: 'Alice' }, ...]

// Grep gron output
const filtered = grepGron(output, 'city');
```

## License

MIT

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const [file, ...argumentsAfterFile] = process.argv.slice(2);
const usage = "Usage: node extract-slices.mjs <bundle.js> <marker|start:end|--info|--functions> [...] [--context=1200] [--limit=12]";

if (!file || argumentsAfterFile.length === 0) {
  console.error(usage);
  process.exit(1);
}

let context = 1200;
let limit = 12;
const queries = [];
for (const argument of argumentsAfterFile) {
  const option = /^--(context|limit)=(\d+)$/.exec(argument);
  if (option) {
    const value = Number(option[2]);
    if (!Number.isSafeInteger(value) || value < 1 || value > (option[1] === "context" ? 50000 : 10000)) {
      console.error(`Invalid option: ${argument}`);
      process.exit(1);
    }
    if (option[1] === "context") context = value;
    else limit = value;
  } else if (argument === "" || (argument.startsWith("--") && !["--info", "--functions"].includes(argument))) {
    console.error(`Empty query or unknown option: ${argument}`);
    process.exit(1);
  } else {
    queries.push(argument);
  }
}
if (!queries.length) {
  console.error(usage);
  process.exit(1);
}

let bytes;
try {
  bytes = readFileSync(file);
} catch (error) {
  console.error(`Cannot read source: ${error.message}`);
  process.exit(1);
}
const source = bytes.toString("utf8");

for (const query of queries) {
  if (query === "--info") {
    console.log(JSON.stringify({
      file,
      bytes: bytes.length,
      utf16Length: source.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      offsetUnit: "UTF-16 code units; range start inclusive, end exclusive"
    }, null, 2));
    continue;
  }
  if (query === "--functions") {
    console.log("Candidate named function declarations (text search, not a JavaScript parser):");
    let count = 0;
    for (const match of source.matchAll(/function ([A-Za-z_$][A-Za-z0-9_$]*)\(/g)) {
      if (count >= limit) { console.log(`Output capped at ${limit}; increase --limit if needed.`); break; }
      console.log(`${match.index}\t${match[1]}`);
      count += 1;
    }
    continue;
  }

  const range = /^(\d+):(\d+)$/.exec(query);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end <= start || end > source.length) {
      console.error(`Invalid range: ${query}; source length is ${source.length} UTF-16 code units.`);
      process.exitCode = 1;
      continue;
    }
    console.log(`===== UTF-16 range ${start}:${end} =====`);
    console.log(source.slice(start, end));
    continue;
  }

  let cursor = 0;
  let count = 0;
  while (true) {
    const offset = source.indexOf(query, cursor);
    if (offset === -1) break;
    if (count >= limit) { console.log(`Output capped at ${limit}; increase --limit if needed.`); break; }
    count += 1;
    console.log(`\n===== ${query} @ ${offset} =====\n`);
    console.log(source.slice(Math.max(0, offset - context), Math.min(source.length, offset + query.length + context)));
    cursor = offset + query.length;
  }
  if (!count) {
    console.log(`No match: ${query}`);
    if (!process.exitCode) process.exitCode = 2;
  }
}

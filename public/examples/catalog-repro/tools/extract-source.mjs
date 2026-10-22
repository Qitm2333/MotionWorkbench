import { readFileSync } from "node:fs";

const [file, ...needles] = process.argv.slice(2);

if (!file || needles.length === 0) {
  console.error("Usage: node extract-source.mjs <file> <needle|start:end|--functions> [...]");
  process.exit(1);
}

const source = readFileSync(file, "utf8");

for (const needle of needles) {
  if (needle === "--functions") {
    for (const match of source.matchAll(/function (e[A-Za-z0-9_$]+)\(/g)) {
      console.log(`${match.index}\t${match[1]}`);
    }
    continue;
  }

  const range = /^(\d+):(\d+)$/.exec(needle);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    console.log(`\n===== bytes ${start}:${end} =====\n`);
    console.log(source.slice(start, end));
    continue;
  }

  let from = 0;
  let match = 0;

  while (true) {
    const index = source.indexOf(needle, from);
    if (index === -1) break;
    match += 1;
    const start = Math.max(0, index - 240);
    const end = Math.min(source.length, index + needle.length + 2800);
    console.log(`\n===== ${needle} #${match} @ ${index} =====\n`);
    console.log(source.slice(start, end));
    from = index + needle.length;
  }

  if (match === 0) console.log(`\n===== ${needle}: no match =====`);
}

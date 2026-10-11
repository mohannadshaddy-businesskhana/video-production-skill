// A time on the cut (what the presenter quotes from a review) back to the raw take, where edit.json lives.
// Usage: node to_raw.mjs <work dir> <cut seconds> [...]
import { readFileSync } from "node:fs";
import { join } from "node:path";

const [dir, ...times] = process.argv.slice(2);
const runs = JSON.parse(readFileSync(join(dir, "cuts.json"), "utf8")).list
  .map((c) => [c.t, c.t + c.ms / 1000]).sort((a, b) => a[0] - b[0]);
for (const out of times.map(Number)) {
  let raw = out;
  for (const [a, b] of runs) if (a <= raw) raw += b - a; else break;
  console.log(`${out} → raw ${raw.toFixed(2)}`);
}

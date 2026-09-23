/* Resolve Playwright from the PROJECT, not from the skill directory.
 *
 * A skill lives in ~/.claude/skills/ and has no node_modules. A bare
 * `import { chromium } from "@playwright/test"` resolves relative to the
 * importing file, so it works while the script sits inside a project and breaks
 * the moment the script is installed anywhere else — which is every install
 * from a package or a repo.
 *
 * Resolve against the working directory first, then fall back to whatever is
 * reachable from here, and fail with an instruction rather than a stack trace.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const CANDIDATES = ["@playwright/test", "playwright", "playwright-core"];

export async function getChromium() {
  const fromProject = createRequire(pathToFileURL(join(process.cwd(), "noop.js")).href);

  // These packages are CommonJS. import() of a CJS file exposes module.exports
  // as `default`, and only exposes named bindings the lexer managed to detect —
  // so `mod.chromium` alone silently misses on some versions.
  const pick = (mod) => mod?.chromium || mod?.default?.chromium;

  for (const name of CANDIDATES) {
    try {
      const got = pick(await import(pathToFileURL(fromProject.resolve(name)).href));
      if (got) return got;
    } catch { /* try the next one */ }
  }
  for (const name of CANDIDATES) {
    try {
      const got = pick(await import(name));
      if (got) return got;
    } catch { /* try the next one */ }
  }

  throw new Error(
    "Playwright is not installed where this can reach it.\n" +
    "  Run from the project directory, and install it there:\n" +
    "    npm i -D @playwright/test && npx playwright install chromium\n" +
    "  Tried: " + CANDIDATES.join(", ") + "\n" +
    "  Working directory: " + process.cwd());
}

// Generates the derived M0 lab inputs: the long O-SLOW objective and the variable files.
// Usage: node m0-lab/gen-fixtures.mjs [labOrigin]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const origin = process.argv[2] ?? "http://localhost:4310";
mkdirSync(join(here, "objectives"), { recursive: true });
mkdirSync(join(here, "vars"), { recursive: true });

const slow = [
  "Open {{preview_url}}",
  "This is an automated form check that uses synthetic data. Do not submit the form.",
];
for (let n = 1; n <= 30; n += 1) {
  slow.push(`In the field labeled "Full name (required)", clear any existing text and type exactly "Test ${n}".`);
}
slow.push('Finally verify that the field labeled "Full name (required)" contains "Test 30".');
writeFileSync(join(here, "objectives", "O-SLOW.txt"), slow.join("\n") + "\n");

const variants = {
  "lab-local": "/lab.html",
  "lab-gt": "/lab.html?bug=gt",
  "lab-comma": "/lab.html?bug=comma",
  "lab-reqoff": "/lab.html?bug=reqoff",
  "lab-multi": "/lab.html?multi=1",
  "lab-leakB": "/lab.html?multi=1&bug=leakB",
  "lab-15": "/lab.html?fields=15",
};
for (const [name, path] of Object.entries(variants)) {
  const body = { preview_url: { value: origin + path, secret: true } };
  writeFileSync(join(here, "vars", `${name}.json`), JSON.stringify(body, null, 2) + "\n");
}
console.log(`wrote O-SLOW.txt and ${Object.keys(variants).length} variable files for ${origin}`);

import { hash } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const target = resolve(process.cwd(), ".env.local");
const force = process.argv.includes("--force");
const email = "preview@buildinbyte.test";
const password = "BuildInByte-Preview#2026";

if (existsSync(target) && !force) {
  console.log(".env.local already exists. Nothing was changed.");
  console.log("Run `npm run preview:setup -- --force` only if you want to replace it with local preview settings.");
  process.exit(0);
}

const passwordHash = await hash(password, {
  algorithm: 2,
  memoryCost: 19456,
  timeCost: 3,
  parallelism: 1,
  outputLen: 32,
});

const content = [
  "# Local-only synthetic dashboard preview. This file is ignored by Git.",
  "DASHBOARD_PREVIEW_MODE=true",
  `DASHBOARD_PREVIEW_EMAIL=${email}`,
  `DASHBOARD_PREVIEW_PASSWORD_HASH=${passwordHash}`,
  `DASHBOARD_PREVIEW_SESSION_SECRET=${randomBytes(48).toString("base64url")}`,
  "",
].join("\n");

await writeFile(target, content, { encoding: "utf8", mode: 0o600 });
console.log("Local preview is ready at http://localhost:8102 after `npm run dev`.");
console.log(`Email: ${email}`);
console.log(`Password: ${password}`);

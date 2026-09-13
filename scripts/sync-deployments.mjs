// Copyright 2026 The Astrolabe Authors. Apache-2.0.
//
// Refetch the deployment truth from astrolabe-contracts and vendor it into
// src/deployments.json. Run this after the contracts repository publishes a new
// deployment. No consumer should ever hardcode a contract id.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SOURCE =
  process.env.DEPLOYMENTS_URL ??
  "https://raw.githubusercontent.com/soroban-dev-tools/astrolabe-contracts/main/deployments/testnet.json";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "src", "deployments.json");

const res = await fetch(SOURCE);
if (!res.ok) {
  console.error(`failed to fetch ${SOURCE}: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const json = await res.json();
await writeFile(out, JSON.stringify(json, null, 2) + "\n");
console.log(`wrote ${out} from ${SOURCE}`);

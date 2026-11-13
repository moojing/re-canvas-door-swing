import { writeFileSync } from "node:fs";
import { collectTimeline } from "./timeline.ts";
const [sourceRoot, output] = process.argv.slice(2);
if (!sourceRoot || !output) throw new Error("Expected immutable source root and staging JSON path");
writeFileSync(output, JSON.stringify(await collectTimeline(sourceRoot), null, 2) + "\n");

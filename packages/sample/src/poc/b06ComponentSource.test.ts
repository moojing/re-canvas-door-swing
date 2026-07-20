import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SOURCE = readFileSync(
  fileURLToPath(new URL("./HeavyWaterDoubleDoorB06.tsx", import.meta.url)),
  "utf-8",
);

test("B06 keeps independent animated refs for both valve wheels", () => {
  assert.match(SOURCE, /import\s+\{\s*type RefObject,/);
  assert.match(SOURCE, /const leftWheelRef = useRef<THREE\.Group>\(null\);/);
  assert.match(SOURCE, /const rightWheelRef = useRef<THREE\.Group>\(null\);/);
  assert.match(
    SOURCE,
    /if \(leftWheelRef\.current\) leftWheelRef\.current\.rotation\.z = motion\.wheelAngle;/,
  );
  assert.match(
    SOURCE,
    /if \(rightWheelRef\.current\) rightWheelRef\.current\.rotation\.z = motion\.wheelAngle;/,
  );
  assert.match(SOURCE, /wheelRef=\{leftWheelRef\}/);
  assert.match(SOURCE, /wheelRef=\{rightWheelRef\}/);
  assert.doesNotMatch(SOURCE, /const wheelRef = useRef<THREE\.Group>\(null\);/);
});

test("B06 keeps playback controls and variant loading wired to component state", () => {
  assert.match(SOURCE, /const \[progress, setProgress\] = useState\(0\);/);
  assert.match(SOURCE, /onClick=\{play\}/);
  assert.match(SOURCE, /stopPlayback\(\);\s*setProgress\(0\);/s);
  assert.match(SOURCE, /aria-label="動畫進度"/);
  assert.match(SOURCE, /onChange=\{\(event\) => \{/);
  assert.match(SOURCE, /setVariant\(option\)/);
  assert.match(SOURCE, /startB06FrontLoad\(/);
  assert.match(SOURCE, /resolveB06FrontUrl\(import\.meta\.env\.BASE_URL, variant\)/);
  assert.match(SOURCE, /\}, \[variant\]\);/);
});

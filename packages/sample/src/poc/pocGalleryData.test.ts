import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  POC_GALLERY_ITEMS,
  resolvePocThumbnailUrl,
} from "./pocGalleryData.ts";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const THUMBNAIL_DIRECTORY = fileURLToPath(
  new URL("../../public/poc-thumbnails/", import.meta.url),
);
const EXPECTED_THUMBNAIL_FILENAMES = [
  "a11.png",
  "b05.png",
  "b06.png",
  "b10.png",
  "c03.png",
];

const EXPECTED_ITEMS = [
  {
    id: "A11",
    title: "Heavy Water Door",
    description:
      "Primitive relief geometry with a procedural heavy-metal finish.",
    route: "/poc/a11",
    thumbnailPath: "poc-thumbnails/a11.png",
    sha256: "8c1eca6248225dc2762b3efe6c803892fa3ef871e64826441f5fee200ece01f4",
  },
  {
    id: "B10",
    title: "Sewer Gate",
    description:
      "Extruded interlocking teeth with opposing vertical motion.",
    route: "/poc/b10",
    thumbnailPath: "poc-thumbnails/b10.png",
    sha256: "409be1a376ee70e99e202fca64584e5809d899c6ca763603e104581e86b06365",
  },
  {
    id: "C03",
    title: "Lift Platform",
    description: "Primitive lift platform with procedural rust and mesh.",
    route: "/poc/c03",
    thumbnailPath: "poc-thumbnails/c03.png",
    sha256: "1c158a398bcc0fc0ac70f203d6faba6ac0e6d9cdb12dd027d167a7b05f44fb56",
  },
  {
    id: "B05",
    title: "Arched Double Gate",
    description:
      "Generated arched iron leaves with mirrored inward swing.",
    route: "/poc/b05",
    thumbnailPath: "poc-thumbnails/b05.png",
    sha256: "77c7e2262f25206d6b0182d8c2bf451b494baf3ee2743da2bbae6dd0e143ef31",
  },
  {
    id: "B06",
    title: "Heavy Water Double Door",
    description:
      "Generated Normal and Frozen leaves with valve-first motion.",
    route: "/poc/b06",
    thumbnailPath: "poc-thumbnails/b06.png",
    sha256: "853f5ef4d458c099d8e49cbd6166692329f2d249c9bf374ad4c586cd097abc0c",
  },
] as const;

test("gallery registry contains the exact canonical records in order", () => {
  assert.equal(POC_GALLERY_ITEMS.length, 5);
  assert.deepEqual(POC_GALLERY_ITEMS, EXPECTED_ITEMS);
});

test("gallery registry and every record are immutable", () => {
  assert.equal(Object.isFrozen(POC_GALLERY_ITEMS), true);
  for (const item of POC_GALLERY_ITEMS) {
    assert.equal(Object.isFrozen(item), true, item.id);
  }
});

test("gallery registry contains lowercase SHA-256 hashes", () => {
  for (const item of POC_GALLERY_ITEMS) {
    assert.match(item.sha256 ?? "", /^[a-f0-9]{64}$/, item.id);
  }
});

test("thumbnail directory contains exactly the canonical PNG files", () => {
  assert.deepEqual(
    readdirSync(THUMBNAIL_DIRECTORY).sort(),
    EXPECTED_THUMBNAIL_FILENAMES,
  );
});

for (const item of POC_GALLERY_ITEMS) {
  test(`${item.id} thumbnail is a canonical 960x540 PNG`, () => {
    const filename = item.thumbnailPath.split("/").at(-1);
    assert.ok(filename, `${item.id} thumbnail filename`);

    const contents = readFileSync(`${THUMBNAIL_DIRECTORY}${filename}`);
    assert.deepEqual(contents.subarray(0, 8), PNG_SIGNATURE, item.id);
    assert.equal(contents.subarray(12, 16).toString("ascii"), "IHDR", item.id);
    assert.equal(contents.readUInt32BE(16), 960, `${item.id} width`);
    assert.equal(contents.readUInt32BE(20), 540, `${item.id} height`);
    assert.ok(
      contents[25] === 2 || contents[25] === 6,
      `${item.id} color type must be RGB or RGBA`,
    );
    assert.equal(
      createHash("sha256").update(contents).digest("hex"),
      item.sha256,
      `${item.id} SHA-256`,
    );
  });
}

test("gallery identities, routes, and thumbnails are unique and local", () => {
  const ids = POC_GALLERY_ITEMS.map(({ id }) => id);
  const routes = POC_GALLERY_ITEMS.map(({ route }) => route);
  const thumbnailPaths = POC_GALLERY_ITEMS.map(
    ({ thumbnailPath }) => thumbnailPath,
  );

  assert.equal(new Set(ids).size, POC_GALLERY_ITEMS.length);
  assert.equal(new Set(routes).size, POC_GALLERY_ITEMS.length);
  assert.equal(new Set(thumbnailPaths).size, POC_GALLERY_ITEMS.length);
  assert.ok(routes.every((route) => route.startsWith("/poc/")));
  assert.ok(routes.every((route) => !route.startsWith("//")));
  assert.ok(thumbnailPaths.every((thumbnailPath) => !thumbnailPath.startsWith("/")));
});

test("thumbnail URLs resolve against local Vite base paths", () => {
  assert.equal(
    resolvePocThumbnailUrl("/", "poc-thumbnails/a11.png"),
    "/poc-thumbnails/a11.png",
  );
  assert.equal(
    resolvePocThumbnailUrl(
      "/re-canvas-door-swing/",
      "poc-thumbnails/a11.png",
    ),
    "/re-canvas-door-swing/poc-thumbnails/a11.png",
  );
});

test("thumbnail URL resolution removes duplicate boundary slashes", () => {
  const resolved = resolvePocThumbnailUrl(
    "///re-canvas-door-swing///",
    "///poc-thumbnails/a11.png",
  );

  assert.equal(resolved, "/re-canvas-door-swing/poc-thumbnails/a11.png");
  assert.equal(resolved.startsWith("//"), false);
});

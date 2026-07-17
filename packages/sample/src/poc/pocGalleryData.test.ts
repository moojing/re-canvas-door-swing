import assert from "node:assert/strict";
import test from "node:test";
import {
  POC_GALLERY_ITEMS,
  resolvePocThumbnailUrl,
} from "./pocGalleryData.ts";

const EXPECTED_ITEMS = [
  {
    id: "A11",
    title: "Heavy Water Door",
    description:
      "Primitive relief geometry with a procedural heavy-metal finish.",
    route: "/poc/a11",
    thumbnailPath: "poc-thumbnails/a11.png",
    sha256: null,
  },
  {
    id: "B10",
    title: "Sewer Gate",
    description:
      "Extruded interlocking teeth with opposing vertical motion.",
    route: "/poc/b10",
    thumbnailPath: "poc-thumbnails/b10.png",
    sha256: null,
  },
  {
    id: "C03",
    title: "Lift Platform",
    description: "Primitive lift platform with procedural rust and mesh.",
    route: "/poc/c03",
    thumbnailPath: "poc-thumbnails/c03.png",
    sha256: null,
  },
  {
    id: "B05",
    title: "Arched Double Gate",
    description:
      "Generated arched iron leaves with mirrored inward swing.",
    route: "/poc/b05",
    thumbnailPath: "poc-thumbnails/b05.png",
    sha256: null,
  },
  {
    id: "B06",
    title: "Heavy Water Double Door",
    description:
      "Generated Normal and Frozen leaves with valve-first motion.",
    route: "/poc/b06",
    thumbnailPath: "poc-thumbnails/b06.png",
    sha256: null,
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

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";
import {
  POC_GALLERY_ITEMS,
  resolvePocThumbnailUrl,
} from "./pocGalleryData.ts";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const THUMBNAIL_DIRECTORY = fileURLToPath(
  new URL("../../public/poc-thumbnails/", import.meta.url),
);
const EXPECTED_THUMBNAIL_FILENAMES = [
  "a04.png",
  "a11.png",
  "b05.png",
  "b06.png",
  "b10.png",
  "c03.png",
  "c06.png",
];

const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return crc >>> 0;
});

const crc32 = (contents: Buffer): number => {
  let crc = 0xffffffff;
  for (const byte of contents) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const assertValidPng = (contents: Buffer, label: string): void => {
  assert.ok(
    contents.length >= PNG_SIGNATURE.length,
    `${label} truncated PNG signature`,
  );
  assert.deepEqual(contents.subarray(0, 8), PNG_SIGNATURE, label);

  let offset = PNG_SIGNATURE.length;
  let chunkIndex = 0;
  let ihdrCount = 0;
  let iendCount = 0;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idatPayloads: Buffer[] = [];

  while (offset < contents.length) {
    assert.ok(
      contents.length - offset >= 12,
      `${label} truncated chunk header`,
    );

    const length = contents.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const type = contents.subarray(typeStart, dataStart).toString("ascii");
    assert.ok(
      length <= contents.length - dataStart - 4,
      `${label} truncated ${type} chunk`,
    );

    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    const data = contents.subarray(dataStart, dataEnd);

    if (chunkIndex === 0) {
      assert.equal(type, "IHDR", `${label} first chunk must be IHDR`);
    }

    if (type === "IHDR") {
      ihdrCount += 1;
      assert.equal(ihdrCount, 1, `${label} must contain exactly one IHDR`);
      assert.equal(chunkIndex, 0, `${label} IHDR must be first`);
      assert.equal(length, 13, `${label} IHDR length`);
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(width, 960, `${label} width`);
      assert.equal(height, 540, `${label} height`);
      assert.equal(data[8], 8, `${label} bit depth`);
      assert.ok(
        data[9] === 2 || data[9] === 6,
        `${label} color type must be RGB or RGBA`,
      );
      channels = data[9] === 2 ? 3 : 4;
      assert.equal(data[10], 0, `${label} compression method`);
      assert.equal(data[11], 0, `${label} filter method`);
      assert.equal(data[12], 0, `${label} interlace method`);
    }

    assert.equal(
      contents.readUInt32BE(dataEnd),
      crc32(contents.subarray(typeStart, dataEnd)),
      `${label} ${type} CRC`,
    );

    if (type === "IDAT") {
      idatPayloads.push(data);
    }

    if (type === "IEND") {
      iendCount += 1;
      assert.equal(iendCount, 1, `${label} must contain exactly one IEND`);
      assert.equal(length, 0, `${label} IEND length`);
      assert.equal(
        chunkEnd,
        contents.length,
        `${label} trailing bytes after IEND`,
      );
    }

    offset = chunkEnd;
    chunkIndex += 1;
  }

  assert.equal(ihdrCount, 1, `${label} must contain exactly one IHDR`);
  assert.ok(idatPayloads.length > 0, `${label} must contain at least one IDAT`);
  assert.equal(iendCount, 1, `${label} must contain exactly one IEND`);

  let inflated: Buffer;
  try {
    inflated = inflateSync(Buffer.concat(idatPayloads));
  } catch {
    assert.fail(`${label} IDAT payloads must contain valid zlib data`);
  }

  const scanlineLength = 1 + width * channels;
  assert.equal(
    inflated.length,
    height * scanlineLength,
    `${label} inflated image data length`,
  );
  for (let row = 0; row < height; row += 1) {
    assert.ok(
      inflated[row * scanlineLength] <= 4,
      `${label} scanline ${row} filter byte must be 0..4`,
    );
  }
};

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
  {
    id: "A04",
    title: "Aged Grille Gate",
    description:
      "Original aged gate materials with an inward hinged opening.",
    route: "/poc/a04",
    thumbnailPath: "poc-thumbnails/a04.png",
    sha256: "cdbcf6207b93b7ee8f38e94b3f8f4a5dbba04c8faf525914353a5f86c5c63e14",
  },
  {
    id: "C06",
    title: "Drilled Wall Opening",
    description: "Textured brick wall breached by a camera pass-through.",
    route: "/poc/c06",
    thumbnailPath: "poc-thumbnails/c06.png",
    sha256: "f26db47c5dae97493c33a3719f76ec95489c5954408a49faddc5fee463c1378f",
  },
] as const;

test("gallery registry contains the exact canonical records in order", () => {
  assert.equal(POC_GALLERY_ITEMS.length, 7);
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
    assertValidPng(contents, item.id);
    assert.equal(
      createHash("sha256").update(contents).digest("hex"),
      item.sha256,
      `${item.id} SHA-256`,
    );
  });
}

const readCanonicalPng = (): Buffer =>
  readFileSync(`${THUMBNAIL_DIRECTORY}a11.png`);

const encodePngChunk = (type: string, data: Buffer): Buffer => {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  return chunk;
};

const replaceIdatPayloads = (png: Buffer, rawImageData: Buffer): Buffer => {
  const parts = [png.subarray(0, PNG_SIGNATURE.length)];
  let offset = PNG_SIGNATURE.length;
  let replaced = false;

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const chunkEnd = offset + 12 + length;

    if (type === "IDAT") {
      if (!replaced) {
        parts.push(encodePngChunk("IDAT", deflateSync(rawImageData)));
        replaced = true;
      }
    } else {
      parts.push(png.subarray(offset, chunkEnd));
    }
    offset = chunkEnd;
  }

  assert.equal(replaced, true, "fixture source must contain IDAT");
  return Buffer.concat(parts);
};

test("PNG validation rejects a malformed IHDR length", () => {
  const malformed = Buffer.from(readCanonicalPng());
  malformed.writeUInt32BE(12, PNG_SIGNATURE.length);

  assert.throws(() => assertValidPng(malformed, "malformed"), /IHDR length/);
});

test("PNG validation rejects a truncated terminal chunk", () => {
  const canonical = readCanonicalPng();
  const truncated = canonical.subarray(0, canonical.length - 1);

  assert.throws(() => assertValidPng(truncated, "truncated"), /truncated/);
});

test("PNG validation rejects a corrupted chunk CRC", () => {
  const corrupted = Buffer.from(readCanonicalPng());
  const idatTypeOffset = corrupted.indexOf("IDAT", PNG_SIGNATURE.length, "ascii");
  assert.notEqual(idatTypeOffset, -1);
  corrupted[idatTypeOffset + 4] ^= 1;

  assert.throws(() => assertValidPng(corrupted, "corrupted"), /IDAT CRC/);
});

test("PNG validation rejects bytes after the terminal IEND", () => {
  const withTrailingByte = Buffer.concat([readCanonicalPng(), Buffer.from([0])]);

  assert.throws(
    () => assertValidPng(withTrailingByte, "trailing"),
    /trailing bytes/,
  );
});

test("PNG validation rejects valid zlib data with undersized scanlines", () => {
  const undersized = replaceIdatPayloads(readCanonicalPng(), Buffer.from([0]));

  assert.throws(
    () => assertValidPng(undersized, "undersized"),
    /inflated image data length/,
  );
});

test("PNG validation rejects an out-of-range scanline filter byte", () => {
  const canonical = readCanonicalPng();
  const channels = canonical[25] === 2 ? 3 : 4;
  const rawImageData = Buffer.alloc(540 * (1 + 960 * channels));
  rawImageData[0] = 5;
  const invalidFilter = replaceIdatPayloads(canonical, rawImageData);

  assert.throws(
    () => assertValidPng(invalidFilter, "invalid filter"),
    /scanline 0 filter byte/,
  );
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

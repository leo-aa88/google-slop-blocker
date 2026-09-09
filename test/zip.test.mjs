import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { zipDir } from "../scripts/lib/zip.mjs";

/*
 * Minimal reader: walk the central directory and inflate each entry, which
 * also exercises our writer's offsets and compressed payloads.
 */
function readZip(buf) {
  const eocd = buf.length - 22; // no archive comment
  assert.equal(buf.readUInt32LE(eocd), 0x06054b50, "EOCD signature");
  const count = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);

  const files = {};
  for (let i = 0; i < count; i++) {
    assert.equal(buf.readUInt32LE(ptr), 0x02014b50, "central dir signature");
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOff = buf.readUInt32LE(ptr + 42);
    const name = buf.toString("utf8", ptr + 46, ptr + 46 + nameLen);

    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const comp = buf.subarray(dataStart, dataStart + compSize);
    files[name] = inflateRawSync(comp).toString("utf8");

    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

test("zipDir round-trips files with nested paths", () => {
  const dir = mkdtempSync(join(tmpdir(), "gsb-zip-"));
  mkdirSync(join(dir, "sub"));
  writeFileSync(join(dir, "a.txt"), "hello");
  writeFileSync(join(dir, "sub", "b.txt"), "world".repeat(50));

  const zipPath = join(dir, "..", `gsb-${Date.now()}.zip`);
  zipDir(dir, zipPath);

  const files = readZip(readFileSync(zipPath));
  assert.equal(files["a.txt"], "hello");
  assert.equal(files["sub/b.txt"], "world".repeat(50));
  // Forward slashes only, no leading directory.
  assert.ok(Object.keys(files).every((n) => !n.includes("\\")));
  assert.ok(Object.keys(files).every((n) => !n.startsWith("/")));
});

test("zipDir produces a valid end-of-central-directory record", () => {
  const dir = mkdtempSync(join(tmpdir(), "gsb-zip-"));
  writeFileSync(join(dir, "only.txt"), "x");
  const zipPath = join(dir, "..", `gsb-one-${Date.now()}.zip`);
  zipDir(dir, zipPath);

  const buf = readFileSync(zipPath);
  assert.equal(buf.readUInt32LE(buf.length - 22), 0x06054b50);
  assert.equal(buf.readUInt16LE(buf.length - 22 + 10), 1); // one entry
});

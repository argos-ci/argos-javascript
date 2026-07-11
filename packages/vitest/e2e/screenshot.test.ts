import { beforeEach, expect, test } from "vitest";
import { server } from "vitest/browser";
import { argosScreenshot, argosSnapshot } from "@argos-ci/vitest";
import type { ArgosAttachment } from "@argos-ci/playwright";

/**
 * These tests run in a real browser (Vitest browser mode + Playwright) and
 * exercise the full screenshot flow: reset the tester scale, resize the iframe,
 * capture the frame body via `@argos-ci/playwright`, and write the screenshots
 * to `./screenshots`. When `UPLOAD_TO_ARGOS=true`, the reporter uploads them.
 *
 * Files written by the node side are read back through Vitest's built-in
 * `readFile` browser command so we can assert their content.
 */

function mount(html: string) {
  document.body.innerHTML = html;
}

function findMetadata(attachments: ArgosAttachment[]) {
  return attachments.find((a) => a.path.endsWith(".png.argos.json"));
}

async function readMetadata(attachments: ArgosAttachment[]) {
  const metadata = findMetadata(attachments);
  if (!metadata) {
    throw new Error("No screenshot metadata attachment found");
  }
  return JSON.parse(await server.commands.readFile(metadata.path));
}

/** Decode a PNG's pixel width from its IHDR chunk (big-endian uint32 @ byte 16). */
async function readPngWidth(attachment: ArgosAttachment) {
  const bin = await server.commands.readFile(attachment.path, "latin1");
  return (
    (bin.charCodeAt(16) << 24) |
    (bin.charCodeAt(17) << 16) |
    (bin.charCodeAt(18) << 8) |
    bin.charCodeAt(19)
  );
}

beforeEach(() => {
  document.body.innerHTML = "";
  document.body.style.margin = "0";
});

test("captures a rendered element with the Argos Vitest SDK metadata", async () => {
  mount(
    `<div style="padding:40px;background:#0ea5e9;color:#fff;font:700 32px sans-serif;">Hello Argos</div>`,
  );
  const attachments = await argosScreenshot("hello");
  // One screenshot + its metadata attachment.
  expect(attachments.length).toBe(2);

  // The whole point of the package: the screenshot is attributed to this SDK
  // and to the Playwright provider (proves setMetadataConfig propagated).
  const metadata = await readMetadata(attachments);
  expect(metadata.sdk.name).toBe("@argos-ci/vitest");
  expect(metadata.automationLibrary.name).toBe("@vitest/browser-playwright");
});

test("attaches the Vitest test metadata to the screenshot", async () => {
  mount(`<div style="padding:20px">Metadata</div>`);
  const attachments = await argosScreenshot("with-metadata");
  const metadata = await readMetadata(attachments);

  // Test metadata (injected from the Vitest test context, since Playwright's
  // own testInfo is absent in a Vitest run).
  expect(metadata.test.id).toBeTruthy();
  expect(metadata.test.title).toBe(
    "attaches the Vitest test metadata to the screenshot",
  );
  expect(metadata.test.titlePath).toEqual([
    "e2e/screenshot.test.ts",
    "attaches the Vitest test metadata to the screenshot",
  ]);
  // `location.file` is resolved relative to the git repository on the Node side.
  expect(metadata.test.location.file).toContain(
    "packages/vitest/e2e/screenshot.test.ts",
  );
  // `includeTaskLocation` (enabled by the plugin) provides real line/column.
  expect(metadata.test.location.line).toBeGreaterThan(0);
  expect(metadata.test.location.column).toBeGreaterThan(0);

  // Browser-derived metadata comes for free through the Playwright SDK.
  expect(metadata.browser.name).toBe("chromium");
  expect(typeof metadata.url).toBe("string");
  expect(["light", "dark"]).toContain(metadata.colorScheme);
  expect(metadata.mediaType).toBe("screen");
});

test("auto-names a screenshot from the current test", async () => {
  mount(
    `<div style="padding:40px;background:#22c55e;color:#fff;font:700 32px sans-serif;">Auto</div>`,
  );
  // No name: it is derived from the current test + a per-test counter, so the
  // file lands under the test title with a ` 1` suffix.
  const attachments = await argosScreenshot();
  expect(attachments.length).toBe(2);

  const screenshot = attachments.find((a) => a.path.endsWith(".png"));
  expect(screenshot).toBeDefined();
  expect(screenshot!.path).toContain("auto-names a screenshot");
  expect(screenshot!.path).toContain(" 1.png");
});

test("captures a specific element via a selector", async () => {
  mount(
    `<div id="box" style="width:200px;height:120px;background:tomato"></div><p>ignored</p>`,
  );
  const attachments = await argosScreenshot("box", { element: "#box" });
  expect(attachments.length).toBe(2);
});

test("captures multiple viewports with per-viewport metadata", async () => {
  mount(
    `<div style="width:100%;box-sizing:border-box;padding:24px;background:linear-gradient(#f97316,#7c3aed);color:#fff;font:600 20px sans-serif;">Responsive content</div>`,
  );
  const attachments = await argosScreenshot("responsive", {
    viewports: [{ width: 320, height: 480 }, "macbook-13"],
  });
  // One screenshot + metadata per viewport.
  expect(attachments.length).toBe(4);

  const narrow = attachments.find((a) =>
    a.path.endsWith("responsive vw-320.png.argos.json"),
  );
  expect(narrow).toBeDefined();
  const narrowMetadata = JSON.parse(
    await server.commands.readFile(narrow!.path),
  );
  expect(narrowMetadata.viewport).toEqual({ width: 320, height: 480 });
});

test("supports custom CSS and full page", async () => {
  mount(
    `<div style="height:1600px;background:repeating-linear-gradient(#111,#111 40px,#222 40px,#222 80px)"></div>`,
  );
  const attachments = await argosScreenshot("tall", {
    fullPage: true,
    argosCSS: "body { background: white; }",
  });
  expect(attachments.length).toBe(2);
});

test("grows the iframe to capture content wider than the viewport", async () => {
  mount(
    `<div style="width:2000px;height:200px;background:linear-gradient(90deg,#22c55e,#3b82f6)"></div>`,
  );
  // Default (fullPage: false) fits the content in both dimensions, so the
  // capture must be wider than the viewport instead of clipping it.
  const attachments = await argosScreenshot("wide");
  const screenshot = attachments.find((a) => a.path.endsWith("wide.png"));
  expect(screenshot).toBeDefined();
  const width = await readPngWidth(screenshot!);
  expect(width).toBeGreaterThan(1500);
});

test("writes a value snapshot that the reporter can upload", async () => {
  // `argosSnapshot` works without a browser, but here we exercise the browser
  // RPC path: the value is serialized in the browser, written on the node side.
  const attachments = await argosSnapshot(
    {
      id: 1,
      name: "Argos",
      tags: ["a", "b"],
    },
    { name: "payload" },
  );
  // The snapshot file + its metadata attachment.
  expect(attachments.length).toBe(2);

  const snapshot = attachments.find((a) =>
    a.path.endsWith("payload.snapshot.txt"),
  );
  expect(snapshot).toBeDefined();
  // The value is serialized with pretty-format, ready for Argos to diff.
  const content = await server.commands.readFile(snapshot!.path);
  expect(content).toContain('"name": "Argos"');

  const metadata = attachments.find((a) => a.path.endsWith(".argos.json"));
  expect(metadata).toBeDefined();
  const parsed = JSON.parse(await server.commands.readFile(metadata!.path));
  expect(parsed.sdk.name).toBe("@argos-ci/vitest");
});

test("attaches the Vitest test metadata to the snapshot", async () => {
  const attachments = await argosSnapshot(
    { hello: "world" },
    { name: "snapshot-metadata" },
  );
  const metadata = attachments.find((a) => a.path.endsWith(".argos.json"));
  expect(metadata).toBeDefined();
  const parsed = JSON.parse(await server.commands.readFile(metadata!.path));

  // Snapshots have no browser, so Vitest is the automation library, but they
  // still carry the test metadata.
  expect(parsed.automationLibrary.name).toBe("vitest");
  expect(parsed.test.id).toBeTruthy();
  expect(parsed.test.title).toBe(
    "attaches the Vitest test metadata to the snapshot",
  );
  expect(parsed.test.titlePath).toEqual([
    "e2e/screenshot.test.ts",
    "attaches the Vitest test metadata to the snapshot",
  ]);
  // `location.file` is resolved relative to the git repository on the Node side.
  expect(parsed.test.location.file).toContain(
    "packages/vitest/e2e/screenshot.test.ts",
  );
});

test("writes a snapshot with a custom extension", async () => {
  const attachments = await argosSnapshot('{"enabled":true}', {
    name: "config",
    extension: ".json",
  });
  const snapshot = attachments.find((a) => a.path.endsWith(".snapshot.json"));
  expect(snapshot).toBeDefined();
  const content = await server.commands.readFile(snapshot!.path);
  expect(content).toBe('{"enabled":true}');
});

test("captures an ARIA snapshot alongside the screenshot", async () => {
  mount(`<button>Click me</button>`);
  const attachments = await argosScreenshot("aria", { ariaSnapshot: true });
  // ariaSnapshot adds the aria + aria/metadata attachments: 2 -> 4.
  expect(attachments.length).toBe(4);

  // The `.aria.yml` snapshot is written and contains the accessibility tree, so
  // it can be picked up by the reporter's upload glob.
  const aria = attachments.find((a) => a.path.endsWith(".aria.yml"));
  expect(aria).toBeDefined();
  const snapshot = await server.commands.readFile(aria!.path);
  expect(snapshot).toContain('button "Click me"');
});

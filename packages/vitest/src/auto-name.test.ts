import { describe, expect, it, vi } from "vitest";
import { TestRunner } from "vitest";
import { resolveAutoName } from "./auto-name";
import { getCurrentTest } from "./test-context";

// The real implementation, unless a test swaps in a task of its own.
vi.mock(import("./test-context"), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getCurrentTest: vi.fn(actual.getCurrentTest) };
});

it("returns an explicit name verbatim", async () => {
  await expect(resolveAutoName("button")).resolves.toBe("button");
});

it("generates a name from the current test with a per-test counter", async () => {
  const testName = TestRunner.getCurrentTest()?.fullName;
  expect(testName).toBeTruthy();

  // Each auto-named capture in the same test gets an incrementing counter,
  // mimicking Vitest's `${testName} ${count}` snapshot naming.
  await expect(resolveAutoName()).resolves.toBe(`${testName} 1`);
  await expect(resolveAutoName()).resolves.toBe(`${testName} 2`);
});

it("restarts the counter for each test", async () => {
  const testName = TestRunner.getCurrentTest()?.fullName;
  // A different test task, so the counter starts over at 1.
  await expect(resolveAutoName()).resolves.toBe(`${testName} 1`);
});

describe("on Vitest < 4.0.14", () => {
  it("rebuilds the full name, which tasks do not have yet", async () => {
    const test = TestRunner.getCurrentTest()!;
    vi.mocked(getCurrentTest).mockResolvedValueOnce({
      id: test.id,
      name: test.name,
      file: test.file,
      suite: test.suite,
    });
    // Same name as from the real `fullName`, so upgrading Vitest keeps it.
    await expect(resolveAutoName()).resolves.toBe(`${test.fullName} 1`);
  });
});

it("includes the test file path so names are unique across files", async () => {
  const file = TestRunner.getCurrentTest()?.file?.name;
  expect(file).toBe("src/auto-name.test.ts");
  // Argos names are global across the build (unlike Vitest's per-file `.snap`),
  // so the file path is part of the auto-generated name.
  await expect(resolveAutoName()).resolves.toContain(`${file} > `);
});

// A test title long enough that the auto-generated name would overflow the
// filesystem's 255-char limit once extensions are appended.
it(`truncates names that would overflow the filename limit ${"x".repeat(300)}`, async () => {
  const test = TestRunner.getCurrentTest();
  const reservedLength = 25;
  const name = await resolveAutoName(undefined, { reservedLength });

  // The whole filename (name + reserved suffix) fits within the limit.
  expect(name.length).toBeLessThanOrEqual(255 - reservedLength);
  // The unique test id is kept so truncated names from different tests never
  // collide, and the counter is preserved at the end.
  expect(name).toContain(test!.id);
  expect(name.endsWith(" 1")).toBe(true);
});

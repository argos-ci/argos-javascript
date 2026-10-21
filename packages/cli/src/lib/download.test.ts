import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CliError } from "./cli-error";
import {
  assertEmptyDirectory,
  downloadSnapshots,
  getSnapshotPath,
  getSnapshotPaths,
} from "./download";

// Retries wait between attempts; the tests have no reason to.
vi.mock("node:timers/promises", () => ({ setTimeout: async () => {} }));

const png = (name: string) => ({ name, contentType: "image/png" });

describe("getSnapshotPath", () => {
  it("mirrors the folders of the snapshot name", () => {
    expect(getSnapshotPath(png("chromium/home.png"))).toBe("chromium/home.png");
    expect(getSnapshotPath(png("chromium\\home.png"))).toBe(
      "chromium/home.png",
    );
  });

  it("keeps every file inside the download directory", () => {
    expect(getSnapshotPath(png("../../.ssh/key.png"))).toBe(".ssh/key.png");
    expect(getSnapshotPath(png("/etc/home.png"))).toBe("etc/home.png");
    expect(getSnapshotPath(png("a/./b/../c.png"))).toBe("a/b/c.png");
    expect(getSnapshotPath(png(".."))).toBe("snapshot.png");
  });

  it("adds the extension of the file type when the name lacks one", () => {
    expect(getSnapshotPath(png("home"))).toBe("home.png");
    expect(getSnapshotPath(png("Button.Primary"))).toBe("Button.Primary.png");
    expect(getSnapshotPath({ name: "photo", contentType: "image/jpeg" })).toBe(
      "photo.jpg",
    );
  });

  it("keeps an image extension the name already has", () => {
    expect(
      getSnapshotPath({ name: "photo.JPEG", contentType: "image/jpeg" }),
    ).toBe("photo.JPEG");
    // `argos upload` stores JPEGs as PNGs, under their original name.
    expect(getSnapshotPath(png("nested/alicia.jpg"))).toBe("nested/alicia.jpg");
  });

  it("leaves the name of an unknown file type alone", () => {
    expect(
      getSnapshotPath({ name: "tree.aria.yml", contentType: "text/yaml" }),
    ).toBe("tree.aria.yml");
  });

  it("replaces the characters Windows refuses, on Windows only", () => {
    const file = png("Button: primary?.png");
    expect(getSnapshotPath(file, "win32")).toBe("Button_ primary_.png");
    expect(getSnapshotPath(file, "linux")).toBe("Button: primary?.png");
  });
});

describe("getSnapshotPaths", () => {
  it("gives names that land on the same file distinct paths", () => {
    expect(
      getSnapshotPaths([png("home"), png("home.png"), png("Home.png")]),
    ).toEqual(["home.png", "home (2).png", "Home (3).png"]);
  });
});

describe("assertEmptyDirectory", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "argos-download-"));
  });

  it("accepts a directory that does not exist yet", async () => {
    await expect(assertEmptyDirectory(join(root, "out"))).resolves.toBe(
      undefined,
    );
  });

  it("accepts an empty directory", async () => {
    await expect(assertEmptyDirectory(root)).resolves.toBe(undefined);
  });

  it("refuses a directory that holds files", async () => {
    await writeFile(join(root, "home.png"), "");
    await expect(assertEmptyDirectory(root)).rejects.toThrow(
      new CliError(
        `${root} is not empty. Pick a new directory with --output, or empty it first.`,
      ),
    );
  });

  it("refuses a file", async () => {
    const file = join(root, "home.png");
    await writeFile(file, "");
    await expect(assertEmptyDirectory(file)).rejects.toThrow(
      `${file} is not a directory.`,
    );
  });
});

describe("downloadSnapshots", () => {
  let directory: string;

  /** Serve each URL's last path segment as its content, or `status`. */
  function mockFetch(statuses: (number | Error)[] = []) {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const status = statuses.shift() ?? 200;
      if (status instanceof Error) {
        throw status;
      }
      return status === 200
        ? new Response(`bytes of ${String(input).split("/").pop()}`)
        : new Response(null, { status });
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  const file = (name: string) => ({
    name,
    url: `https://files.argos-ci.com/${name.replaceAll("/", "-")}`,
    contentType: "image/png",
  });

  beforeEach(async () => {
    directory = join(await mkdtemp(join(tmpdir(), "argos-download-")), "out");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes each snapshot at its path, creating its folders", async () => {
    mockFetch();
    const onProgress = vi.fn();
    const files = await downloadSnapshots(
      [file("chromium/home.png"), file("about")],
      directory,
      { onProgress },
    );
    expect(files.map((entry) => entry.path)).toEqual([
      join(directory, "chromium/home.png"),
      join(directory, "about.png"),
    ]);
    await expect(
      readFile(join(directory, "chromium/home.png"), "utf8"),
    ).resolves.toBe("bytes of chromium-home.png");
    await expect(readFile(join(directory, "about.png"), "utf8")).resolves.toBe(
      "bytes of about",
    );
    expect(onProgress).toHaveBeenLastCalledWith(2, 2);
  });

  it("keeps the fields of each snapshot in the result", async () => {
    mockFetch();
    const [entry] = await downloadSnapshots(
      [{ ...file("home.png"), status: "added" as const }],
      directory,
    );
    expect(entry).toMatchObject({ name: "home.png", status: "added" });
  });

  it("tries again after a server error or a network failure", async () => {
    const fetchMock = mockFetch([503, new TypeError("fetch failed")]);
    await downloadSnapshots([file("home.png")], directory);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await expect(readFile(join(directory, "home.png"), "utf8")).resolves.toBe(
      "bytes of home.png",
    );
  });

  it("gives up after three attempts", async () => {
    const fetchMock = mockFetch([500, 500, 500]);
    await expect(
      downloadSnapshots([file("home.png")], directory),
    ).rejects.toThrow(
      'Could not download "home.png" (HTTP 500): https://files.argos-ci.com/home.png',
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a missing file", async () => {
    const fetchMock = mockFetch([404]);
    await expect(
      downloadSnapshots([file("home.png")], directory),
    ).rejects.toBeInstanceOf(CliError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops taking new files once one fails", async () => {
    const fetchMock = mockFetch([404]);
    const files = Array.from({ length: 20 }, (_, index) =>
      file(`${index}.png`),
    );
    await expect(downloadSnapshots(files, directory)).rejects.toThrow();
    // The first batch was already under way; nothing after it starts, and
    // nothing is left running once the download has failed.
    const calls = fetchMock.mock.calls.length;
    expect(calls).toBeLessThanOrEqual(8);
    await new Promise((resolve) => setImmediate(resolve));
    expect(fetchMock).toHaveBeenCalledTimes(calls);
  });

  it("downloads nothing for an empty list", async () => {
    const fetchMock = mockFetch();
    await mkdir(directory);
    await expect(downloadSnapshots([], directory)).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

/**
 * The warnings show once per process, so each test loads a fresh copy of the
 * module.
 */
async function loadPreviewUrl() {
  vi.resetModules();
  return import("./preview-url");
}

describe("formatPreviewUrl", () => {
  it("moves the URL onto the base URL, keeping the path, search and hash", async () => {
    const { formatPreviewUrl } = await loadPreviewUrl();
    expect(
      formatPreviewUrl("http://localhost:3000/docs/page?tab=1#intro", {
        baseUrl: "https://preview.example.com",
      }),
    ).toBe("https://preview.example.com/docs/page?tab=1#intro");
  });

  it("applies a formatter function", async () => {
    const { formatPreviewUrl } = await loadPreviewUrl();
    expect(
      formatPreviewUrl("http://localhost:3000/docs", (url) =>
        url.replace("localhost:3000", "preview.example.com"),
      ),
    ).toBe("http://preview.example.com/docs");
  });
});

describe("getPreviewUrlFormatter", () => {
  let warn: MockInstance<typeof console.warn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("returns nothing and warns about nothing when no preview URL is set", async () => {
    const { getPreviewUrlFormatter } = await loadPreviewUrl();

    expect(getPreviewUrlFormatter({ option: undefined, baseUrl: null })).toBe(
      null,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("uses ARGOS_PREVIEW_BASE_URL and warns once that it is deprecated", async () => {
    const { getPreviewUrlFormatter } = await loadPreviewUrl();
    const input = {
      option: undefined,
      baseUrl: "https://preview.example.com",
    };

    expect(getPreviewUrlFormatter(input)).toEqual({
      baseUrl: "https://preview.example.com",
    });
    getPreviewUrlFormatter(input);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      '[Argos] ARGOS_PREVIEW_BASE_URL is deprecated. Report the deployment to Argos instead with "argos deploy --url <url>", and Argos links each screenshot to the same page on it. Learn more: https://argos-ci.com/docs/learn/deployments',
    );
  });

  it("prefers the previewUrl option and warns once about each source", async () => {
    const { getPreviewUrlFormatter } = await loadPreviewUrl();
    const option = { baseUrl: "https://option.example.com" };
    const input = { option, baseUrl: "https://env.example.com" };

    expect(getPreviewUrlFormatter(input)).toBe(option);
    getPreviewUrlFormatter(input);

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[Argos] The "previewUrl" option is deprecated.'),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("[Argos] ARGOS_PREVIEW_BASE_URL is deprecated."),
    );
  });
});

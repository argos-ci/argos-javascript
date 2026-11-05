import { describe, it, expect, vi, afterEach } from "vitest";
import createDebug from "debug";
import { join } from "node:path";
import { upload } from "./upload";
import { getMergeBaseCommitSha, listAncestorCommits } from "./ci-environment";
import type * as CiEnvironment from "./ci-environment";
import { server, setupMockServer } from "../mocks/server";
import { http, HttpResponse } from "msw";

// Spied rather than replaced: only the baseline test stubs them, everything
// else keeps the real git helpers (never reached while the project has remote
// content access, as the default mock answers).
vi.mock("./ci-environment", async (importOriginal) => {
  const original = await importOriginal<typeof CiEnvironment>();
  return {
    ...original,
    getMergeBaseCommitSha: vi.fn(original.getMergeBaseCommitSha),
    listAncestorCommits: vi.fn(original.listAncestorCommits),
  };
});

setupMockServer();

describe("#upload", () => {
  it("uploads", async () => {
    const result = await upload({
      branch: "main",
      apiBaseUrl: "https://api.argos-ci.dev",
      root: join(__dirname, "../../../__fixtures__/screenshots"),
      commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
      token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
    });

    expect(result).toEqual({
      build: { id: "123", url: "https://app.argos-ci.dev/builds/123" },
      screenshots: [
        {
          name: "penelope.jpg",
          path: expect.stringMatching(
            /__fixtures__\/screenshots\/penelope\.jpg$/,
          ),
          pwTrace: null,
          optimizedPath: expect.any(String),
          hash: expect.stringMatching(/^[A-Fa-f0-9]{64}$/),
          metadata: null,
          threshold: null,
          baseName: null,
          contentType: "image/jpeg",
          parentName: null,
        },
        {
          name: "penelope.png",
          path: expect.stringMatching(
            /__fixtures__\/screenshots\/penelope\.png$/,
          ),
          pwTrace: null,
          optimizedPath: expect.any(String),
          hash: expect.stringMatching(/^[A-Fa-f0-9]{64}$/),
          metadata: {
            browser: {
              name: "chromium",
              version: "119.0.6045.9",
            },
            automationLibrary: {
              name: "playwright",
              version: "1.39.0",
            },
            colorScheme: "light",
            mediaType: "screen",
            sdk: {
              name: "@argos-ci/playwright",
              version: "0.0.7",
            },
            url: "https://localhost:3000/test",
            viewport: {
              height: 768,
              width: 1024,
            },
          },
          threshold: 0.2,
          baseName: null,
          contentType: "image/png",
          parentName: null,
        },
        {
          name: "nested/alicia.jpg",
          path: expect.stringMatching(
            /__fixtures__\/screenshots\/nested\/alicia\.jpg$/,
          ),
          pwTrace: null,
          optimizedPath: expect.any(String),
          hash: expect.stringMatching(/^[A-Fa-f0-9]{64}$/),
          metadata: null,
          threshold: null,
          baseName: null,
          contentType: "image/jpeg",
          parentName: null,
        },
      ],
    });
  });

  it("uses secure uploads", () => {
    return server.boundary(async () => {
      const received: {
        createBuildBody?: {
          screenshots?: { key: string; contentType: string }[];
          screenshotKeys?: string[];
        };
        upload?: {
          keys: string[];
          contentType: FormDataEntryValue | null;
          policy: FormDataEntryValue | null;
          file: FormDataEntryValue | null;
        };
      } = {};

      server.use(
        http.post("https://api.argos-ci.dev/builds", async ({ request }) => {
          received.createBuildBody = (await request.json()) as {
            screenshots?: { key: string; contentType: string }[];
            screenshotKeys?: string[];
          };
          const screenshot = received.createBuildBody.screenshots?.[0];
          if (!screenshot) {
            return HttpResponse.json({ error: "Bad Request" }, { status: 400 });
          }
          return HttpResponse.json({
            build: { id: "123", url: "https://app.argos-ci.dev/builds/123" },
            screenshots: [
              {
                key: screenshot.key,
                postUrl: `https://api.s3.dev/upload/${screenshot.key}`,
                fields: {
                  key: screenshot.key,
                  "Content-Type": screenshot.contentType,
                  policy: "test-policy",
                },
              },
            ],
            pwTraces: [],
          });
        }),
        http.post("https://api.s3.dev/upload/*", async ({ request }) => {
          const formData = await request.formData();
          received.upload = {
            keys: Array.from(formData.keys()),
            contentType: formData.get("Content-Type"),
            policy: formData.get("policy"),
            file: formData.get("file"),
          };
          return new Response(null, { status: 204 });
        }),
      );

      await upload({
        branch: "main",
        apiBaseUrl: "https://api.argos-ci.dev",
        root: join(__dirname, "../../../__fixtures__/screenshots"),
        files: ["penelope.png"],
        commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
      });

      expect(received.createBuildBody?.screenshotKeys).toBeUndefined();
      expect(received.createBuildBody?.screenshots).toEqual([
        {
          key: expect.stringMatching(/^[A-Fa-f0-9]{64}$/),
          contentType: "image/png",
        },
      ]);
      expect(received.upload?.contentType).toBe("image/png");
      expect(received.upload?.policy).toBe("test-policy");
      expect(received.upload?.keys.at(-1)).toBe("file");
      expect(received.upload?.file).toBeInstanceOf(Blob);
    })();
  });

  it("marks the update build request as final and carries the metadata", () => {
    return server.boundary(async () => {
      const updateBuildBodies: {
        final?: boolean | null;
        metadata?: unknown;
        screenshots: unknown[];
      }[] = [];

      server.use(
        http.put(
          "https://api.argos-ci.dev/builds/:buildId",
          async ({ request }) => {
            updateBuildBodies.push(
              (await request.json()) as {
                final?: boolean | null;
                metadata?: unknown;
                screenshots: unknown[];
              },
            );
            return HttpResponse.json({
              build: { id: "123", url: "https://app.argos-ci.dev/builds/123" },
            });
          },
        ),
      );

      await upload({
        branch: "main",
        apiBaseUrl: "https://api.argos-ci.dev",
        root: join(__dirname, "../../../__fixtures__/screenshots"),
        commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
        metadata: {
          testReport: { status: "passed" },
        },
      });

      // The fixtures are small, so everything fits in a single request.
      expect(updateBuildBodies).toHaveLength(1);
      const last = updateBuildBodies.at(-1);
      expect(last?.final).toBe(true);
      expect(last?.metadata).toEqual({ testReport: { status: "passed" } });
    })();
  });

  it("retries", () => {
    return server.boundary(async () => {
      let reqCount = 0;
      server.use(
        http.post("https://api.argos-ci.dev/builds", () => {
          reqCount++;
          if (reqCount < 2) {
            return HttpResponse.error();
          }
          return undefined;
        }),
      );

      await upload({
        branch: "main",
        apiBaseUrl: "https://api.argos-ci.dev",
        root: join(__dirname, "../../../__fixtures__/screenshots"),
        commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
      });

      expect(reqCount).toBe(2);
    })();
  });

  it("passes subset to create build", () => {
    return server.boundary(async () => {
      let receivedSubset: boolean | undefined;

      server.use(
        http.post("https://api.argos-ci.dev/builds", async ({ request }) => {
          const body = (await request.json()) as { subset?: boolean };
          receivedSubset = body.subset;
          return HttpResponse.json({
            build: { id: "123", url: "https://app.argos-ci.dev/builds/123" },
            screenshots: [],
          });
        }),
      );

      await upload({
        branch: "main",
        apiBaseUrl: "https://api.argos-ci.dev",
        root: join(__dirname, "../../../__fixtures__/screenshots"),
        commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
        subset: true,
      });

      expect(receivedSubset).toBe(true);
    })();
  });

  it("passes merge queue data to create build", () => {
    return server.boundary(async () => {
      let receivedMergeQueue: boolean | undefined;
      let receivedMergeQueuePrNumbers: number[] | undefined;

      server.use(
        http.post("https://api.argos-ci.dev/builds", async ({ request }) => {
          const body = (await request.json()) as {
            mergeQueue?: boolean;
            mergeQueuePrNumbers?: number[];
          };
          receivedMergeQueue = body.mergeQueue;
          receivedMergeQueuePrNumbers = body.mergeQueuePrNumbers;
          return HttpResponse.json({
            build: { id: "123", url: "https://app.argos-ci.dev/builds/123" },
            screenshots: [],
          });
        }),
      );

      await upload({
        branch: "main",
        apiBaseUrl: "https://api.argos-ci.dev",
        root: join(__dirname, "../../../__fixtures__/screenshots"),
        commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
        mergeQueuePrNumbers: [12, 34],
      });

      expect(receivedMergeQueue).toBe(true);
      expect(receivedMergeQueuePrNumbers).toEqual([12, 34]);
    })();
  });

  it("never prints the token in debug output (GHSA-28pg-v3hp-9g7f)", async () => {
    const token = "92d832e0d22ab113c8979d73a87a11130eaa24a9";
    const write = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    createDebug.enable("@argos-ci/core");

    let output: string;
    try {
      await upload({
        branch: "main",
        apiBaseUrl: "https://api.argos-ci.dev",
        root: join(__dirname, "../../../__fixtures__/screenshots"),
        commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
        token,
      });
      output = write.mock.calls.map(([chunk]) => String(chunk)).join("");
    } finally {
      createDebug.disable();
      write.mockRestore();
    }

    expect(output).not.toContain(token);
    // Masked once, where the token is resolved, so the user can still tell
    // which one was used.
    expect(output).toContain("Authenticated with ARGOS_TOKEN (92d832…)");
  });

  describe("project", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.mocked(getMergeBaseCommitSha).mockReset();
      vi.mocked(listAncestorCommits).mockReset();
    });

    const mergeBase = "a3a4ba0bf5c5d1f6c9ff5d76f22d03ca0dcb2a77";

    /**
     * Answer the endpoints a token linked to several projects has to name its
     * project on, and collect what `upload` sends them. The project has no
     * remote content access, so the baseline lookup runs too.
     */
    function captureProjectRequests() {
      vi.mocked(getMergeBaseCommitSha).mockResolvedValue(mergeBase);
      vi.mocked(listAncestorCommits).mockResolvedValue([]);
      const received: {
        projectUrl?: URL;
        baselineBody?: Record<string, unknown>;
        createBuildBody?: Record<string, unknown>;
      } = {};
      server.use(
        http.get("https://api.argos-ci.dev/project", ({ request }) => {
          received.projectUrl = new URL(request.url);
          return HttpResponse.json({
            id: "123",
            defaultBaseBranch: "main",
            hasRemoteContentAccess: false,
          });
        }),
        http.post("https://api.argos-ci.dev/baseline", async ({ request }) => {
          received.baselineBody = (await request.json()) as Record<
            string,
            unknown
          >;
          return HttpResponse.json({ baseline: null });
        }),
        http.post("https://api.argos-ci.dev/builds", async ({ request }) => {
          received.createBuildBody = (await request.json()) as Record<
            string,
            unknown
          >;
          return HttpResponse.json({
            build: { id: "123", url: "https://app.argos-ci.dev/builds/123" },
            screenshots: [],
          });
        }),
      );
      return received;
    }

    function uploadFixture(params: { project?: string } = {}) {
      return upload({
        branch: "feature",
        apiBaseUrl: "https://api.argos-ci.dev",
        root: join(__dirname, "../../../__fixtures__/screenshots"),
        commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
        ...params,
      });
    }

    it("names the project on every endpoint when it is set", () => {
      return server.boundary(async () => {
        const received = captureProjectRequests();

        await uploadFixture({ project: "acme/web" });

        expect(received.projectUrl?.searchParams.get("project")).toBe(
          "acme/web",
        );
        expect(received.baselineBody).toMatchObject({
          project: "acme/web",
          commits: [mergeBase],
        });
        expect(received.createBuildBody).toMatchObject({
          project: "acme/web",
        });
      })();
    });

    it("reads the project from ARGOS_PROJECT", () => {
      return server.boundary(async () => {
        vi.stubEnv("ARGOS_PROJECT", "acme/docs");
        const received = captureProjectRequests();

        await uploadFixture();

        expect(received.projectUrl?.searchParams.get("project")).toBe(
          "acme/docs",
        );
        expect(received.baselineBody).toMatchObject({ project: "acme/docs" });
        expect(received.createBuildBody).toMatchObject({
          project: "acme/docs",
        });
      })();
    });

    it("sends no project when it is not set", () => {
      return server.boundary(async () => {
        vi.stubEnv("ARGOS_PROJECT", "");
        const received = captureProjectRequests();

        await uploadFixture();

        expect(received.projectUrl?.search).toBe("");
        expect(received.baselineBody).not.toHaveProperty("project");
        expect(received.createBuildBody).not.toHaveProperty("project");
      })();
    });
  });
});

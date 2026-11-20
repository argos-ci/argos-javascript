import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webhookCommand } from "./index";

const BASE_URL = "https://api.argos.test/v2/";

type RecordedRequest = {
  method: string;
  url: string;
  headers: Headers;
  body: unknown;
};

const webhook = {
  id: "12",
  url: "https://example.com/argos",
  events: ["build.completed"],
  projects: null,
  createdAt: "2026-11-20T10:00:00.000Z",
};

const delivery = {
  id: "300",
  status: "failed",
  eventId: "evt_1",
  eventType: "build.completed",
  attempts: 3,
  attemptedAt: "2026-11-20T10:05:00.000Z",
  responseStatus: 500,
  durationMs: 120,
  failureReason: "HTTP 500",
  createdAt: "2026-11-20T10:00:00.000Z",
};

let requests: RecordedRequest[];
let respond: (request: RecordedRequest) => Response;
let stdout: string[];

beforeEach(() => {
  requests = [];
  stdout = [];
  vi.stubEnv("ARGOS_API_BASE_URL", BASE_URL);
  vi.stubEnv("ARGOS_ACCOUNT", "");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      const text = await input.text();
      const request = {
        method: input.method,
        url: input.url,
        headers: input.headers,
        body: text ? JSON.parse(text) : undefined,
      };
      requests.push(request);
      return respond(request);
    }),
  );
  vi.spyOn(console, "log").mockImplementation((line: unknown) => {
    stdout.push(String(line));
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function runCli(...args: string[]): Promise<void> {
  const program = new Command().exitOverride();
  webhookCommand(program);
  await program.parseAsync(
    ["webhook", ...args, "--account", "acme", "--token", "pat"],
    { from: "user" },
  );
}

describe("argos webhook", () => {
  it("lists the account's webhooks", async () => {
    respond = () => json([webhook]);
    await runCli("list", "--json");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      method: "GET",
      url: `${BASE_URL}accounts/acme/webhooks`,
    });
    expect(requests[0]?.headers.get("authorization")).toBe("Bearer pat");
    expect(JSON.parse(stdout.join("\n"))).toEqual([webhook]);
  });

  it("fetches one webhook", async () => {
    respond = () => json(webhook);
    await runCli("get", "12");
    expect(requests[0]).toMatchObject({
      method: "GET",
      url: `${BASE_URL}accounts/acme/webhooks/12`,
    });
    expect(stdout.join("\n")).toContain("Webhook 12");
  });

  it("creates a webhook for some events and projects, and prints the secret", async () => {
    respond = () =>
      json({ ...webhook, projects: ["web", "docs"], secret: "whsec_abc" }, 201);
    await runCli(
      "create",
      "--url",
      "https://example.com/argos",
      "--events",
      "build.completed",
      "deployment.ready",
      "--projects",
      "web",
      "docs",
    );
    expect(requests[0]).toMatchObject({
      method: "POST",
      url: `${BASE_URL}accounts/acme/webhooks`,
      body: {
        url: "https://example.com/argos",
        events: ["build.completed", "deployment.ready"],
        projects: ["web", "docs"],
      },
    });
    expect(stdout.join("\n")).toContain("\nwhsec_abc\n");
  });

  it("creates a webhook for every project when --projects is left out", async () => {
    respond = () => json({ ...webhook, secret: "whsec_abc" }, 201);
    await runCli(
      "create",
      "--url",
      "https://example.com/argos",
      "--events",
      "build.completed",
      "--json",
    );
    expect(requests[0]?.body).toEqual({
      url: "https://example.com/argos",
      events: ["build.completed"],
    });
    expect(JSON.parse(stdout.join("\n"))).toMatchObject({
      secret: "whsec_abc",
    });
  });

  it("rejects an unknown event before calling the API", async () => {
    respond = () => json({});
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    await expect(
      runCli(
        "create",
        "--url",
        "https://example.com/argos",
        "--events",
        "build.created",
      ),
    ).rejects.toThrow(/build\.created/);
    expect(requests).toHaveLength(0);
  });

  it("deletes a webhook", async () => {
    respond = () => new Response(null, { status: 204 });
    await runCli("delete", "12", "--json");
    expect(requests[0]).toMatchObject({
      method: "DELETE",
      url: `${BASE_URL}accounts/acme/webhooks/12`,
    });
    expect(JSON.parse(stdout.join("\n"))).toEqual({
      deleted: true,
      webhookId: "12",
    });
  });
});

describe("argos webhook delivery", () => {
  it("lists deliveries with the filters, following pagination up to --limit", async () => {
    respond = ({ url }) => {
      const page = new URL(url).searchParams.get("page");
      return json({
        results: [{ ...delivery, id: `30${page}` }],
        pageInfo: { total: 5, page: Number(page), perPage: 1 },
      });
    };
    await runCli(
      "delivery",
      "list",
      "12",
      "--status",
      "failed",
      "--event-id",
      "evt_1",
      "--limit",
      "2",
      "--json",
    );
    expect(requests.map(({ url }) => url)).toEqual([
      `${BASE_URL}accounts/acme/webhooks/12/deliveries?page=1&perPage=2&status=failed&eventId=evt_1`,
      `${BASE_URL}accounts/acme/webhooks/12/deliveries?page=2&perPage=2&status=failed&eventId=evt_1`,
    ]);
    expect(
      JSON.parse(stdout.join("\n")).map(({ id }: { id: string }) => id),
    ).toEqual(["301", "302"]);
  });

  it("fetches a delivery with its request and response", async () => {
    respond = () =>
      json({
        ...delivery,
        responseBody: "Internal error",
        event: {
          id: "evt_1",
          type: "build.completed",
          timestamp: "2026-11-20T10:00:00.000Z",
          data: {},
        },
      });
    await runCli("delivery", "get", "12", "300");
    expect(requests[0]).toMatchObject({
      method: "GET",
      url: `${BASE_URL}accounts/acme/webhooks/12/deliveries/300`,
    });
    const output = stdout.join("\n");
    expect(output).toContain("Request body:");
    expect(output).toContain("Response body:\n  Internal error");
  });

  it("resends a delivery", async () => {
    respond = () =>
      json(
        {
          ...delivery,
          id: "301",
          status: "pending",
          attempts: 0,
          attemptedAt: null,
          responseStatus: null,
          durationMs: null,
          failureReason: null,
        },
        201,
      );
    await runCli("delivery", "resend", "12", "300");
    expect(requests[0]).toMatchObject({
      method: "POST",
      url: `${BASE_URL}accounts/acme/webhooks/12/deliveries/300/resend`,
    });
    expect(stdout.join("\n")).toContain("Resent as delivery 301 [pending]");
  });
});

import { describe, it, expect } from "vitest";
import { readConfig, type Config } from "./config";

describe("#readConfig", () => {
  it("gets config", async () => {
    const config = await readConfig({
      branch: "main",
      commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
    });
    expect(config.commit).toBe("f16f980bd17cccfa93a1ae7766727e67950773d0");
  });

  it("throws with invalid commit", async () => {
    await expect(() =>
      readConfig({ branch: "main", commit: "xx" }),
    ).rejects.toThrow("commit: Invalid commit");
  });

  it("throws with invalid token", async () => {
    await expect(() =>
      readConfig({
        branch: "main",
        commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
        token: "invalid",
      }),
    ).rejects.toThrow(
      "token: Invalid Argos repository token (must be 40 characters)",
    );
  });

  const readDummyConfig = (config?: Partial<Config>) =>
    readConfig({
      branch: "main",
      commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
      ...config,
    });

  it("validates parallelTotal", async () => {
    process.env.ARGOS_PARALLEL_TOTAL = "";
    expect((await readDummyConfig()).parallelTotal).toBe(null);

    process.env.ARGOS_PARALLEL_TOTAL = "3";
    expect((await readDummyConfig()).parallelTotal).toBe(3);

    process.env.ARGOS_PARALLEL_TOTAL = "3.2";
    await expect(readDummyConfig()).rejects.toThrow(
      "parallelTotal: must be an integer: value was 3.2",
    );

    process.env.ARGOS_PARALLEL_TOTAL = "1";
    expect((await readDummyConfig()).parallelTotal).toBe(1);

    process.env.ARGOS_PARALLEL_TOTAL = "-1";
    expect((await readDummyConfig()).parallelTotal).toBe(-1);

    process.env.ARGOS_PARALLEL_TOTAL = "-2";
    await expect(readDummyConfig()).rejects.toThrow(
      "parallelTotal: must be at least -1: value was -2",
    );

    delete process.env.ARGOS_PARALLEL_TOTAL;
    await expect(readDummyConfig({ parallelTotal: -3 })).rejects.toThrow(
      "parallelTotal: must be at least -1: value was -3",
    );
  });

  it("validates parallIndex", async () => {
    process.env.ARGOS_PARALLEL_INDEX = "";
    expect((await readDummyConfig()).parallelIndex).toBe(null);

    process.env.ARGOS_PARALLEL_INDEX = "3";
    expect((await readDummyConfig()).parallelIndex).toBe(3);

    process.env.ARGOS_PARALLEL_INDEX = "3.2";
    await expect(readDummyConfig()).rejects.toThrow(
      "parallelIndex: must be an integer: value was 3.2",
    );

    process.env.ARGOS_PARALLEL_INDEX = "1";
    expect((await readDummyConfig()).parallelIndex).toBe(1);

    process.env.ARGOS_PARALLEL_INDEX = "0";
    await expect(readDummyConfig()).rejects.toThrow(
      "parallelIndex: must be at least 1",
    );

    delete process.env.ARGOS_PARALLEL_INDEX;
    await expect(readDummyConfig({ parallelIndex: -1 })).rejects.toThrow(
      "parallelIndex: must be at least 1: value was -1",
    );
  });

  it("token passed as argument is prioritary over env variable", async () => {
    process.env.ARGOS_TOKEN = "env-token-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    const config = await readDummyConfig({
      token: "arg-token-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    });
    expect(config.token).toBe("arg-token-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  });

  it("reads subset from env", async () => {
    process.env.ARGOS_SUBSET = "true";
    expect((await readDummyConfig()).subset).toBe(true);
    delete process.env.ARGOS_SUBSET;
  });

  it("subset passed as argument is prioritary over env variable", async () => {
    process.env.ARGOS_SUBSET = "false";
    const config = await readDummyConfig({ subset: true });
    expect(config.subset).toBe(true);
    delete process.env.ARGOS_SUBSET;
  });
});

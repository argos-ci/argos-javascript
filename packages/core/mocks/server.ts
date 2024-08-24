import { beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { createBuild } from "./handlers/createBuild";
import { getProject } from "./handlers/getProject";
import { updateBuild } from "./handlers/updateBuild";
import { uploadScreenshot } from "./handlers/uploadScreenshot";

export const server = setupServer(
  createBuild,
  updateBuild,
  uploadScreenshot,
  getProject,
);

export const setupMockServer = () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
};

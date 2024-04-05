import { http } from "msw";

export const uploadScreenshot = http.put(
  "https://api.s3.dev/upload/*",
  async () => {
    return new Response(null, { status: 201 });
  },
);

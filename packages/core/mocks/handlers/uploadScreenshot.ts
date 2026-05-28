import { http } from "msw";

export const uploadScreenshot = http.post(
  "https://api.s3.dev/upload/*",
  async ({ request }) => {
    const formData = await request.formData();
    if (!formData.has("file")) {
      return new Response(null, { status: 400 });
    }
    return new Response(null, { status: 204 });
  },
);

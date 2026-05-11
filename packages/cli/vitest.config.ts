export default {
  test: {
    environment: "node",
    include: ["e2e/**/*.test.{js,ts}"],
    tags: [
      {
        name: "oidc",
        description: "OIDC tests.",
      },
      {
        name: "tokenless",
        description: "Tokenless exchange tests.",
      },
    ],
  },
};

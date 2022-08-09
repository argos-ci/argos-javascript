const { execSync } = require("child_process");

const getSha = ({ env }) => {
  const isPr =
    env.GITHUB_EVENT_NAME === "pull_request" ||
    env.GITHUB_EVENT_NAME === "pull_request_target";

  if (isPr) {
    const mergeCommitRegex = /^[a-z0-9]{40} [a-z0-9]{40}$/;
    const mergeCommitMessage = execSync("git show --no-patch --format=%P")
      .toString()
      .trim();
    console.log(
      `Handling PR with parent hash(es) '${mergeCommitMessage}' of current commit.`
    );
    if (mergeCommitRegex.exec(mergeCommitMessage)) {
      const mergeCommit = mergeCommitMessage.split(" ")[1];
      console.log(
        `Fixing merge commit SHA ${process.env.GITHUB_SHA} -> ${mergeCommit}`
      );
      return mergeCommit;
    } else if (mergeCommitMessage === "") {
      console.error(
        "Issue detecting commit SHA. Please run actions/checkout with fetch-depth: 2"
      );
      console.error(
        `
      steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 2
      `.trim()
      );
      process.exit(0);
    } else {
      console.error(
        `Commit with SHA ${process.env.GITHUB_SHA} is not a valid commit`
      );
      process.exit(0);
    }
  }

  return process.env.GITHUB_SHA;
};

function getBranch({ env }) {
  if (env.GITHUB_HEAD_REF && env.GITHUB_HEAD_REF !== "") {
    return env.GITHUB_HEAD_REF;
  }

  const branchRegex = /refs\/heads\/(.*)/;
  const branchMatches = branchRegex.exec(env.GITHUB_REF || "");
  if (branchMatches) {
    return branchMatches[1];
  }

  return null;
}

export default {
  detect: ({ env }) => Boolean(env.GITHUB_ACTIONS),
  config: ({ env }) => ({
    name: "GiHub Actions",
    commit: getSha({ env }),
    branch: getBranch({ env }),
  }),
};

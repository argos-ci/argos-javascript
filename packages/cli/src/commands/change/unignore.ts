import { unwrap } from "../../lib/api";
import { defineChangeAction } from "./_action";

export const registerChangeUnignore = defineChangeAction({
  name: "unignore",
  description:
    "Stop ignoring a test change so its diffs require review again on future builds",
  perform: async ({ client, owner, project, changeId, metricsPeriod }) =>
    unwrap(
      await client.POST(
        "/projects/{owner}/{project}/changes/{changeId}/unignore",
        {
          params: {
            path: { owner, project, changeId },
            query: { metricsPeriod },
          },
        },
      ),
    ),
});

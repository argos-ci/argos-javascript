import { unwrap } from "../../lib/api";
import { defineChangeAction } from "./_action";

export const registerChangeIgnore = defineChangeAction({
  name: "ignore",
  description:
    "Ignore a flaky test change so its diffs stop requiring review and are auto-approved on future builds",
  perform: async ({ client, owner, project, changeId, metricsPeriod }) =>
    unwrap(
      await client.POST(
        "/projects/{owner}/{project}/changes/{changeId}/ignore",
        {
          params: {
            path: { owner, project, changeId },
            query: { metricsPeriod },
          },
        },
      ),
    ),
});

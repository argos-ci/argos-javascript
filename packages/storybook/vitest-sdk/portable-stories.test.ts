import { argosScreenshot } from "@argos-ci/vitest";
import { composeStories, composeStory } from "@storybook/react-vite";
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test } from "vitest";
import * as HeaderStories from "../stories/Header.stories";
import * as PageStories from "../stories/Page.stories";
import { readMetadata } from "./metadata";

/**
 * Stories rendered by regular Vitest tests (portable stories), screenshotted
 * with `@argos-ci/vitest`: it must report them as Storybook screenshots.
 */

const { LoggedIn, LoggedOut } = composeStories(HeaderStories);
const { LoggedIn: PageLoggedIn } = composeStories(PageStories);

beforeEach(() => {
  // The tests of a file share the page: start each screenshot from a blank one.
  document.body.replaceChildren();
});

test("reports a story run by the test as a Storybook screenshot", async () => {
  await LoggedIn.run();

  const metadata = await readMetadata(
    await argosScreenshot("portable-stories/header-logged-in"),
  );
  expect(metadata.sdk.name).toBe("@argos-ci/vitest");
  expect(metadata.automationLibrary.name).toBe("storybook");
  expect(metadata.story).toEqual({
    id: "example-header--logged-in",
    tags: expect.arrayContaining(["autodocs"]),
    play: false,
  });
});

test("reports a story rendered as a component", async () => {
  const root = createRoot(
    document.body.appendChild(document.createElement("div")),
  );
  flushSync(() => root.render(createElement(LoggedOut)));

  const metadata = await readMetadata(
    await argosScreenshot("portable-stories/header-logged-out"),
  );
  root.unmount();
  expect(metadata.automationLibrary.name).toBe("storybook");
  expect(metadata.story?.id).toBe("example-header--logged-out");
});

test("reports whether the story has a play function", async () => {
  await PageLoggedIn.run();

  const metadata = await readMetadata(
    await argosScreenshot("portable-stories/page-logged-in"),
  );
  expect(metadata.automationLibrary.name).toBe("storybook");
  expect(metadata.story).toMatchObject({
    id: "example-page--logged-in",
    play: true,
  });
});

test("leaves out the id of a story Storybook could not name", async () => {
  // Composed outside its indexer, a story whose meta has no `title` gets a
  // placeholder id, shared by every such story.
  const Untitled = composeStory(HeaderStories.LoggedIn, {
    component: HeaderStories.default.component,
  });
  await Untitled.run();

  const metadata = await readMetadata(
    await argosScreenshot("portable-stories/untitled"),
  );
  expect(metadata.automationLibrary.name).toBe("storybook");
  expect(metadata.story).toBeUndefined();
});

test("does not report a screenshot without story as a Storybook one", async () => {
  // Taken after the tests above: none of their stories leaks into it.
  document.body.innerHTML = "<p>Not a story</p>";

  const metadata = await readMetadata(
    await argosScreenshot("portable-stories/not-a-story"),
  );
  expect(metadata.automationLibrary.name).toBe("vitest");
  expect(metadata.story).toBeUndefined();
});

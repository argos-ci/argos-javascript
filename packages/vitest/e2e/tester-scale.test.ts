import { afterEach, expect, test } from "vitest";

import {
  resetTesterScaleInPage,
  restoreTesterScaleInPage,
} from "../src/iframe";

/**
 * The tester-scale reset runs inside the page, so it is exercised here rather
 * than in the node unit project: these tests drive the real functions against a
 * real DOM, with a stand-in for Vitest's `#vitest-tester` element.
 *
 * Both tester shapes matter. Up to Vitest 4 the tester carries a
 * `transform: scale(...)` emulating a viewport larger than the window; from
 * Vitest 5 the browser viewport itself is resized and the tester carries no
 * transform at all. The reset has to unscale the first and leave the second
 * alone.
 */

const TESTER_ID = "argos-tester-scale-fixture";
const BACKUP_KEY = "argosBckTransform";
const ARGS = { testerId: TESTER_ID, backupKey: BACKUP_KEY };

function mountTester(style: string): HTMLElement {
  const tester = document.createElement("div");
  tester.id = TESTER_ID;
  tester.style.cssText = style;
  document.body.append(tester);
  return tester;
}

afterEach(() => {
  document.getElementById(TESTER_ID)?.remove();
});

test("unscales a Vitest 4 tester and puts its transform back", () => {
  // What Vitest 4 writes when the requested viewport exceeds the window.
  const tester = mountTester(
    "width: 1280px; height: 800px; transform: scale(0.5); transform-origin: left top;",
  );

  resetTesterScaleInPage(ARGS);

  expect(tester.style.transform).toBe("scale(1)");
  expect(tester.getBoundingClientRect().width).toBeCloseTo(1280, 0);

  restoreTesterScaleInPage(ARGS);

  expect(tester.style.transform).toBe("scale(0.5)");
  expect(tester.dataset[BACKUP_KEY]).toBeUndefined();
});

test("leaves a Vitest 5 tester untouched", () => {
  // Vitest 5 resizes the real viewport, so the tester has no transform.
  const tester = mountTester("width: 100%; height: 100%;");

  expect(() => resetTesterScaleInPage(ARGS)).not.toThrow();

  expect(tester.style.transform).toBe("");
  expect(tester.dataset[BACKUP_KEY]).toBeUndefined();
});

test("restoring an untouched tester clears nothing", () => {
  const tester = mountTester("transform: translateX(10px);");

  // An identity scale is not worth undoing, whatever else the transform does.
  resetTesterScaleInPage(ARGS);
  restoreTesterScaleInPage(ARGS);

  expect(tester.style.transform).toBe("translateX(10px)");
});

test("unscales a tester scaled from a stylesheet", () => {
  const style = document.createElement("style");
  style.textContent = `#${TESTER_ID} { transform: scale(0.25); }`;
  document.head.append(style);

  try {
    const tester = mountTester("width: 400px; height: 300px;");

    resetTesterScaleInPage(ARGS);

    // The inline override has to beat the stylesheet.
    expect(getComputedStyle(tester).transform).toBe("matrix(1, 0, 0, 1, 0, 0)");

    restoreTesterScaleInPage(ARGS);

    // Restoring the empty inline transform hands the element back to the rule.
    expect(getComputedStyle(tester).transform).toBe(
      "matrix(0.25, 0, 0, 0.25, 0, 0)",
    );
  } finally {
    style.remove();
  }
});

test("does nothing when the tester is missing", () => {
  expect(() => resetTesterScaleInPage(ARGS)).not.toThrow();
  expect(() => restoreTesterScaleInPage(ARGS)).not.toThrow();
});

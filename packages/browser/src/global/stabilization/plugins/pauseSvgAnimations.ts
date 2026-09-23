import type { Plugin } from "..";

/**
 * SMIL animations that never end: `repeatCount` and `repeatDur` are the two
 * ways to repeat one forever.
 */
const ENDLESS_ANIMATION_SELECTOR =
  '[repeatCount="indefinite"], [repeatDur="indefinite"]';

/**
 * Get the `<svg>` elements whose clock can drive an endless animation.
 * Chromium runs an animation on the clock of its nearest `<svg>`, where the
 * spec and Firefox use the outermost one, so the whole chain is collected.
 */
function getSvgsWithEndlessAnimations(): Set<SVGSVGElement> {
  const svgs = new Set<SVGSVGElement>();
  document.querySelectorAll(ENDLESS_ANIMATION_SELECTOR).forEach((element) => {
    if (!(element instanceof SVGAnimationElement)) {
      return;
    }
    for (let svg = element.ownerSVGElement; svg; svg = svg.ownerSVGElement) {
      svgs.add(svg);
    }
  });
  return svgs;
}

/**
 * Pause SVG animations that repeat forever, such as a spinning loader, on their
 * first frame. They are SMIL animations (`<animate>`, `<animateTransform>`,
 * `<animateMotion>`, `<set>`) and run on their `<svg>`'s own clock, which
 * neither CSS nor the browser's animation controls (Playwright's
 * `animations: "disabled"`) reach, so the screenshot would otherwise catch
 * whichever frame the loop had reached.
 *
 * Animations that end are left alone: they settle by themselves, and rewinding
 * one that has finished would capture its start instead of its end.
 */
export const plugin = {
  name: "pauseSvgAnimations" as const,
  beforeEach() {
    const restores = Array.from(getSvgsWithEndlessAnimations(), (svg) => {
      const time = svg.getCurrentTime();
      const paused = svg.animationsPaused();
      svg.pauseAnimations();
      svg.setCurrentTime(0);
      return () => {
        svg.setCurrentTime(time);
        if (!paused) {
          svg.unpauseAnimations();
        }
      };
    });

    return () => {
      restores.forEach((restore) => restore());
    };
  },
} satisfies Plugin;

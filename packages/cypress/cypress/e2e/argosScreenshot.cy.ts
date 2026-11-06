/**
 * Decode a PNG screenshot so its pixels can be asserted on.
 */
async function decodePng(buffer: Uint8Array) {
  const bitmap = await createImageBitmap(
    new Blob([new Uint8Array(buffer)], { type: "image/png" }),
  );
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No 2d context available");
  }
  context.drawImage(bitmap, 0, 0);
  return context.getImageData(0, 0, bitmap.width, bitmap.height);
}

/**
 * Read and decode a screenshot taken by `argosScreenshot` in this spec.
 */
function readScreenshot(name: string) {
  return cy
    .readFile(
      `${Cypress.config("screenshotsFolder")}/${Cypress.spec.name}/argos/${name}.png`,
      null,
    )
    .then((buffer) => decodePng(buffer));
}

/**
 * Get the color of a pixel of an image, in image pixels.
 */
function getPixel(image: ImageData, x: number, y: number) {
  const index = (Math.round(y) * image.width + Math.round(x)) * 4;
  return Array.from(image.data.slice(index, index + 3));
}

/**
 * Check the color of a pixel, where each channel is either 0 or 255.
 * The capture can carry the display color profile, so colors may not be
 * exact: 0 is checked as below 100 and 255 as above 200.
 */
function expectColor(pixel: number[], color: [number, number, number]) {
  color.forEach((channel, index) => {
    if (channel === 0) {
      expect(pixel[index]).to.be.lessThan(100);
    } else {
      expect(pixel[index]).to.be.greaterThan(200);
    }
  });
}

describe("argosScreenshot", () => {
  it("takes a screenshot with a simple name", () => {
    cy.visit("cypress/pages/index.html");
    cy.argosScreenshot("screen");

    // Wait for the loader to hide
    cy.get("#loader", { timeout: 0 }).should("not.exist");
  });

  it("takes a screenshot with a folder name", () => {
    cy.visit("cypress/pages/index.html");
    cy.argosScreenshot("nested/screen");
  });

  it("takes a screenshot of a component with a generic name", () => {
    cy.visit("cypress/pages/index.html");
    cy.get(".specific-target").argosScreenshot("specific-target");
  });

  it("supports argosCSS option", () => {
    cy.visit("cypress/pages/index.html");
    cy.argosScreenshot("argosCSS-option", {
      argosCSS: "body { background: blue; }",
    });
  });

  it("supports threshold option", () => {
    cy.visit("cypress/pages/index.html");
    cy.argosScreenshot("threshold-option", { threshold: 0.2 });
  });

  it("supports tags option", () => {
    cy.visit("cypress/pages/index.html");
    cy.argosScreenshot("tags-option", {
      tag: ["snapshot-tag"],
    });
  });

  it("supports blackout option alongside the default blackout selector", () => {
    cy.visit("cypress/pages/blackout.html");
    cy.argosScreenshot("blackout-option", {
      blackout: ["#custom-blackout"],
    });

    readScreenshot("blackout-option").then((image) => {
      cy.window().then((win) => {
        const scale = image.width / win.innerWidth;
        const getCenterPixel = (selector: string) => {
          const element = win.document.querySelector(selector);
          if (!element) {
            throw new Error(`No element matches ${selector}`);
          }
          const rect = element.getBoundingClientRect();
          return getPixel(
            image,
            (rect.left + rect.width / 2) * scale,
            (rect.top + rect.height / 2) * scale,
          );
        };

        expect(getCenterPixel("#default-blackout")).to.deep.equal([0, 0, 0]);
        expect(getCenterPixel("#custom-blackout")).to.deep.equal([0, 0, 0]);
        expectColor(getCenterPixel("#visible"), [255, 0, 0]);
      });
    });
  });

  it("supports onAfterScreenshot option", () => {
    cy.visit("cypress/pages/index.html");
    let screenshotPath: string | undefined;
    cy.argosScreenshot("onAfterScreenshot-option", {
      onAfterScreenshot: (_$el, props) => {
        screenshotPath = props.path;
      },
    });
    cy.then(() => {
      expect(screenshotPath).to.be.a("string");
      cy.readFile(`${screenshotPath}.argos.json`)
        .its("test.title")
        .should("eq", "supports onAfterScreenshot option");
    });
  });

  it("supports padding option on an element", () => {
    cy.visit("cypress/pages/padding.html");
    cy.get("#shadowed").argosScreenshot("padding-option", { padding: 10 });

    readScreenshot("padding-option").then((image) => {
      cy.window().then((win) => {
        const scale = win.devicePixelRatio;
        // The 100px element and 10px on each side.
        expect([image.width / scale, image.height / scale]).to.deep.equal([
          120, 120,
        ]);
        // The shadow overflowing the element box is captured.
        expectColor(getPixel(image, 2 * scale, 2 * scale), [0, 0, 255]);
        expectColor(getPixel(image, 60 * scale, 60 * scale), [255, 0, 0]);
      });
    });
  });

  it("clamps padding to the page", () => {
    cy.visit("cypress/pages/padding.html");
    cy.get("#corner").argosScreenshot("padding-corner", { padding: 20 });

    readScreenshot("padding-corner").then((image) => {
      cy.window().then((win) => {
        const scale = win.devicePixelRatio;
        // The 100px element and 20px on the right and bottom sides only.
        expect([image.width / scale, image.height / scale]).to.deep.equal([
          120, 120,
        ]);
      });
    });
  });

  it("supports hide and remove options", () => {
    cy.visit("cypress/pages/index.html");
    cy.document().then((doc) => {
      const getHelpers = () =>
        ["h1", ".specific-target"].map(
          (selector) =>
            doc.querySelector(selector)?.getAttribute("data-visual-test") ??
            null,
        );
      let helpersDuringScreenshot: (string | null)[] = [];
      cy.argosScreenshot("hide-remove-options", {
        hide: [".specific-target", "h1"],
        // Removing wins over hiding.
        remove: ["h1", ".does-not-exist"],
        onBeforeScreenshot: () => {
          helpersDuringScreenshot = getHelpers();
        },
      }).then(() => {
        expect(helpersDuringScreenshot).to.deep.equal([
          "removed",
          "transparent",
        ]);
        // The page is restored after the screenshot.
        expect(getHelpers()).to.deep.equal([null, null]);
      });
    });
  });
});

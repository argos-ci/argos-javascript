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

    cy.readFile(
      `${Cypress.config("screenshotsFolder")}/${Cypress.spec.name}/argos/blackout-option.png`,
      null,
    )
      .then((buffer) => decodePng(buffer))
      .then((image) => {
        cy.window().then((win) => {
          const scale = image.width / win.innerWidth;
          const getCenterPixel = (selector: string) => {
            const element = win.document.querySelector(selector);
            if (!element) {
              throw new Error(`No element matches ${selector}`);
            }
            const rect = element.getBoundingClientRect();
            const x = Math.round((rect.left + rect.width / 2) * scale);
            const y = Math.round((rect.top + rect.height / 2) * scale);
            const index = (y * image.width + x) * 4;
            return Array.from(image.data.slice(index, index + 3));
          };

          expect(getCenterPixel("#default-blackout")).to.deep.equal([0, 0, 0]);
          expect(getCenterPixel("#custom-blackout")).to.deep.equal([0, 0, 0]);
          // The capture can carry the display color profile, so red may not be
          // exactly [255, 0, 0].
          const [r, g, b] = getCenterPixel("#visible");
          expect(r).to.be.greaterThan(200);
          expect(g).to.be.lessThan(100);
          expect(b).to.be.lessThan(100);
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

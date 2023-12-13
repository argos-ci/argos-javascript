const screenshotsFolder = Cypress.browser.isHeaded
  ? `./cypress/screenshots`
  : `./cypress/screenshots/${Cypress.spec.name}`;

describe("argosScreenshot", () => {
  describe("with name", () => {
    before(() => {
      cy.visit("cypress/pages/index.html");
      cy.argosScreenshot("screen");
    });

    it("waits for loader hiding", () => {
      cy.get("#loader", { timeout: 0 }).should("not.exist");
    });

    it("takes a named screenshot", () => {
      cy.readFile(`${screenshotsFolder}/screen.png`);
    });
  });

  describe("component", () => {
    it("takes a screenshot of a component with a generic name", () => {
      cy.visit("cypress/pages/index.html");
      cy.get(".specific-target").argosScreenshot("specific-target");
      cy.readFile(`${screenshotsFolder}/specific-target.png`);
    });
  });

  it("supports argosCSS option", () => {
    cy.visit("cypress/pages/index.html");
    cy.argosScreenshot("argosCSS-option", {
      argosCSS: "body { background: blue; }",
    });
  });
});

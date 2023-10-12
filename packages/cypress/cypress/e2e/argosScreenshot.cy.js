const screenshotsFolder = Cypress.browser.isHeaded
  ? `./cypress/screenshots`
  : `./cypress/screenshots/${Cypress.spec.name}`;

describe("argosScreenshot", () => {
  describe("without name", () => {
    before(() => {
      cy.visit("cypress/pages/index.html");
      cy.argosScreenshot();
    });

    it("waits for loader hiding", () => {
      cy.get("#loader", { timeout: 0 }).should("not.exist");
    });

    it("takes a screenshot with generic name", () => {
      cy.readFile(
        `${screenshotsFolder}/argosScreenshot -- without name -- waits for loader hiding -- before all hook.png`,
      );
    });
  });

  describe("with name", () => {
    before(() => {
      cy.visit("cypress/pages/index.html");
      cy.argosScreenshot("named-screenshot");
    });

    it("takes a named screenshot", () => {
      cy.readFile(`${screenshotsFolder}/named-screenshot.png`);
    });
  });

  describe("component", () => {
    it("takes a screenshot of a component with a generic name", () => {
      cy.visit("cypress/pages/index.html");
      cy.get(".specific-target").argosScreenshot("specific-target");
      cy.readFile(`${screenshotsFolder}/specific-target.png`);
    });
  });
});

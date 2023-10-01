const screenshotsFolder = Cypress.browser.isHeaded
  ? `./cypress/screenshots`
  : `./cypress/screenshots/${Cypress.spec.name}`;

describe("argosScreenshot", () => {
  before(() => {
    cy.visit("cypress/pages/index.html");
  });

  describe("without name", () => {
    before(() => {
      cy.argosScreenshot();
    });

    it("waits for loader hiding", () => {
      cy.get("#loader", { timeout: 0 }).should("not.exist");
    });

    it("hides div with data-visual-test attribute", () => {
      cy.get(`[data-visual-test="transparent"]`, { timeout: 0 }).should(
        "not.be.visible"
      );
    });

    it("takes a screenshot with generic name", () => {
      cy.readFile(
        `${screenshotsFolder}/argosScreenshot -- without name -- waits for loader hiding -- before all hook.png`
      );
    });
  });

  describe("with name", () => {
    it("takes a named screenshot", () => {
      cy.argosScreenshot("named-screenshot");
      cy.readFile(`${screenshotsFolder}/named-screenshot.png`);
    });
  });

  describe("component", () => {
    it("takes a screenshot of a component with a generic name", () => {
      cy.get(".red-square").first().argosScreenshot("red-square");
      cy.readFile(`${screenshotsFolder}/named-screenshot.png`);
    });
  });
});

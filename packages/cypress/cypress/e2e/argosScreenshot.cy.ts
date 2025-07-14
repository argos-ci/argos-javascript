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
});

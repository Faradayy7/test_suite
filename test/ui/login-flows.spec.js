// playwright test for login scenarios
const { test, expect } = require("@playwright/test");

// Utiliza variables para los selectores y mensajes
const selectors = {
  email: 'role=textbox[name="Email"]',
  password: 'role=textbox[name="Password"]',
  loginButton: 'role=button[name="Login"]',
  forgotPassword: 'role=link[name="Forgot your password?"]',
  resetEmail: 'role=textbox[name="Email"]',
  resetButton: 'role=button[name="Reset password"]',
  returnToSignIn: 'role=link[name="Return to sign in"]',
  errorMessage:
    'div.alert.alert-error:has-text("Incorrect username or password.")',
  resetConfirmation: "text=Password reset confirmation sent!",
};

const validUser = {
  email: "sololectura@mediastre.am",
  password: "12345678",
};

const invalidUser = {
  email: "usuarioinvalido@dominio.com",
  password: "contraseña_incorrecta",
};

test.describe("Login Page", () => {
  test("Login exitoso con credenciales válidas", async ({ page }) => {
    await page.goto("https://dev.platform.mediastre.am");
    await page.locator(selectors.email).fill(validUser.email);
    await page.locator(selectors.password).fill(validUser.password);
    await page.locator(selectors.loginButton).click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator("text=Welcome to Platform")).toBeVisible();
  });

  test("Error con credenciales inválidas", async ({ page }) => {
    await page.goto("https://dev.platform.mediastre.am");
    await page.locator(selectors.email).fill(invalidUser.email);
    await page.locator(selectors.password).fill(invalidUser.password);
    await page.locator(selectors.loginButton).click();
    await expect(page.locator(selectors.errorMessage)).toBeVisible();
  });

  test('Flujo de "Olvidé mi contraseña" muestra confirmación', async ({
    page,
  }) => {
    await page.goto("https://dev.platform.mediastre.am");
    await page.locator(selectors.forgotPassword).click();
    await page.locator(selectors.resetEmail).fill(validUser.email);
    await page.locator(selectors.resetButton).click();
    await expect(page.locator(selectors.resetConfirmation)).toBeVisible();
    await page.locator(selectors.returnToSignIn).click();
    await expect(page).toHaveURL("https://dev.platform.mediastre.am/");
  });
});

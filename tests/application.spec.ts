import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { QUESTIONS } from "../src/content/questions.ts";
import { DIAGNOSES } from "../src/sim/scenarios.ts";
import { LABS, LESSONS } from "../src/content/lessons.ts";

test("manual WHY remains available when automatic explanations are disabled", async ({ page }) => {
  await page
    .locator(".workbench .panel")
    .filter({ has: page.getByRole("heading", { name: "Kumanda paneli", exact: true }) })
    .getByRole("button", { name: "Neden? WHY" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Sol manifold");
  await page.getByRole("button", { name: "Açıklamayı kapat" }).click();
});

test("single pump failure leaves redundant L2 available", async ({ page }) => {
  await page.getByLabel("Senaryo preset").selectOption("pressure");
  await page.getByRole("slider", { name: "Sol hat kısıtlaması" }).fill("0");
  await page.getByRole("switch", { name: "L1 PUMP FAILURE", exact: true }).click();
  await expect(page.getByRole("switch", { name: "LEFT PUMP 1", exact: true })).toContainText(
    "FAIL",
  );
  await expect(page.getByRole("switch", { name: "LEFT PUMP 2", exact: true })).toContainText("ON");
  await expect(page.getByTestId("feed-L")).toHaveText("3.000 kg/h");
});

test("jettison control drives nozzles and lowers real fuel quantity", async ({ page }) => {
  await page.getByLabel("Senaryo preset").selectOption("jettison");
  await expect(page.locator(".experiment .panel-head h2")).toHaveText("Jettison");
  await page.getByRole("button", { name: "20×", exact: true }).click();
  const before = await quantity(page, "L");
  await page.getByRole("switch", { name: "FUEL JETTISON", exact: true }).click();
  await expect(page.locator(".jettison-plume path")).toHaveCount(4);
  await expect.poll(() => quantity(page, "L")).toBeLessThan(before - 20);
  await page.getByRole("switch", { name: "FUEL JETTISON", exact: true }).click();
  await expect(page.locator(".jettison-plume")).toHaveCount(0);
});

test("leak loses excess mass while frozen sensor holds indication", async ({ page }) => {
  await page.getByLabel("Senaryo preset").selectOption("leak");
  await page.getByRole("button", { name: "20×", exact: true }).click();
  const left = await quantity(page, "L"),
    right = await quantity(page, "R");
  await expect.poll(() => quantity(page, "R")).toBeLessThan(right - 5);
  expect(left - (await quantity(page, "L"))).toBeGreaterThan(
    (right - (await quantity(page, "R"))) * 3,
  );
  await page.getByLabel("Senaryo preset").selectOption("sensor");
  const indicated = await quantity(page, "L"),
    r = await quantity(page, "R");
  await expect.poll(() => quantity(page, "R")).toBeLessThan(r - 5);
  expect(await quantity(page, "L")).toBe(indicated);
});

test("closed sources remove every feed animation and diagnosis WHY keeps answer concealed", async ({
  page,
}) => {
  for (const label of ["LEFT PUMP 1", "LEFT PUMP 2", "RIGHT PUMP 1", "RIGHT PUMP 2"])
    await page.getByRole("switch", { name: label, exact: true }).click();
  await expect(page.locator(".pipe-flow")).toHaveCount(0);
  await nav(page, "Arıza teşhisi");
  await page.getByLabel("Teşhis vakası").selectOption("2");
  await page.locator(".right-rail .why").click();
  await expect(page.getByRole("dialog")).toContainText("Bu vaka cevaplanmadan");
  await expect(page.getByRole("dialog")).not.toContainText("− kaçak");
});
const nav = async (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Eğitim modları" })
    .getByRole("button", { name, exact: true })
    .click();
const quantity = async (page: Page, id: string): Promise<number> =>
  Number(
    (await page.getByTestId(`quantity-${id}`).innerText()).replaceAll(".", "").replace(",", "."),
  );
test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await page.getByRole("heading", { name: "İnteraktif yakıt şeması" }).waitFor();
  await page.getByLabel("Kumanda değişiminde kısa açıklama").uncheck();
});

test("production Pages path loads all assets and reports no console/runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const failures: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failures.push(r.url());
  });
  await page.reload();
  await expect(page.getByTestId("feed-L")).toContainText("2.000");
  await expect.poll(() => page.getByTestId("sim-time").innerText()).not.toBe("T+ 0,0 s");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/desktop-overview.png", fullPage: false });
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});
test("crossfeed responds to pump commands and restores left feed", async ({ page }) => {
  await page.getByRole("switch", { name: "LEFT PUMP 1", exact: true }).click();
  await page.getByRole("switch", { name: "LEFT PUMP 2", exact: true }).click();
  await expect(page.getByTestId("feed-L")).toHaveText("0 kg/h");
  await page.getByRole("switch", { name: "CROSSFEED VALVE", exact: true }).click();
  await expect(page.getByTestId("feed-L")).toHaveText("2.000 kg/h");
  await expect(page.getByRole("button", { name: "Engine 1 ayrıntıları" })).toContainText("R TANK");
});
test("pause freezes time and quantities; resume and 20x consume fuel", async ({ page }) => {
  await page.getByRole("button", { name: "Duraklat", exact: true }).click();
  const before = await page.getByTestId("sim-time").innerText(),
    q = await quantity(page, "L");
  await page.waitForTimeout(500);
  expect(await page.getByTestId("sim-time").innerText()).toBe(before);
  expect(await quantity(page, "L")).toBe(q);
  await page.getByRole("button", { name: "20×", exact: true }).click();
  await page.getByRole("button", { name: "Devam et", exact: true }).click();
  await expect.poll(() => quantity(page, "L")).toBeLessThan(q - 1);
});
test("transfer lab increases destination and reduces source", async ({ page }) => {
  await nav(page, "Deneyler");
  await page
    .getByRole("button", { name: "Transfer & imbalance Kütleyi tanklar arasında taşı" })
    .click();
  const l = await quantity(page, "L"),
    r = await quantity(page, "R");
  await page.getByRole("button", { name: "20×", exact: true }).click();
  await page.getByRole("button", { name: "R → L", exact: true }).click();
  await expect.poll(() => quantity(page, "L")).toBeGreaterThan(l + 5);
  await expect.poll(() => quantity(page, "R")).toBeLessThan(r - 5);
});
test("all eight diagnosis cases hide answers until choice and explain alternatives", async ({
  page,
}) => {
  await nav(page, "Arıza teşhisi");
  for (let i = 0; i < DIAGNOSES.length; i++) {
    await page.getByLabel("Teşhis vakası").selectOption(String(i));
    await expect(page.locator(".diagnosis-reasons")).toHaveCount(0);
    await page.locator(".diagnosis-options button").nth(DIAGNOSES[i].correct).click();
    await expect(page.locator(".diagnosis-reasons")).toContainText("Doğru teşhis.");
    await expect(page.locator(".diagnosis-reasons p")).toHaveCount(4);
  }
});
test("stuck valve produces live command/actual disagreement", async ({ page }) => {
  await page.getByLabel("Senaryo preset").selectOption("valve");
  await expect(page.getByRole("switch", { name: "CROSSFEED VALVE", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByRole("switch", { name: "CROSSFEED VALVE", exact: true })).toContainText(
    "Actual: CLOSED",
  );
  await expect(page.getByRole("button", { name: "△ VALVE DISAGREE WHY?" })).toBeVisible();
  await expect(page.getByTestId("feed-L")).toHaveText("0 kg/h");
});
test("twelve labs render real controls without runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await nav(page, "Deneyler");
  for (const [id, label, subtitle] of LABS) {
    await page.getByRole("button", { name: `${label} ${subtitle}`, exact: true }).click();
    await expect(page.locator(".experiment .panel-head h2")).toHaveText(label);
    if (id === "trim") await page.screenshot({ path: "test-results/trim-lab.png", fullPage: true });
  }
  expect(errors).toEqual([]);
});
test("inerting, drain and refuel controls change measured output", async ({ page }) => {
  await nav(page, "Deneyler");
  await page.getByRole("button", { name: "Inerting Ullage ve oksijen", exact: true }).click();
  await page.getByRole("button", { name: "20×", exact: true }).click();
  await page.getByRole("button", { name: "NITROGEN-ENRICHED AIR", exact: true }).click();
  await expect.poll(() => page.locator(".ullage-vessel>strong").innerText()).not.toContain("21,0");
  await page.getByRole("button", { name: "Drain & water Dipteki iki sıvı", exact: true }).click();
  await page.getByRole("switch", { name: "DRAIN POINT", exact: true }).click();
  await expect.poll(() => page.locator(".drain-stream").innerText()).toBe("YAKIT ↓");
  await page
    .getByRole("button", { name: "Refuel / defuel Yer servis paneli", exact: true })
    .click();
  const before = await quantity(page, "L");
  await page.getByRole("button", { name: "REFUEL BAŞLAT", exact: true }).click();
  await expect.poll(() => quantity(page, "L")).toBeGreaterThan(before + 5);
  await page.getByRole("button", { name: "DE-FUEL BAŞLAT", exact: true }).click();
  const after = await quantity(page, "L");
  await expect.poll(() => quantity(page, "L")).toBeLessThan(after - 5);
});
test("all 15 lessons expose three mini questions and working highlighted experiment links", async ({
  page,
}) => {
  await nav(page, "Öğrenme");
  for (let i = 0; i < LESSONS.length; i++) {
    await page
      .getByRole("navigation", { name: "Ders bölümleri" })
      .getByRole("button")
      .nth(i)
      .click();
    await expect(page.locator(".mini-quiz .question-card")).toHaveCount(3);
    await expect(page.locator(".lesson-content>h1")).toHaveText(LESSONS[i].title);
  }
  await page.getByRole("button", { name: "Canlı şemada deneyi aç", exact: false }).click();
  await expect(page.locator(".selected-part")).not.toHaveCount(0);
  await expect(page.getByRole("heading", { name: "İnteraktif yakıt şeması" })).toBeVisible();
});
test("60 question exam scores, preserves answers across tabs and resets", async ({ page }) => {
  test.setTimeout(60000);
  await nav(page, "Sınav provası");
  for (let i = 0; i < QUESTIONS.length; i++) {
    await page.locator(".exam-main .answer-options button").nth(QUESTIONS[i].correct).click();
    await expect(page.locator(".exam-main .answer-explanation")).toContainText("Doğru.");
    if (i < 59) await page.getByRole("button", { name: "Sonraki soru →", exact: true }).click();
  }
  await expect(page.getByTestId("exam-score")).toHaveText("60/60");
  await nav(page, "Simülasyon");
  await nav(page, "Sınav provası");
  await expect(page.getByTestId("exam-score")).toHaveText("60/60");
  await page.getByRole("button", { name: "Sonuçları değerlendir", exact: true }).click();
  await expect(page.locator(".exam-main")).toContainText("60 doğru · 0 yanlış · 0 boş");
  await page.getByRole("button", { name: "Yeni sınav başlat", exact: true }).click();
  await expect(page.getByTestId("exam-score")).toHaveText("0/60");
});
test("challenge succeeds through genuine feed reconfiguration and records mistakes", async ({
  page,
}) => {
  await nav(page, "Görevler");
  await page.locator(".mission-cards button").first().click();
  await page.getByRole("button", { name: "Görevi değerlendir", exact: true }).click();
  await expect(page.locator(".mission-current")).toContainText("1 başarısız değerlendirme");
  await page.getByRole("switch", { name: "CROSSFEED VALVE", exact: true }).click();
  await page.getByRole("button", { name: "Görevi değerlendir", exact: true }).click();
  await expect(page.locator(".mission-current")).toContainText("Görev koşulları sağlandı.");
  await expect(page.locator(".mission-current .metric").first()).toContainText("85");
});
test("keyboard component inspection and state-aware WHY dialog work", async ({ page }) => {
  await page.getByRole("button", { name: "Crossfeed valfi ayrıntıları", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Komponent seç")).toHaveValue("crossfeed");
  await page.locator(".right-rail .why").click();
  await expect(page.getByRole("dialog")).toContainText("Crossfeed CLOSED");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("mobile and tablet contain page overflow and retain controls, exam and lab access", async ({
  page,
}) => {
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await nav(page, "Simülasyon");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole("switch", { name: "LEFT PUMP 1", exact: true }).click();
    await expect(page.getByRole("switch", { name: "LEFT PUMP 1", exact: true })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await page.getByRole("switch", { name: "LEFT PUMP 1", exact: true }).click();
    await nav(page, "Deneyler");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await nav(page, "Öğrenme");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await nav(page, "Sınav provası");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/responsive-${width}.png`, fullPage: true });
  }
});

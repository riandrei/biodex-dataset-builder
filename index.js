const { chromium } = require("playwright");

const getStat = async (page, statIdentifier) => {
  const statContainer = await page.$(`div[data-source="${statIdentifier}"]`);

  if (statContainer === null) {
    return;
  }

  const statElement = await statContainer.$(`div`);
  const stat = await statElement.textContent();

  return stat;
};

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  // Navigate to a website
  const baseUrl = `https://tier-zoo.fandom.com/`;

  await page.goto(`${baseUrl}/wiki/Category:Builds`, { timeout: 180000 });

  await page.waitForSelector(".category-page__member-link");

  const builds = await page.$$(`.category-page__member-link`);

  for (const build of builds) {
    const page = await context.newPage();

    const link = await build.getAttribute(`href`);
    await page.goto(`${baseUrl}${link}`);

    const nameElement = await page.$(`.mw-page-title-main`);
    const name = await nameElement.textContent();

    const intelligence = await getStat(page, "intelligentice");
    const power = await getStat(page, "power");
    const defense = await getStat(page, "defence");
    const mobility = await getStat(page, "mobility");
    const health = await getStat(page, "health");
    const stealth = await getStat(page, "stealth");
    const tier = await getStat(page, "tier");
    const location = await getStat(page, "location");
    const time = await getStat(page, "time_period");

    console.log({
      name,
      intelligence,
      power,
      defense,
      mobility,
      health,
      stealth,
      tier,
      location,
      time,
    });

    await page.close();
  }

  await browser.close();
})();

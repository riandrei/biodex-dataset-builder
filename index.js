import "dotenv/config";
import { firefox } from "playwright";
import Build from "./Build.mjs";

async function getStat(page, statIdentifier) {
  const statContainer = await page.$(`div[data-source="${statIdentifier}"]`);

  if (statContainer === null) {
    return;
  }

  const statElement = await statContainer.$(`div`);
  const stat = await statElement.textContent();

  return stat;
}

async function buildExists(name) {
  try {
    const existingBuild = await Build.findOne({ name });
    if (existingBuild) {
      console.log(`Build already exists`, name);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error checking document existence:", error);
  }
}

(async () => {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseUrl = `https://tier-zoo.fandom.com`;

  let nextLink = `${baseUrl}/wiki/Category:Builds`;

  while (nextLink) {
    console.log(nextLink);
    await page.goto(nextLink, { timeout: 240000 });

    await page.waitForSelector(".category-page__member-link");

    const buildList = await page.$$(`.category-page__member-link`);

    for (const build of buildList) {
      const page = await context.newPage();

      const link = await build.getAttribute(`href`);

      await page.goto(`${baseUrl}${link}`, { timeout: 240000 });

      const nameElement = await page.$(`.mw-page-title-main`);
      const name = await nameElement.textContent();

      if (await buildExists(name)) {
        continue;
      }

      const intelligence = await getStat(page, "intelligentice");
      const power = await getStat(page, "power");
      const defense = await getStat(page, "defence");
      const mobility = await getStat(page, "mobility");
      const health = await getStat(page, "health");
      const stealth = await getStat(page, "stealth");
      const tier = await getStat(page, "tier");
      const server = await getStat(page, "location");
      const time = await getStat(page, "time_period");

      const newBuild = new Build({
        name,
        intelligence,
        power,
        defense,
        mobility,
        health,
        stealth,
        tier,
        server,
        time,
      });

      try {
        await newBuild.save();
        console.log("Build saved successfully", name);
      } catch (error) {
        console.error("Error saving build:", error);
      }

      await page.close();
    }

    await page.waitForSelector(`.category-page__pagination-next`);
    const nextButton = await page.$(`.category-page__pagination-next`);
    nextLink = await nextButton.getAttribute(`href`);
  }

  await page.goto(`https://chat.openai.com/`, { timeout: 300000 });

  await page.waitForSelector("button");
  const loginButton = await page.$("button");

  await loginButton.click();

  await page.waitForSelector("#username");
  const usernameInput = await page.$(`#username`);

  await usernameInput.fill(process.env.EMAIL);

  await page.waitForSelector(`button`);
  const continueButton = await page.$("button");

  await continueButton.click();

  await page.waitForSelector(`#password`);
  const passwordInput = await page.$(`#password`);

  await passwordInput.fill(process.env.PASSWORD);

  await page.waitForSelector(`._button-login-password`);
  const signInButton = await page.$("._button-login-password");

  await signInButton.click();

  await page.waitForSelector(`.btn.relative.ml-auto`);
  let nextButton = await page.$(`.btn.relative.ml-auto`);

  await nextButton.click();

  nextButton = await page.$(`.btn.relative.ml-auto`);

  await nextButton.click();

  nextButton = await page.$(`.btn.relative.ml-auto`);

  await nextButton.click();

  await page.waitForSelector(`#prompt-textarea`);
  const textarea = await page.$(`#prompt-textarea`);

  const initialPrompt = `Reference Paragraphs:
  1. The Domestic sheep is an F tier build playable in every server but Antarctica. Sheep are F tier because they are unable to live in the wild without a build protecting it. They are not stealthy and are unable to protect themselves. They get eliminated by bramble bushes (their prey) and have decent stats but can’t put them to good use. They are also farmed for usage by human mains.
  2. The aardvark is a build that is playable on the Savannah server. They are one of the key stone players as they are responsible for making burrows, which other players live in.
  3. The Painted Dog also know as the 'Cape Hunting Dog', 'Tricoloured Dog' or simply 'Wild Dog', is a highly social predator that hunts in large packs across the plains and bushland servers of Africa. They are arguably the most social of all canine builds, hunting in large packs which in past times possibly numbered in the hundreds.

  Every prompt after this one is going to be names of an animal or a plant. Create a concise, at most 3 sentences, description based on the reference paragraphs after I've inputted the name.`;

  await textarea.fill(initialPrompt);

  await page.waitForSelector(`.absolute.p-1`);
  const sendButton = await page.$(`.absolute.p-1`);

  await page.route("**/*", (route) => route.continue());

  await sendButton.click();

  await page.waitForResponse(
    (response) =>
      response.url() === "https://chat.openai.com/backend-api/moderations" &&
      response.status() === 200
  );

  const builds = await Build.find({});

  for (const [index, build] of builds.entries()) {
    textarea.fill(build.name);

    await page.route("**/*", (route) => route.continue());

    await sendButton.click();

    await page.waitForResponse(
      (response) =>
        response.url() === "https://chat.openai.com/backend-api/moderations" &&
        response.status() === 200
    );

    await page.waitForTimeout(30000);

    await page.waitForSelector(`.markdown`);

    const descriptionContainers = await page.$$(`.markdown`);
    const descriptionContainer =
      descriptionContainers[descriptionContainers.length - 1];
    const descriptionElement = await descriptionContainer.$(`p`);
    const descriptionText = await descriptionElement.textContent();

    const temporaryBuilds = [...builds];
    temporaryBuilds[index].description = descriptionText;
    builds = temporaryBuilds;
  }

  await browser.close();
})();

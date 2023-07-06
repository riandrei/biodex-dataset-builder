import "dotenv/config";
import { firefox } from "playwright";
import Build from "./Build.mjs";

const resourceExclusions = ["image", "stylesheet", "media", "font", "other"];
const baseUrl = `https://tier-zoo.fandom.com`;

(async () => {
  const browser = await firefox.launch();

  // Disables JavaScript
  let context = await browser.newContext({
    javaScriptEnabled: false,
  });

  let page = await context.newPage();

  // Blocks images, css, and other things
  await page.route("**/*", (route) => {
    return resourceExclusions.includes(route.request().resourceType())
      ? route.abort()
      : route.continue();
  });

  let nextLink = `${baseUrl}/wiki/Category:Builds`;
  const buildPromises = [];

  while (nextLink) {
    await page.goto(nextLink, { timeout: 240000 });

    // Gets all build elements
    await page.waitForSelector(".category-page__member-link");
    const buildList = await page.$$(`.category-page__member-link`);

    for (const build of buildList) {
      const link = await build.getAttribute(`href`);
      let name = link.slice(6, link.length).replaceAll("_", " ");
      name = name.replaceAll("%27", "'");

      if (await buildExists(name)) {
        continue;
      }

      // Pushes async functions to an array to run concurrently later
      buildPromises.push(
        (async () => {
          const buildPage = await context.newPage();
          await buildPage.goto(`${baseUrl}${link}`, { timeout: 240000 });

          const intelligence = await getStat(buildPage, "intelligentice");
          const power = await getStat(buildPage, "power");
          const defense = await getStat(buildPage, "defence");
          const mobility = await getStat(buildPage, "mobility");
          const health = await getStat(buildPage, "health");
          const stealth = await getStat(buildPage, "stealth");
          const tier = await getStat(buildPage, "tier");
          const server = await getStat(buildPage, "location");
          const time = await getStat(buildPage, "time_period");

          let imageUrl = "";

          try {
            await buildPage.waitForSelector(".pi-image-thumbnail");
            const imageContainer = await buildPage.$(".pi-image-thumbnail");
            imageUrl = await imageContainer.getAttribute("src");
          } catch (error) {
            imageUrl = null;
            console.log("Couldn't find image:", name);
          }

          if (!tier) {
            console.log("Not saving:", name);
            return;
          }

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
            imageUrl,
          });

          try {
            await newBuild.save();
            console.log("Build saved successfully:", name);
          } catch (error) {
            console.error("Error saving build:", error);
          }

          await buildPage.close();
        })()
      );
    }

    // Tries to get the link for the next page
    try {
      await page.waitForSelector(`.category-page__pagination-next`);
      const nextButton = await page.$(`.category-page__pagination-next`);
      nextLink = await nextButton.getAttribute(`href`);
    } catch (err) {
      nextLink = null;
    }
  }

  // Executes all the async functions in the buildPromises array concurrently
  await Promise.all(buildPromises);
  page.close();
  context.close();

  // Utilized playwright to make descriptions of the builds from chatGPT but probably smarter to just use the API
  // Just wanted to explore playwright more
  context = await browser.newContext();
  page = await context.newPage();

  // Blocks images, css, and other things
  await page.route("**/*", (route) => {
    return resourceExclusions.includes(route.request().resourceType())
      ? route.abort()
      : route.continue();
  });

  await page.goto(`https://chat.openai.com/`, { timeout: 240000 });

  await page.waitForLoadState();

  const waitForAndClick = async (page, selector, timeout) => {
    await page.waitForSelector(selector, { timeout });
    const button = await page.$(selector);
    await button.click();
    await page.waitForLoadState();
  };

  await waitForAndClick(page, "button");

  await page.waitForSelector("#username");
  const usernameInput = await page.$(`#username`);
  await usernameInput.fill(process.env.EMAIL);

  await waitForAndClick(page, "button");

  await page.waitForSelector(`#password`);
  const passwordInput = await page.$(`#password`);
  await passwordInput.fill(process.env.PASSWORD);

  await waitForAndClick(page, `._button-login-password`);

  await waitForAndClick(page, ".btn.relative.ml-auto");
  await waitForAndClick(page, ".btn.relative.ml-auto");
  await waitForAndClick(page, ".btn.relative.ml-auto");

  const textarea = await page.$(`#prompt-textarea`);
  const initialPrompt = `Reference Paragraphs:
  1. The Domestic sheep is an F tier build playable in every server but Antarctica. Sheep are F tier because they are unable to live in the wild without a build protecting it. They are not stealthy and are unable to protect themselves. They get eliminated by bramble bushes (their prey) and have decent stats but can’t put them to good use. They are also farmed for usage by human mains.
  2. The aardvark is a build that is playable on the Savannah server. They are one of the key stone players as they are responsible for making burrows, which other players live in.
  3. The Painted Dog also know as the 'Cape Hunting Dog', 'Tricoloured Dog' or simply 'Wild Dog', is a highly social predator that hunts in large packs across the plains and bushland servers of Africa. They are arguably the most social of all canine builds, hunting in large packs which in past times possibly numbered in the hundreds.

  Every prompt after this one is going to be names of an animal or a plant. Create a concise, at most 3 sentences, description based on the reference paragraphs after I've inputted the name.`;
  await textarea.fill(initialPrompt);

  await waitForAndClick(page, ".absolute.p-1");

  // Gets all the documents in my Build collection
  const builds = await Build.find({});

  for (const build of builds) {
    if (build.description) {
      console.log(build.name, " description already exists");
      continue;
    } else {
      await textarea.fill(build.name);

      await waitForAndClick(page, ".absolute.p-1");

      // Waits for the response to a POST request after inputting a prompt to chatGPT
      await page.waitForResponse(
        (response) =>
          response.url() ===
            "https://chat.openai.com/backend-api/moderations" &&
          response.status() === 200
      );

      // Added a timer of 50s after inputting to avoid hitting the limit of prompts per hour of chatGPT which causes an error
      await page.waitForTimeout(50000);

      // Gets all the element containing the responses of chatGPT and using the last element
      await page.waitForSelector(`.markdown`);
      const descriptionContainers = await page.$$(`.markdown`);
      const descriptionContainer =
        descriptionContainers[descriptionContainers.length - 1];
      const descriptionElement = await descriptionContainer.$(`p`);
      const description = await descriptionElement.textContent();

      // Tries to update the current build with a description
      try {
        await Build.updateOne({ name: build.name }, { description });
        console.log("Description added successfully:", build.name);
      } catch (error) {
        console.error("Error updating build:", error);
      }
    }
  }

  await page.close();
  await context.close();
  await browser.close();
})();

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

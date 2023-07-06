# Biodex Dataset Builder

A program designed to construct a dataset for my (WIP) Biodex website by scraping animal data from the [Tierzoo Wiki](https://tier-zoo.fandom.com/) and utilizing chatGPT to get descriptions for each animal.

## Getting Started

Instructions for running a copy of this project in your local machine.

### Prerequisites

Things you need to install and setup for the project if you don't have it.

1. NodeJS

   - Using pre-built installer: https://nodejs.dev/en/download/
   - Using package manager: https://nodejs.dev/en/download/package-manager/

2. MongoDB
   - Cloud: https://www.mongodb.com/docs/atlas/getting-started/#get-started-with-atlas
   - Local: https://www.mongodb.com/docs/manual/administration/install-community/

### Installing

Step by step instructions to run the project locally

1. Get a copy of the project  
   `git clone https://github.com/riandrei/biodex-dataset-builder.git`
2. Navigate to project directory  
   `cd biodex-dataset-builder`
3. Install project dependencies  
   `npm install`
4. Create a ".env" file in the project's root directory with the following template. Replace the {contents} with your specific details:  
   `EMAIL={chatGPT email}`  
   `PASSWORD={chatGPT password}`  
   `MONGODB_CONNECTION_STRING={mongoDB connection string}`
5. Start the application  
   `npm start`

You should now see your database filling up.

## Built with

- [NodeJS](https://nodejs.org/en) - JavaScript runtime environment
- [Playwright](https://playwright.dev/) - Automation Library

## API Keys and authentication

* A private API key must be passed to authenticate and use the FCA API.
* The FCA API key is registered as API_KEY_FCA in the .env. Storing these credentials in a .env is for security, they are excluded by default from being pushed to GitLab.
* The same environment variable is also set up in git to make sure that the tests requiring the key pass when run in the pipeline
* This field is not to be confused with API_KEY, which is another way to authenticate and secure our application internally

## CSV's

* All CSV's should be stored within the **/files** directory of the project. During **development**, this would be sitting just outside of the **/src** directory. And for a **built** version of the project, this folder would sit within the **/dist** directory.
* HMRC and Gambling Commission CSVs should be automatically scraped and downloaded by the application on launch. Storing those files in the directory mentioned previously.
* For the tests to run properly, these CSVs are required. If the scraping mechanism has not fetched the files for whatever reason, you will need to manually provide them. Currently, these files can be acquired from the following websites:
  * Gambling Commission CSVs ([**business-licence-register-licences.csv**](https://www.gamblingcommission.gov.uk/downloads/business-licence-register-licences.csv) & [**business-licence-register-businesses.csv**](https://www.gamblingcommission.gov.uk/downloads/business-licence-register-businesses.csv)): https://www.gamblingcommission.gov.uk/public-register/businesses/download.
  * HMRC Files (Needs Conversion from ODS to CSV - Scraping system would normally handle this): https://www.gov.uk/guidance/money-laundering-regulations-supervised-business-register

## CI/CD Configuration

* You will need to define in your local .env file the following:

```
CI=false
```

* This environment variable tells your machine when setting up the database to use ‘localhost’ as the host (rather than 'postgres' which is used on the pipeline docker container).

## Triggering the FCA individual

* This ENV variable acts as a feature-toggle for the Individual FCA API feature.

```properties
RUN_FCA_CHECK='false'
```

* The default is set as false due to clients' requirements, however to enable this function to execute, change the value to 'true'. If you would like the pipeline to do the same, then update the environment variable in GitLab too.

## Required fields for the .env - Production Environment

```properties
API_KEY=<a custom api key of your choosing>
API_KEY_FCA=<your fca API key>
RUN_FCA_CHECK='false'
CI=false
NODE_ENV=production
```

## Required fields for the .env - Test Envrionment

```properties
API_KEY=<a custom api key of your choosing>
API_KEY_FCA=<your fca API key>
RUN_FCA_CHECK='false'
CI=false
PORT=<yourport>
NODE_ENV=test
```

## Database

The database **schemas** and **tables** are all instantiated by the application when run, meaning the main setup required for the database is to simply **install** PostgreSQL, and start its service.

Though it is worth noting that currently the application **expects** the user `postgres` to be used, with the password `postgres`. Both of these values can however be changed within `src/database/setup/databasePool.ts`. Simply edit the user and password fields, replacing them with valid details for a database account you've set-up instead. The application will then use this account as expected.

If using a custom database user, within `src/database/setup/databasePool.ts` on line 5 you will also need to change the `postgres` username to the new one being used.

For further instructions on how to **install PostgreSQL**, please follow the link to an informative step-by-step instruction site below, detailing the different installation approaches based on your computers operating system.

- https://www.postgresqltutorial.com/postgresql-getting-started/install-postgresql/

**Video Tutorial for Windows**

- https://www.youtube.com/watch?v=yTT56NI2vUg

**Video Tutorial for MacOS**

- https://www.youtube.com/watch?v=wTqosS71Dc4

**Video Tutorial for Linux**

- https://www.youtube.com/watch?v=ovCwXUbJMEg&embeds_referring_euri=https%3A%2F%2Fwww.bing.com%2F&embeds_referring_origin=https%3A%2F%2Fwww.bing.com&source_ve_path=MTM5MTE4LDI4NjY2&feature=emb_logo

Once you have installed PostgreSQL, another great tool to help you further dissect our database is **pgAdmin 4**. This database management tool allows you to easily visualize and interact with our application's database, providing great features for database administration and querying. Below is a link for a video tutorial to help you with installation and usage.

**Video Tutorial on how to use Install and Use pgAdmin**

- https://www.youtube.com/watch?v=WFT5MaZN6g4

**Adding another table into the Database**

If there is a situation where you would like to add another table into the database for a different regulatory body, simply locate the 'setupDatabase.ts' file in /src/database/setup , and add your new table's SQL code into the 'createSchema' function, following suit of the other tables.

In order to insert into your new table you have created, navigate to the 'insertDataStandardiser.ts' in /src/database where our insert logic is held. Before you can insert the data you wish into this new table, you must define the data you're inserting in /src/types/databaseInsertTypes.ts. Here you will find previously declared dataset definitions for gambling commission and hmrc, simply follow suit. Then import your data 'type' into the 'insertDataStandardiser.ts' and add your dataset as a parameter to the function 'insertDataStandardiser'. Now add another 'else if' clause to this function and implement your insertion logic here, try to ensure cohesion with the rest of the file.

If you would like to select from your new table, navigate to 'queries.ts' in /src/database and add another switch case for your regulatory body.

## Scraping and Automation:

- To download files from other bodies you could copy and paste the CSS selectors of the file div on their own websites and pass it to the scrapeWebsite method and you should also pass the URL to it.
- You do this by calling **`scrapeWebsite()`** with its new parameters in the **`scrapingAllFiles()`** method which can be found in `scraping/fetchingFiles.ts`.
- The other step would be to add another else if statement in the **`scrapeWebsite()`** method such as the example below:

  ```typescript
  			} else if (href?.endsWith('.csv')) {
  				returnedHref = href;
  				console.log(returnedHref);
  				await downloadCsvFile(href, './files/Supervised_Business_Register.csv');
  
  ```

The changes you have to make are:

* Changing what the href ends with, as in the word of the href and its file type, ideally a CSV file.
* Change the second parameter of the **`downloadCsvFile()`** function to a suitable name for the CSV file you want to download.

When it comes to automation:

* To run the **`scheduleFetching()`** method (the scraping automation method) uncomment it out in index.ts line 14.
* To change the schedule in **"cron.schedule('\*/5 \* \* \* \* \*'"** to when it's supposed to run follow the guide below to see what each star represents, the code is found in file **`scheduleFetchingCsvFiles.ts`** : https://www.npmjs.com/package/node-cron
* If you want it to run weekly on Sunday 12am change it to **`'0 0 * * 0'`**

**For more detailed information on the codebase please refer to the pages under Documentation.**

## Commands to run the project

**Given all set-up has been completed e.g., ENV file, database downloaded etc.**

**If you have been provided with our .zip file containing the software solution.**

The three basic steps to have completed before doing anything else are:

1. Extract the contents of the .zip to anywhere you would like.
2. Open a terminal pointed at the directory the .zip contents have been extracted to.
3. Run `npm install` in the same directory as the package.json file.

**From here, to run the application:**

* In the terminal pointing at where the .zip contents have been extracted, run: `node ./dist/index.js`

The application should now be running.

**To build the application again:**

* In the terminal pointing at where the .zip contents have been extracted, run: `npm run build`

The application should now be built using the contents of the **/src** directory.

**To run the Jest test suites:**

* In the terminal pointing at where the .zip contents have been extracted, run: `npm run test`

The test suites should run.

**To run the application in a development, hot-reload environment:**

* In the terminal pointing at where the .zip contents have been extracted, run: `npm run dev`

The application should auto-detect changes to any of the files in the /src directory and hot-reload the index.ts file.
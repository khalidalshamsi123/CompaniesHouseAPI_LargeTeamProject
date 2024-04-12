import axios, {type AxiosResponse} from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import {convertToCsv} from './odsToCsv';
/**
 *
 * @param hrefLink
 * @param fileName
 * @returns fileData
 * This method downloads the files by writing new files.
 * This method uses axios to retrieve the data.
 */
async function downloadCsvFile(hrefLink: string, fileName: string) {
	try {
		const hrefResponse: AxiosResponse<ArrayBuffer> = await axios.get(hrefLink, {responseType: 'arraybuffer'});

		const fileData = Buffer.from(hrefResponse.data);
		// Download the file
		fs.writeFile(fileName, fileData, () => {
			// Console.log('csv file downloaded!');
		});
		return fileData;
	} catch (error) {
		console.error('Error occurred while downloading:', error);
	}
}

/**
 *
 * @param elementsPath
 * @param websiteLink
 * @returns returnedHref
 * This method scrapes the websites bt traversing through the css selectors passed to it
 * 'elementsPath'.
 * The methods has 4 if statements, each for different files. The first two are for the gambling commission
 * csv files. The problem with the gambling commission website is that when its scraped, the href of the div
 * that contains the csv files isnt the full URL which is why i had to hardcode the baseURL and add it to the retrieved href.
 * As for the HMRC website i had to make two different if conditions one for if it was a csv file, which was the case initially,
 * and the other condition is if the file was an ODS file, which is the file type they provide now in which i would have to convert to csv.
 * The reason it was kept is for the uncertainty of the fact that the file type might change back to csv again.
 */
async function scrapeWebsite(elementsPath: string, websiteLink: string) {
	try {
		// This is disabled because i need the type to be buffer for it to work.
		// eslint-disable-next-line @typescript-eslint/ban-types
		const response: AxiosResponse<string | Buffer> = await axios.get(websiteLink);

		const $ = cheerio.load(response.data);
		let returnedHref = 'empty';
		const gamblingBaseUrl = 'https://www.gamblingcommission.gov.uk';

		const elements = $(elementsPath);

		// Traversing through the html elements using css selectors
		const promises = elements.map(async (index, element) => {
			// Find the href
			let href = $(element).attr('href');
			// Checks if the file ends with businesses.csv, this is exclusive to gambling commission.
			if (href?.endsWith('businesses.csv')) {
				href = gamblingBaseUrl + href;
				returnedHref = href;
				console.log(returnedHref);
				await downloadCsvFile(href, './business-licence-register-businesses.csv');
			// This checks if the href ends with licences.csv and is exclusive to the license gambling commission file.
			} else if (href?.endsWith('licences.csv')) {
				href = gamblingBaseUrl + href;
				returnedHref = href;
				console.log(returnedHref);
				await downloadCsvFile(href, './business-licence-register-licences.csv');
			// This checks if the href ends with csv and is exclusive to the HMRC website
			} else if (href?.endsWith('.csv')) {
				returnedHref = href;
				console.log(returnedHref);
				await downloadCsvFile(href, './HmrcFile.csv');
			// This checks if the href ends with ods and is exlusive t the HMRC.
			// This part also converts the ods file to a csv file.
			} else if (href?.endsWith('.ods')) {
				returnedHref = href;
				console.log(returnedHref);
				const downloadedOdsFile = await downloadCsvFile(href, './temphmrcfile.ods');
				await convertToCsv(downloadedOdsFile, './HmrcFile.csv');
			}
		}).get();

		await Promise.all(promises);

		return returnedHref;
	} catch (error) {
		console.error('Error occurred during scraping:', error);
		return 'error';
	}
}

export {scrapeWebsite, downloadCsvFile};

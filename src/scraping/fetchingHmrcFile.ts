import axios, {type AxiosResponse} from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import {convertToCsv} from './odsToCsv';

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

async function scrapeWebsite(elementsPath: string, websiteLink: string) {
	try {
		// This is disabled because i need the type to be buffer for it to work.
		// eslint-disable-next-line @typescript-eslint/ban-types
		const response: AxiosResponse<string | Buffer> = await axios.get(websiteLink);

		const $ = cheerio.load(response.data);
		let returnedHref = 'empty';

		const elements = $(elementsPath);

		// Traversing through the html elements using css selectors
		const promises = elements.map(async (index, element) => {
			// Find the href
			let href = $(element).attr('href');
			// Checks if the file ends with businesses.csv, this is exlusive to gambling commission.
			if (href?.endsWith('businesses.csv')) {
				href = 'https://www.gamblingcommission.gov.uk' + href;
				returnedHref = href;
				console.log(returnedHref);
				await downloadCsvFile(href, './business-licence-register-businesses.csv');
			// This checks if the href ends with licences.csv and is exclusive to the license gambling commission file.
			} else if (href?.endsWith('licences.csv')) {
				href = 'https://www.gamblingcommission.gov.uk' + href;
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

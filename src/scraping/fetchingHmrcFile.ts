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

async function scrapeHmrcWebsite(elementsPath: string) {
	try {
	// eslint-disable-next-line @typescript-eslint/ban-types
		const hmrcResponse: AxiosResponse<string | Buffer> = await axios.get('https://www.gov.uk/guidance/money-laundering-regulations-supervised-business-register');

		const $ = cheerio.load(hmrcResponse.data);
		let returnedHref = 'empty';

		// Traversing through the html elements using css selectors
		$(elementsPath)
			.each(async (index, element) => {
				// Find the href
				const href = $(element).attr('href');
				// Check if the file is of type csv or ods
				if (href && href.endsWith('.csv')) {
					returnedHref = href;
					console.log(returnedHref);
					await downloadCsvFile(href, './newHmrcFile.csv');
				} else if (href && href.endsWith('.ods')) {
					returnedHref = href;
					console.log(returnedHref);
					const downloadedOdsFile = await downloadCsvFile(href, './temphmrcfile.ods');
					await convertToCsv(downloadedOdsFile);
				}
			});
		return returnedHref;
	} catch (error) {
		console.error('Error occurred during scraping:', error);
		return 'error';
	}
}

export {scrapeHmrcWebsite, downloadCsvFile};

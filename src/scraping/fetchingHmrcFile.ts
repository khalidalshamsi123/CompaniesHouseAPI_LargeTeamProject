import axios, {type AxiosResponse} from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function downloadCsvFile(hrefLink: string) {
	try {
		const hrefResponse: AxiosResponse<ArrayBuffer> = await axios.get(hrefLink, {responseType: 'arraybuffer'});

		const fileData = Buffer.from(hrefResponse.data);
		fs.writeFile('./testhmrcfile.csv', fileData, () => {
			console.log('csv file downloaded!');
		}); // Save as a CSV file
	} catch (error) {

	}
}

async function scrapeHmrcWebsite() {
	try {
	// eslint-disable-next-line @typescript-eslint/ban-types
		const hmrcResponse: AxiosResponse<string | Buffer> = await axios.get('https://www.gov.uk/guidance/money-laundering-regulations-supervised-business-register');

		const $ = cheerio.load(hmrcResponse.data);

		// Traversing through the html elements
		$('body #wrapper #content .govuk-grid-row .govuk-grid-column-two-thirds #contents .gem-c-govspeak.govuk-govspeak .govspeak p .gem-c-attachment-link .govuk-link')
			.each(async (index, element) => {
				// Find the href
				const href = $(element).attr('href');
				// Check if the file is of type csv
				if (href && href.endsWith('.csv')) {
					console.log(href);
					await downloadCsvFile(href);
				}
			});
	} catch (error) {
		console.error('Error occurred during scraping:', error);
	}
}

export {scrapeHmrcWebsite};

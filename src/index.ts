import app from './app';

import * as dotenv from 'dotenv';
import type {CsvKeys} from './types/GamblingCommissionTypes';
import StandardiserInterface from './components/standardiserInterface';
import {scrapingAllFiles} from './scraping/fetchingFiles';

dotenv.config();

(async () => {
	try {
		await scrapingAllFiles();
		// Create an instance
		const uploader = new StandardiserInterface();
		const csvKeys: CsvKeys[] = ['businessesCsv', 'licencesCsv'];
		await uploader.processInput(csvKeys, 'registration_schema');

		const csvHmrcKeys: CsvKeys[] = ['hmrcCsv'];
		await uploader.processInput(csvHmrcKeys, 'registration_schema');
	} catch (e) {
		console.error(e);
	}
})();

// Configure port and start listening for requests.
const port = process.env.port ?? 5000;

app.listen(port, () => {
	console.log(`Listening on port ${port}.`);
});

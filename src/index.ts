import app from './app';

import * as dotenv from 'dotenv';
import {createSchema} from './database/setup/setupDatabase';
import {HmrcCsvUploader} from './components/HMRC/HMRC';
import GamblingCommission from './components/GamblingCommission/GamblingCommission';
import type {CsvKeys} from './types/GamblingCommissionTypes';

dotenv.config();

createSchema()
	.then(() => {
		console.log('Schema creation completed successfully.');
		// Any additional code to run after schema creation
	})
	.catch(error => {
		console.error('Schema creation failed:', error);
		// Handle errors if necessary
	});

// Create an instance of HmrcCsvUploader
const uploader = new HmrcCsvUploader();

// Call the uploadHmrcCsv method with the csvKey parameter
uploader.uploadHmrcCsv('hmrcCsv').catch(console.error);

// Create an instance of HmrcCsvUploader
const gcUploader = new GamblingCommission();
const csvKeys: CsvKeys[] = ['businessesCsv', 'licencesCsv'];
gcUploader.uploadCsv(csvKeys, 'registration_schema').catch(console.error);

// Configure port and start listening for requests.
const port = process.env.port ?? 5000;

app.listen(port, () => {
	console.log(`Listening on port ${port}.`);
});

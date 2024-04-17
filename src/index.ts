import app from './app';

import * as dotenv from 'dotenv';
import type {CsvKeys} from './types/GamblingCommissionTypes';
import StandardiserInterface from './components/standardiserInterface';

dotenv.config();

// Create an instance
const uploader = new StandardiserInterface();
const csvKeys: CsvKeys[] = ['businessesCsv', 'licencesCsv'];
uploader.processInput(csvKeys, 'registration_schema').catch(console.error);

const csvHmrcKeys: CsvKeys[] = ['hmrcCsv'];
uploader.processInput(csvHmrcKeys, 'registration_schema').catch(console.error);

// Configure port and start listening for requests.
const port = process.env.port ?? 5000;

app.listen(port, () => {
	console.log(`Listening on port ${port}.`);
});

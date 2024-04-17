import app from './app';

import * as dotenv from 'dotenv';
import {createSchema} from './database/setup/setupDatabase';
import GamblingCommission from './components/GamblingCommission/GamblingCommission';
import type {CsvKeys} from './types/GamblingCommissionTypes';
import StandardiserInterface from "./components/standardiserInterface";

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

const csvKeys = ['businessesCsv', 'licencesCsv', 'hmrcCsv'] as CsvKeys[];
// Create new instance of standardiser interface class
const standardiserInterface = new StandardiserInterface();
// Process all the csv keys to update the database from files for all commissions.
standardiserInterface.processInput(csvKeys,'registration_schema');

// Configure port and start listening for requests.
const port = process.env.port ?? 5000;

app.listen(port, () => {
	console.log(`Listening on port ${port}.`);
});

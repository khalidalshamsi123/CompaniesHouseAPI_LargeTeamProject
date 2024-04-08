import {Readable} from 'node:stream';
import build from '../components/GamblingCommission/GamblingCommissionFactory';
import pool from '../database/setup/databasePool';
import {type CsvKeys} from '../types/GamblingCommissionTypes';

import fs from 'node:fs';
import {
	clearTestDatabase, setupTestDatabase, createTestGamblingCommissionTables, deleteRowsFromTestTable,
} from '../utils/databaseTestFuncs';

beforeAll(async () => {
	await clearTestDatabase();
	await setupTestDatabase();
	await createTestGamblingCommissionTables();
});

// Before each test delete the contents added by the previous from the tables.
beforeEach(async () => {
	await deleteRowsFromTestTable('business_licence_register_businesses');
	await deleteRowsFromTestTable('business_licence_register_licences');
});

afterAll(async () => {
	await pool.end(); // Make sure to close the database pool
	jest.clearAllMocks();
});

// Create a readable stream from provided mock CSV data.
const createMockReadStream = (mockCsvData: string) => {
	const mockReadStream = new Readable({
		read() {
			this.push(mockCsvData);
			this.push(null); // Signal the end of the stream
		},
	});
	return mockReadStream;
};

//  Scenario: Multiple CSV keys are provided.

// Given.
describe('Given multiple valid Gambling Commission CSVs are available locally and are ready to process.', () => {
	const spy = jest.spyOn(fs, 'createReadStream').mockImplementation((...args): fs.ReadStream => {
		// Configure mock CSV data to return in a stream based on file argument recieved.
		let mockCsvData = '';
		if (args[0] === './files/business-licence-register-businesses.csv') {
			mockCsvData
            = `Account Number,Licence Account Name
            2892,John Owns a Successful Business Limited`;
		} else if (args[0] === './files/business-licence-register-licences.csv') {
			// Need to include trailing comma at end of string to signify that End Date value is null/blank.
			mockCsvData
            = `Account Number,Licence Number,Status,Type,Activity,Start Date,End Date
			2892,010129-N-123764-001,Active,Remote,General Betting Limited,2002-02-03T00:00:00+00:00,`;
		}

		// Return a readable stream akin to fs.ReadStream with the valid mock data.
		return createMockReadStream(mockCsvData) as unknown as fs.ReadStream;
	});

	// When.
	describe('When the upload process is started with the relevant CSV keys.', () => {
		// Then.
		it('Then the temporary database tables should be updated with the new information.', async () => {
			const gcInstance = await build();

			const csvKeys: CsvKeys[] = ['businessesCsv', 'licencesCsv'];
			await gcInstance.uploadCsv(csvKeys, 'test_schema');

			// Two files should have been 'read'.
			expect(spy).toHaveBeenCalledTimes(2);

			// Temporary tables should have had the new row added. Keep in mind that before this test began, the tables were wiped clean.
			const businessesResults = await pool.query('SELECT * FROM test_schema.business_licence_register_businesses');
			const licencesResults = await pool.query('SELECT * FROM test_schema.business_licence_register_licences');

			// Check that the CSV data has been succesfully uploaded.
			expect(businessesResults.rows[0].account_number).toBe('2892');
			expect(businessesResults.rows[0].licence_account_name).toBe('John Owns a Successful Business Limited');

			expect(licencesResults.rows[0]).toStrictEqual({
				// eslint-disable-next-line @typescript-eslint/naming-convention
				account_number: '2892',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				licence_number: '010129-N-123764-001',
				status: 'Active',
				type: 'Remote',
				activity: 'General Betting Limited',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				start_date: new Date('2002-02-03T00:00:00.000Z'),
				// eslint-disable-next-line @typescript-eslint/naming-convention
				end_date: null,
			});
		});
	});
});

// Scenario: Ensure business CSV is processed first.

// Given.
describe('Given multiple CSVs are included, and the business information CSV is one of them.', () => {
	const spy = jest.spyOn(fs, 'createReadStream').mockImplementation((...args): fs.ReadStream => {
		// Configure mock CSV data to return in a stream based on file argument recieved.
		let mockCsvData = '';
		if (args[0] === './files/business-licence-register-businesses.csv') {
			mockCsvData
            = `Account Number,Licence Account Name
            2892,John Owns a Successful Business Limited`;
		} else if (args[0] === './files/business-licence-register-licences.csv') {
			// Need to include trailing comma at end of string to signify that End Date value is null/blank.
			mockCsvData
            = `Account Number,Licence Number,Status,Type,Activity,Start Date,End Date
			2892,010129-N-123764-001,Active,Remote,General Betting Limited,2002-02-03T00:00:00+00:00,`;
		}

		// Return a readable stream akin to fs.ReadStream with the valid mock data.
		return createMockReadStream(mockCsvData) as unknown as fs.ReadStream;
	});

	// When.
	describe('When the upload process is started with the relevant CSV keys.', () => {
		// Then.
		it('Then the business information CSV should be processed first.', async () => {
			const gcInstance = await build();

			const csvKeys: CsvKeys[] = ['businessesCsv', 'licencesCsv'];
			await gcInstance.uploadCsv(csvKeys, 'test_schema');

			// We expect that the first file processed was the business information csv.
			expect(spy).toHaveBeenNthCalledWith(1, './files/business-licence-register-businesses.csv');
		});
	});
});


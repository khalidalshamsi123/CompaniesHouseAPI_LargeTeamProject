import {Readable} from 'node:stream';
import {
	clearTestDatabase, setupTestDatabase, createTestGamblingCommissionTables, deleteRowsFromTestTable,
} from '../utils/databaseTestFuncs';
import pool from '../database/setup/databasePool';

import fs from 'node:fs';
import build from '../components/GamblingCommission/GamblingCommissionFactory';
import {type CsvKeys} from '../types/GamblingCommissionTypes';

jest.mock('../components/TableSnapshot/SnapshotManager');

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

// Scenario: Successful processing of CSV with rows containing empty column values.

// Given.
describe('Given valid CSV data containing a row with a null column value that isnt preceded by a delimiter (,).', () => {
	const spy = jest.spyOn(fs, 'createReadStream').mockImplementation((...args): fs.ReadStream => {
		// Configure mock CSV data to return in a stream based on file argument recieved.
		let mockCsvData = '';
		if (args[0] === './files/business-licence-register-businesses.csv') {
			mockCsvData
            = `Account Number,Licence Account Name
            2892,John Owns a Successful Business Limited`;
		} else if (args[0] === './files/business-licence-register-licences.csv') {
			// We don't include the trailing comma to test that the pre-processing works properly.
			mockCsvData
            = `Account Number,Licence Number,Status,Type,Activity,Start Date,End Date
			2892,010129-N-123764-001,Active,Remote,General Betting Limited,2002-02-03T00:00:00+00:00`;
		}

		// Return a readable stream akin to fs.ReadStream with the valid mock data.
		return createMockReadStream(mockCsvData) as unknown as fs.ReadStream;
	});

	// When.
	describe('When the Gambling Commissions local update occurs.', () => {
		// Then.
		it('Then the valid Gambling Commission CSV should be processed and uploaded to the database.', async () => {
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

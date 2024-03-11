import pool from '../database/databasePool';

import fs from 'node:fs';

import {
	clearTestDatabase, setupTestDatabase, deleteTableFromTestDatabase, createTestGamblingCommissionTables,
} from '../utils/databaseTestFuncs';
import gamblingCommission from '../components/GamblingCommission/GamblingCommission';

import {Readable} from 'node:stream';

beforeAll(async () => {
	await setupTestDatabase();
});

afterAll(async () => {
	await clearTestDatabase();
	jest.resetAllMocks();
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

// Scenario: Creation of the database schemas.

// Given.
describe('Given Gambling Commission CSV data is in expected format. Given the CSV is available locally.', () => {
	it('Given no tables for the gambling commission exist.', async () => {
		await deleteTableFromTestDatabase('business_licence_register_businesses');
		await deleteTableFromTestDatabase('business_licence_register_licences');
	});

	// Dummy data.
	const mockCsvData
        = `Account Number,Licence Account Name
        2895,John Owns a Business Limited`;
	const mockCsvStream = createMockReadStream(mockCsvData);

	// Mock the fs.createReadStream() method so it returns the Readable stream we have created.
	// Simulates the reading of the relevant CSV with fs.
	jest.spyOn(fs, 'createReadStream').mockReturnValue(mockCsvStream as unknown as fs.ReadStream);

	// When.
	describe('When the update procedure is triggered, with a valid key given.', () => {
		// Then.
		it('Then a table should be created for the CSV, and be populated with its data.', async () => {
			// We create a instance of GamblingCommission directly instead of using the factory.
			// This is because the factory method only serves to ensure the tables needed for the production
			// environment are created.

			// So, bypassing it and instead creating the test tables we plan to use seems like a better option to me.
			await createTestGamblingCommissionTables();

			const gcInstance = new gamblingCommission();
			// Call the classes method, this should create a table called business_licence_register_businesses.
			// And populate it with the mocked CSV data.
			await gcInstance.uploadCsv('businessesCsv', 'test_schema');

			const result = await pool.query('SELECT * FROM test_schema.business_licence_register_businesses');
			// Check that the CSV data has been succesfully uploaded.
			expect(result.rows[0].account_number).toBe('2895');
			expect(result.rows[0].licence_account_name).toBe('John Owns a Business Limited');
		});
	});
});

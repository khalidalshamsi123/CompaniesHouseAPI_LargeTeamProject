import pool from '../database/setup/databasePool';

import fs, {type ReadStream} from 'node:fs';

import {
	clearTestDatabase, setupTestDatabase, createTestGamblingCommissionTables, deleteRowsFromTestTable,
} from '../utils/databaseTestFuncs';

import {Readable} from 'node:stream';

import GamblingCommission from '../components/GamblingCommission/GamblingCommission';
import build from '../components/GamblingCommission/GamblingCommissionFactory';
import {type CsvKeys} from '../types/GamblingCommissionTypes';

import request from 'supertest';
import app from '../app';

const uploadGamblingCommissionEndpoint = '/upload/gambling-commission';

const apiKey = process.env.API_KEY!;

beforeAll(async () => {
	await clearTestDatabase();
	await setupTestDatabase();
	await createTestGamblingCommissionTables();

	// Mock out the call for the next step of processing - aggregation of temporary tables.
	// Within this test suite we are only testing the uploading of CSV data to temporary tables.
	jest.spyOn(GamblingCommission.prototype as any, 'aggregateTemporaryTableData').mockReturnThis();
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

// Obtain a reference to the original method, ensuring it's properly typed.
const originalUploadCsv: typeof GamblingCommission.prototype.uploadCsv = GamblingCommission.prototype.uploadCsv;

// Scenario: Store valid Gambling Commission CSV data (from file).

// Given.
describe('Given I have provided a valid Gambling Commission CSV file locally to the application.', () => {
	// Dummy data.
	const mockCsvData
        = `Account Number,Licence Account Name
        2895,John Owns a Business Limited`;
	const mockCsvStream = createMockReadStream(mockCsvData);

	// Mock the fs.createReadStream() method so it returns the Readable stream we have created.
	// Simulates the reading of the relevant CSV with fs.
	jest.spyOn(fs, 'createReadStream').mockReturnValue(mockCsvStream as unknown as fs.ReadStream);

	// When.
	describe('When I trigger the upload, specifying what file to update using.', () => {
		// Then.
		it('Then the CSV data should be successfully stored in the database under the relevant table.', async () => {
			const gcInstance = await build();
			// Call the classes method, this should create a table called business_licence_register_businesses.
			// And populate it with the mocked CSV data.
			const csvKeys: CsvKeys[] = ['businessesCsv'];
			await gcInstance.uploadCsv(csvKeys, 'test_schema');

			const result = await pool.query('SELECT * FROM test_schema.business_licence_register_businesses');
			// Check that the CSV data has been succesfully uploaded.
			expect(result.rows[0].account_number).toBe('2895');
			expect(result.rows[0].licence_account_name).toBe('John Owns a Business Limited');
		});
	});
});

// Scenario: Store valid Gambling Commission CSV data.

// Given.
describe('Given I have valid CSV data from the Gambling Commission available.', () => {
	// When.
	describe('When I upload the file to the /upload/gambling-commission endpoint, specifying what Gambling Commission CSV it is.', () => {
		// Then.
		it('Then the data should be successfully stored in the database under the relevant table.', async () => {
			// Dummy data.
			const mockBusinessesCsvData
			= `Account Number,Licence Account Name
			12051,Hamed Solutions Limited`;

			const mockLicencesCsvData
			= `Account Number,Licence Number,Status,Type,Activity,Start Date,End Date
			500,010129-N-103064-001,Active,Non-Remote,General Betting Limited,2002-02-03T00:00:00+00:00,
			330,012179-N-105324-221,Surrendered,Remote,General Betting Limited,2002-02-03T00:00:00+00:00,2023-11-28T00:00:00+00:00`;

			/* Mock the methods implementation once in a way that doesn't risk incurring a infinite loop through referencing the same mock object. */
			jest.spyOn(GamblingCommission.prototype, 'uploadCsv')
				.mockImplementationOnce(async function (this: GamblingCommission, data, _schema: string) {
					// Intercept the function call, and re-call the method, providing the test_schema instead.
					return originalUploadCsv.call(this, data, 'test_schema');
				});

			await request(app)
				.post(uploadGamblingCommissionEndpoint)
				.set('x-api-key', apiKey)
				.attach('businessesCsv', createMockReadStream(mockBusinessesCsvData) as unknown as ReadStream, {
					filename: 'businessesCsv.csv',
					contentType: 'text/csv',
				})
				.attach('licencesCsv', createMockReadStream(mockLicencesCsvData) as unknown as ReadStream, {
					filename: 'licencesCsv.csv',
					contentType: 'text/csv',
				}).expect(200);

			// Test that business_licence_register_businesses table has been updated successfully.
			const businessesResults = await pool.query('SELECT * FROM test_schema.business_licence_register_businesses');

			// Test that business_licence_register_licences table has been updated successfully.
			const licencesResults = await pool.query('SELECT * FROM test_schema.business_licence_register_licences');

			// Expects need to be after async operations.

			expect(businessesResults.rows[0].account_number).toBe('12051');
			expect(businessesResults.rows[0].licence_account_name).toBe('Hamed Solutions Limited');

			expect(licencesResults.rows).toStrictEqual([{
				// eslint-disable-next-line @typescript-eslint/naming-convention
				account_number: '500',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				licence_number: '010129-N-103064-001',
				status: 'Active',
				type: 'Non-Remote',
				activity: 'General Betting Limited',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				start_date: new Date('2002-02-03T00:00:00.000Z'),
				// eslint-disable-next-line @typescript-eslint/naming-convention
				end_date: null,
			},
			{
				// eslint-disable-next-line @typescript-eslint/naming-convention
				account_number: '330',
				activity: 'General Betting Limited',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				end_date: new Date('2023-11-28T00:00:00.000Z'),
				// eslint-disable-next-line @typescript-eslint/naming-convention
				licence_number: '012179-N-105324-221',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				start_date: new Date('2002-02-03T00:00:00.000Z'),
				status: 'Surrendered',
				type: 'Remote',
			}]);
		});
	});
});

// Scenario: Missing or mismatching columns.

// Given.
describe('Given I have a CSV file with differing columns to that of the Gambling Commission CSVs.', () => {
	// When.
	describe('When I upload the file to the /upload/gambling-commission endpoint, specifying what Gambling Commission file it is.', () => {
		// Then.
		it('Then an error should be thrown. And no changes should be made to the database.', async () => {
			// Inserting some existing data. Will showcase how using a transaction will result in original data not being compromised.
			const insertQuery = 'INSERT INTO test_schema.business_licence_register_businesses(account_number, licence_account_name) VALUES ($1, $2)';
			const insertValues = ['8842', 'Khalid Entertainment Limited'];

			await pool.query(insertQuery, insertValues);

			// Dummy data - invalid format (missing or mismatching columns).
			const mockBusinessesCsvData
			= `Licence Account Name
			12051,Hamed Solutions Limited`;

			const mockLicencesCsvData
			= `Account Number,Licence Number,Status,Type,Activity,Start Date,End Date
			wrongdatatype,010129-N-103064-001,Active,Non-Remote,General Betting Limited,2002-02-03T00:00:00+00:00,
			330,012179-N-105324-221,Surrendered,Remote,General Betting Limited,2002-02-03T00:00:00+00:00,2023-11-28T00:00:00+00:00`;

			/* Mock the methods implementation once in a way that doesn't risk incurring a infinite loop through referencing the same mock object. */
			jest.spyOn(GamblingCommission.prototype, 'uploadCsv')
				.mockImplementationOnce(async function (this: GamblingCommission, data, _schema: string) {
					// Intercept the function call, and re-call the method, providing the test_schema instead.
					return originalUploadCsv.call(this, data, 'test_schema');
				});

			await request(app)
				.post(uploadGamblingCommissionEndpoint)
				.set('x-api-key', apiKey)
				.attach('businessesCsv', createMockReadStream(mockBusinessesCsvData) as unknown as ReadStream, {
					filename: 'businessesCsv.csv',
					contentType: 'text/csv',
				})
				.attach('licencesCsv', createMockReadStream(mockLicencesCsvData) as unknown as ReadStream, {
					filename: 'licencesCsv.csv',
					contentType: 'text/csv',
				// Unproccessable entity.
				}).expect(422);

			// Test that business_licence_register_businesses table has been left in its original state.
			const businessesResults = await pool.query('SELECT * FROM test_schema.business_licence_register_businesses');

			// Test that business_licence_register_licences table has been left in its original state.
			const licencesResults = await pool.query('SELECT * FROM test_schema.business_licence_register_licences');

			// Existng data should not be replaced, or deleted. As the request and by extension transaction should have failed.
			expect(businessesResults.rows[0].account_number).toBe('8842');
			expect(businessesResults.rows[0].licence_account_name).toBe('Khalid Entertainment Limited');
			// No data should be added, as it's invalid.
			expect(licencesResults.rows).toStrictEqual([]);
		});
	});
});

// Scenario: Handle invalid MIME type.

// Given.
describe('Given I have a file that does not have the MIME type text/csv.', () => {
	// When.
	describe('When I upload the file to the /upload/gambling-commission endpoint, specifying what Gambling Commission file it is.', () => {
		// Then.
		it('Then an error should be thrown. And no changes should be made to the database.', async () => {
			// Inserting some existing data. Will showcase how using a transaction will result in original data not being compromised.
			const insertQuery = 'INSERT INTO test_schema.business_licence_register_businesses(account_number, licence_account_name) VALUES ($1, $2)';
			const insertValues = ['4321', 'Jack of All Trades PLC'];

			await pool.query(insertQuery, insertValues);

			// Dummy data - invalid mimetype.
			const mockBadMimeTypeData
			= 'hello';

			/* Mock the methods implementation once in a way that doesn't risk incurring a infinite loop through referencing the same mock object. */
			jest.spyOn(GamblingCommission.prototype, 'uploadCsv')
				.mockImplementationOnce(async function (this: GamblingCommission, data, _schema: string) {
					// Intercept the function call, and re-call the method, providing the test_schema instead.
					return originalUploadCsv.call(this, data, 'test_schema');
				});

			await request(app)
				.post(uploadGamblingCommissionEndpoint)
				.set('x-api-key', apiKey)
				.attach('businessesCsv', createMockReadStream(mockBadMimeTypeData) as unknown as ReadStream, {
					filename: 'businessesCsv',
					// Invalid mimetype.
					contentType: 'text',
				// Unproccessable entity.
				}).expect(422);

			// Test that business_licence_register_businesses table has been left in its original state.
			const businessesResults = await pool.query('SELECT * FROM test_schema.business_licence_register_businesses');

			// Test that business_licence_register_licences table has been left in its original state.
			const licencesResults = await pool.query('SELECT * FROM test_schema.business_licence_register_licences');

			// Existng data should not be replaced, or deleted. As the request and by extension transaction should have failed.
			expect(businessesResults.rows[0].account_number).toBe('4321');
			expect(businessesResults.rows[0].licence_account_name).toBe('Jack of All Trades PLC');
			// No data should be added, as it's invalid.
			expect(licencesResults.rows).toStrictEqual([]);
		});
	});
});

// Scenario: File given not recognised.

// Given.
describe('Given I have a CSV file.', () => {
	// When.
	describe('When I attempt to upload the CSV data without specifying what file it is properly.', () => {
		// Then.
		it('Then an error should be thrown. And no changes should be made to the database.', async () => {
			// Inserting some existing data. Will showcase how using a transaction will result in original data not being compromised.
			const insertQuery = 'INSERT INTO test_schema.business_licence_register_businesses(account_number, licence_account_name) VALUES ($1, $2)';
			const insertValues = ['7892', 'Isaac Just Eat Ltd'];

			await pool.query(insertQuery, insertValues);

			// Mock data.
			const mockLicencesCsvData
			= `Account Number,Licence Number,Status,Type,Activity,Start Date,End Date
			500,010129-N-103064-001,Active,Non-Remote,General Betting Limited,2002-02-03T00:00:00+00:00,
			330,012179-N-105324-221,Surrendered,Remote,General Betting Limited,2002-02-03T00:00:00+00:00,2023-11-28T00:00:00+00:00`;

			/* Mock the methods implementation once in a way that doesn't risk incurring a infinite loop through referencing the same mock object. */
			jest.spyOn(GamblingCommission.prototype, 'uploadCsv')
				.mockImplementationOnce(async function (this: GamblingCommission, data, _schema: string) {
					// Intercept the function call, and re-call the method, providing the test_schema instead.
					return originalUploadCsv.call(this, data, 'test_schema');
				});

			await request(app)
				.post(uploadGamblingCommissionEndpoint)
				.set('x-api-key', apiKey)
				.attach('invalid-key', createMockReadStream(mockLicencesCsvData) as unknown as ReadStream, {
					filename: 'licencesCsv',
					// Valid mimetype.
					contentType: 'text/csv',
				// Unproccessable entity.
				}).expect(422);

			// Test that business_licence_register_businesses table has been left in its original state.
			const businessesResults = await pool.query('SELECT * FROM test_schema.business_licence_register_businesses');

			// Test that business_licence_register_licences table has been left in its original state.
			const licencesResults = await pool.query('SELECT * FROM test_schema.business_licence_register_licences');

			// Existng data should not be replaced, or deleted.
			expect(businessesResults.rows[0].account_number).toBe('7892');
			expect(businessesResults.rows[0].licence_account_name).toBe('Isaac Just Eat Ltd');
			// No data should be added, as it's invalid.
			expect(licencesResults.rows).toStrictEqual([]);
		});
	});
});

// Scenario: Ensure the existence of required database tables.

// Given.
describe('Given the database tables for the Gambling Commission data do not exist.', () => {
	beforeAll(async () => {
		// Delete test database entirely, in process deleting the Gambling Commission tables.
		await clearTestDatabase();
		// Set-up the needed test database schema again.
		await setupTestDatabase();
		// We leave the Gambling Commission tables uncreated.
	});
	// When.
	describe('When I upload my CSV data.', () => {
		// Then.
		it('Then the required tables should be created in the database.', async () => {
			// Mock data.
			const mockCsvData
			= `Account Number,Licence Account Name
			853,Rhiannon Database Solutions Plc`;

			/* Mock uploadCsv method so it returns a resolved promise. We are only testing if the database tables
			   are created properly by the factory. */
			jest.spyOn(GamblingCommission.prototype, 'uploadCsv').mockImplementation(async () => Promise.resolve());

			await request(app)
				.post(uploadGamblingCommissionEndpoint)
				.set('x-api-key', apiKey)
				.attach('businessesCsv', createMockReadStream(mockCsvData) as unknown as ReadStream, {
					filename: 'businessesCsv',
					// Valid mimetype.
					contentType: 'text/csv',
				// Success.
				}).expect(200);

			// GIVEN that the environment variable NODE_ENV has been set to 'test'. We should see that the tables have
			// been created successfully within the test_schema.

			/** Credit to https://stackoverflow.com/a/24089729 for the query. */
			const businessInformationTable = await pool.query(
				`SELECT EXISTS (
					SELECT * FROM information_schema.tables
					WHERE table_schema = 'test_schema'
					AND table_name = 'business_licence_register_businesses'
				);`);
			expect(businessInformationTable.rows[0].exists).toBe(true);

			const businessLicenceTable = await pool.query(
				`SELECT EXISTS (
					SELECT * FROM information_schema.tables
					WHERE table_schema = 'test_schema'
					AND table_name = 'business_licence_register_licences'
				);`);
			expect(businessLicenceTable.rows[0].exists).toBe(true);
		});
	});
});

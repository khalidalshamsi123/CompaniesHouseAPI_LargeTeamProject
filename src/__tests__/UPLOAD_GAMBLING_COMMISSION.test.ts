import pool from '../database/databasePool';

import fs, {type ReadStream} from 'node:fs';

import {
	clearTestDatabase, setupTestDatabase, createTestGamblingCommissionTables,
} from '../utils/databaseTestFuncs';

import {decorateMockRequest} from '../utils/MockRequestBodyStream';

import {Readable} from 'node:stream';

import GamblingCommission from '../components/GamblingCommission/GamblingCommission';
import build from '../components/GamblingCommission/GamblingCommissionFactory';

import FormData from 'form-data';
import httpMocks, {type MockRequest} from 'node-mocks-http';
import {type Request} from 'express-serve-static-core';
import request from 'supertest';
import app from '../app';

const uploadGamblingCommissionEndpoint = '/upload/gambling-commission';

// // Instance will be used by a test and then reset. Improving the isolation between tests.
// let gcInstance: GamblingCommission;

// beforeAll(async () => {
// 	await setupTestDatabase();
// 	await deleteTableFromTestDatabase('business_licence_register_businesses');
// 	await deleteTableFromTestDatabase('business_licence_register_licences');
// 	// Delete the Gambling Commission test tables before all tests are run. Methods should be able to account for this.
// 	gcInstance = new GamblingCommission();
// });

// beforeEach(async () => {
// 	/* Mock factory method.
// 	---------------------
// 	Follow exact same logic as the factories original build() method besides running a different
// 	function to create tables.
// 	We want the gambling commission tables to be created within the test_schema, not production. */
// 	jest.spyOn(gamblingCommissionFactory, 'default').mockImplementationOnce(async () => {
// 		/* I tried to directly mock the createGamblingCommissionTables() method which is called by the original build()
// 		implementation. However, as it's a private and unexported meaning I couldn't mock it.

// 		And I didn't want to make it a public method since I feel it should only be called by the factory. So I am
// 		using this approach. */
// 		try {
// 			await createTestGamblingCommissionTables();
// 			return gcInstance;
// 		} catch (e) {
// 			console.error(e);
// 		}

// 		return gcInstance;
// 	});

// 	// Mock the uploadCsv() method so that it targets the test_schema instead of the one for production.

// 	/* Using mockImplementation over the 'Once' version will cause this to infinitely loop.
// 	   I originally had this logic outside of the beforeEach clause, moving it within here and opting to
// 	   use the Once version since it gives the same intended behaviour but without the infinite loop. */
// 	jest.spyOn(gcInstance, 'uploadCsv').mockImplementationOnce(async (data, _schema: string) => {
// 		// Intercept the function call, and re-call the method, providing the test_schema instead.
// 		await gcInstance.uploadCsv(data, 'test_schema');
// 	});
// });

// afterEach(async () => {
// 	// Create new instance of GamblingCommission, overwrite existing instance.
// 	gcInstance = new GamblingCommission();
// 	// Delete table contents.
// 	await deleteTableFromTestDatabase('business_licence_register_businesses');
// 	await deleteTableFromTestDatabase('business_licence_register_licences');
// 	// Reset jest mocks.
// 	jest.resetAllMocks();
// 	jest.restoreAllMocks();
// });

// afterAll(async () => {
// 	await clearTestDatabase();
// 	jest.resetAllMocks();
// 	jest.restoreAllMocks();
// });

beforeAll(async () => {
	await clearTestDatabase();
	await setupTestDatabase();
	await createTestGamblingCommissionTables();
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
			await gcInstance.uploadCsv('businessesCsv', 'test_schema');

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
			// I know that I can safely cast Readable to ReadStream. It may be missing a few fields. But it won't matter for this test.

			// Create a form with your CSV data
			// const form = new FormData();

			// form.append('businessesCsv', createMockCsvBuffer(mockBusinessesCsvData), {
			// 	filename: 'businesses.csv',
			// 	contentType: 'text/csv',
			// });

			// form.append('licencesCsv', createMockCsvBuffer(mockLicencesCsvData), {
			// 	filename: 'licences.csv',
			// 	contentType: 'text/csv',
			// });

			// let mockRequest = httpMocks.createRequest({
			// 	method: 'POST',
			// 	url: uploadGamblingCommissionEndpoint,
			// });

			// mockRequest._setBody(form.getBuffer());
			// mockRequest.headers = form.getHeaders();

			// mockRequest = decorateMockRequest(mockRequest) as MockRequest<Request>;

			// Const gcInstance = await build();
			// await gcInstance.uploadCsv(mockRequest, 'test_schema');

			// Dummy data.
			const mockBusinessesCsvData
			= `Account Number,Licence Account Name
			12051,Hamed Solutions Limited`;

			const mockLicencesCsvData
			= `Account Number,Licence Number,Status,Type,Activity,Start Date,End Date
			500,010129-N-103064-001,Active,Non-Remote,General Betting Limited,2002-02-03T00:00:00+00:00,
			330,012179-N-105324-221,Surrendered,Remote,General Betting Limited,2002-02-03T00:00:00+00:00,2023-11-28T00:00:00+00:00`;

			/* Using mockImplementation over the 'Once' version will cause this to infinitely loop.
			   I originally had this logic outside of the beforeEach clause, moving it within here and opting to
			   use the Once version since it gives the same intended behaviour but without the infinite loop. */
			jest.spyOn(GamblingCommission.prototype, 'uploadCsv').mockImplementationOnce(async (data, _schema: string) => {
				const gcInstance = new GamblingCommission();
				// Intercept the function call, and re-call the method, providing the test_schema instead.
				await gcInstance.uploadCsv(data, 'test_schema');
			});

			jest.mock('../components/GamblingCommission/GamblingCommissionFactory', () => ({
				__esModule: true, // This property makes the mocked module compatible with ES6 imports.
				// eslint-disable-next-line max-nested-callbacks
				default: jest.fn(() => new GamblingCommission()),
			}));

			const apiKey = process.env.API_KEY!;
			await request(app)
				.post(uploadGamblingCommissionEndpoint)
				.set('x-api-key', apiKey)
				.attach('businessesCsv', createMockReadStream(mockBusinessesCsvData) as unknown as ReadStream, {
					filename: 'businessesCsv.csv',
					contentType: 'text/csv',
				})
				.attach('licencesCsv', createMockReadStream(mockLicencesCsvData) as unknown as ReadStream, {
					filename: 'licensesCsv.csv',
					contentType: 'text/csv',
				});

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

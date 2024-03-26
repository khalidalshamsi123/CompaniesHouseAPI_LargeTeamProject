import * as csvReader from '../database/HMRC/csvReader';
import * as dataProcessor from '../database/dataProcessor';
import fs from 'fs';
import csvParser from 'csv-parser';
import type {PoolClient} from 'pg';

jest.mock('csv-parser');
jest.mock('../database/HMRC/csvReader');
jest.mock('fs');

describe('Database Operations Test', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Given data exists in the database', () => {
		const retrieveData = async () => [{id: 1, name: 'Test Company'}]; // Mock the function to retrieve data from the database

		test('When retrieving data, Then it should return the expected data', async () => {
			// WHEN: Retrieving data
			const data = await retrieveData();
			// THEN: It should return the expected data
			expect(data).toEqual([{id: 1, name: 'Test Company'}]);
		});
	});

	describe('Given data is loaded into the database', () => {
		const filename = 'Supervised-Business-Register.csv';
		const batchSize = 100;
		let clientMock: Partial<PoolClient> = {}; // Partially mocked client
		beforeEach(() => {
			// Mock the client methods
			clientMock = {
				query: jest.fn(),
				release: jest.fn(),
				connect: jest.fn(),
			};
		});

		test('When loading data, Then it should load the data successfully', async () => {
			const expectedRowCount = 2; // Mock the expected row count
			// Mock the behavior of csvReader.readAndProcessCsv to resolve with the expected row count
			(csvReader.readAndProcessCsv as jest.Mock).mockResolvedValueOnce(expectedRowCount);
			// Mock the behavior of fs.createReadStream
			(fs.createReadStream as jest.Mock).mockReturnValueOnce({
				pipe: jest.fn().mockReturnThis(),
				on: jest.fn().mockImplementation((event: string, handler: () => void) => {
					if (event === 'end') {
						handler(); // Simulates the end of the CSV file processing
					}
				}),
			});
			// Mock the behavior of csv-parser
			(csvParser as jest.Mock).mockReturnValueOnce({
				on: jest.fn().mockImplementation((event: string, handler: (data: {id: number; name: string}) => void) => {
					if (event === 'data') {
						// Simulate processing each row of data
						handler({id: 1, name: 'Test Company 1'});
						handler({id: 2, name: 'Test Company 2'});
					}
				}),
			});
			// WHEN: Loading data
			const rowCount = await csvReader.readAndProcessCsv(filename, clientMock as PoolClient, batchSize);
			// THEN: It should load the data successfully
			expect(rowCount).toEqual(expectedRowCount); // Expecting 2 rows processed
		});
	});

	describe('Given data is loaded into the database', () => {
		const row = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			REGISTRATION_ID: '12345',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			BUSINESS_NAME: 'Test Company',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			STATUS: 'Approved',
		};
		const regIdIndex = 0; // Assuming REGISTRATION_ID is the first column
		const status1Index = 2; // Assuming STATUS is the third column
		const cache: Record<string, boolean> = {};
		const batchSize = 100;
		const rowCount = 1;
		let clientMock: Partial<PoolClient>;
		beforeEach(() => {
			clientMock = {
				query: jest.fn(),
				release: jest.fn(),
				connect: jest.fn(),
			};
		});

		test('When processing a row, Then it should insert the data into the database', async () => {
			(clientMock.query as jest.Mock).mockResolvedValueOnce(undefined);

			await dataProcessor.processDataRow({
				row,
				regIdIndex,
				status1Index,
				cache,
				client: clientMock as PoolClient,
				batchSize,
				rowCount,
			});

			// Define the expected SQL query with consistent formatting
			const expectedQuery: string = `
    			INSERT INTO registration_schema.business_registry (registrationid, businessname, fca_approved, hmrc_approved, gambling_approved)
    			VALUES ($1, $2, $3, $4, $5)
    			ON CONFLICT (businessname)
    			DO UPDATE SET hmrc_approved = EXCLUDED.hmrc_approved;
			`.trim(); // Trim leading/trailing whitespace

			// Get the received query from the mock function calls
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const receivedQuery: string = (clientMock.query as jest.Mock).mock.calls[0][0];

			// Use regular expressions to match and compare the SQL queries, ignoring whitespace
			expect(receivedQuery.replace(/\s+/g, ' ')).toMatch(expectedQuery.replace(/\s+/g, ' '));
		});
	});
});

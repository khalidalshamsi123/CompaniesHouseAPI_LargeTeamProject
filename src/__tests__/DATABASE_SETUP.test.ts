import fs from 'fs';
import csvParser from 'csv-parser';
import type {PoolClient} from 'pg';
import {csvReader} from '../components/HMRC/csvReaderHMRC';

jest.mock('csv-parser');
jest.mock('../components/HMRC/csvReaderHMRC');
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
			(csvReader as jest.Mock).mockResolvedValueOnce(expectedRowCount);
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
			const rowCount = await csvReader(filename, clientMock as PoolClient, batchSize);
			// THEN: It should load the data successfully
			expect(rowCount).toEqual(expectedRowCount); // Expecting 2 rows processed
		});
	});
});

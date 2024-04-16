import {type QueryResult} from 'pg';
import BusinessNameProcessor from '../components/BusinessNameProcessor';
import pool from '../database/setup/databasePool';
import {clearTestDatabase, setupTestDatabase} from '../utils/databaseTestFuncs';

beforeAll(async () => {
	await clearTestDatabase();
	await setupTestDatabase();
	// Add record to test table. Remember that due to the business name processor the business names already stored in the database should
	// be standardised to lower-case and have any business structures included in the name unabbreviated.
	await pool.query('INSERT INTO test_schema.hmrc_business_registry (referenceid, businessname, hmrc_approved) VALUES ($1, $2, $3);',
		['122727', 'a real business limited.', true]);
	await pool.query('INSERT INTO test_schema.gambling_business_registry (referenceid, businessname, gambling_approved) VALUES ($1, $2, $3);',
		['142355', 'a real business limited.', false]);
});

beforeEach(() => {
	jest.clearAllMocks();
});

afterAll(async () => {
	await clearTestDatabase();
	await pool.end();
});

// Scenario: Mismatching business name.

// Given.
describe('Given a business name that differs from the one recorded in the database.', () => {
	const businessInformation = {
		businessName: 'A Business Ltd.',
		hmrcRecordId: '122727',
		gamblingRecordId: '142355',
	};
	// When.
	describe('When the validation process is triggered.', () => {
		const businessNameProcessor = new BusinessNameProcessor();
		// Then.
		it('Then a false result should be given, alongside a message.', async () => {
			// Test hmrc pathway.
			const hmrcResult = await businessNameProcessor.compareBusinessNameWithRecord(
				businessInformation.hmrcRecordId,
				businessInformation.businessName,
				'hmrc',
			);
			expect(hmrcResult).toHaveProperty('message');
			expect(hmrcResult.isMatch).toBe(false);

			// ----------- //

			// Test gambling pathway.
			const gamblingResult = await businessNameProcessor.compareBusinessNameWithRecord(
				businessInformation.hmrcRecordId,
				businessInformation.businessName,
				'hmrc',
			);
			expect(gamblingResult).toHaveProperty('message');
			expect(gamblingResult.isMatch).toBe(false);
		});

		it('Then a false result should be given, alongside a message.', async () => {
			// Mock database response.
			jest.spyOn(pool, 'query').mockImplementation(async (_queryString: string, _params: any[]): Promise<QueryResult> => {
				const mockedDatabaseResponse: QueryResult = {
					rowCount: 1,
					rows: [{businessname: 'a real business limited.'}],
				} as unknown as QueryResult;
				return Promise.resolve(mockedDatabaseResponse);
			});

			// Test hmrc pathway.
			const hmrcResult = await businessNameProcessor.compareBusinessNameWithRecord(
				businessInformation.hmrcRecordId,
				businessInformation.businessName,
				'hmrc',
			);
			expect(hmrcResult).toHaveProperty('message');
			expect(hmrcResult.isMatch).toBe(false);

			// ----------- //

			// Test gambling pathway.
			const gamblingResult = await businessNameProcessor.compareBusinessNameWithRecord(
				businessInformation.hmrcRecordId,
				businessInformation.businessName,
				'hmrc',
			);
			expect(gamblingResult).toHaveProperty('message');
			expect(gamblingResult.isMatch).toBe(false);
		});
	});
});

// Scenario: Matching business name.

// Given.
describe('Given a business name that matches the one recorded in the database.', () => {
	const businessInformation = {
		businessName: 'A Real Business Ltd.',
		hmrcRecordId: '122727',
		gamblingRecordId: '142355',
	};
	// When.
	describe('When the validation process is triggered.', () => {
		const businessNameProcessor = new BusinessNameProcessor();
		// Then.
		it('Then a true result should be given.', async () => {
			// Test hmrc pathway.
			const hmrcResult = await businessNameProcessor.compareBusinessNameWithRecord(
				businessInformation.hmrcRecordId,
				businessInformation.businessName,
				'hmrc',
			);
			expect(hmrcResult.message).toBeUndefined();
			expect(hmrcResult.isMatch).toBe(true);

			// ----------- //

			// Test gambling pathway.
			const gamblingResult = await businessNameProcessor.compareBusinessNameWithRecord(
				businessInformation.hmrcRecordId,
				businessInformation.businessName,
				'gambling',
			);
			expect(gamblingResult.message).toBeUndefined();
			expect(gamblingResult.isMatch).toBe(true);
		});

		it('Then a true result should be given.', async () => {
			// Mock database response.
			jest.spyOn(pool, 'query').mockImplementation(async (_queryString: string, _params: any[]): Promise<QueryResult> => {
				const mockedDatabaseResponse: QueryResult = {
					rowCount: 1,
					rows: [{businessname: 'a real business limited.'}],
				} as unknown as QueryResult;
				return Promise.resolve(mockedDatabaseResponse);
			});

			// Test hmrc pathway.
			const hmrcResult = await businessNameProcessor.compareBusinessNameWithRecord(
				businessInformation.hmrcRecordId,
				businessInformation.businessName,
				'hmrc',
			);
			expect(hmrcResult.message).toBeUndefined();
			expect(hmrcResult.isMatch).toBe(true);

			// ----------- //

			// Test gambling pathway.
			const gamblingResult = await businessNameProcessor.compareBusinessNameWithRecord(
				businessInformation.hmrcRecordId,
				businessInformation.businessName,
				'gambling',
			);
			expect(gamblingResult.message).toBeUndefined();
			expect(gamblingResult.isMatch).toBe(true);
		});
	});
});

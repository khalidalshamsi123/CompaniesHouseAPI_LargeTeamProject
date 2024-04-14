import {type Request} from 'express-serve-static-core';
import build from '../components/GamblingCommission/GamblingCommissionFactory';
import pool from '../database/setup/databasePool';
import {
	clearTestDatabase, createTestGamblingCommissionTables, deleteRowsFromTestTable, setupTestDatabase,
} from '../utils/databaseTestFuncs';

import EventEmitter from 'events';
import Cursor from 'pg-cursor';

// Removes all implementations for busboy methods.
jest.mock('busboy', () => jest.fn().mockImplementation(options => {
	const instance = new EventEmitter();
	// Simulate immediate firing of the finish event
	process.nextTick(() => instance.emit('finish'));
	return instance;
}));

// When called will return a mock request object. Object has the pipe method defined but will do nothing when called.
const createMockRequest = () => ({
	pipe: jest.fn().mockReturnThis(),
});

beforeAll(async () => {
	await clearTestDatabase();
	await setupTestDatabase();
	await createTestGamblingCommissionTables();
});

// Before each test delete the contents added by the previous from the tables.
beforeEach(async () => {
	await deleteRowsFromTestTable('business_licence_register_businesses');
	await deleteRowsFromTestTable('business_licence_register_licences');
	await deleteRowsFromTestTable('gambling_business_registry');
});

afterAll(async () => {
	await pool.end(); // Make sure to close the database pool
});

// Can change variables if the table names ever change.
const mainTable = 'gambling_business_registry';
const businessTempTable = 'business_licence_register_businesses';
const licenceTempTable = 'business_licence_register_licences';

// Scenario: Update the gambling_approved column for existing businesses.

// Given.
describe('Given there are businesses already listed in our main database table.', () => {
	// When.
	describe('When there is matching business data in the temporary tables .', () => {
		// Then.
		it('Then the gambling_approved column for these businesses in the main database should be updated to reflect their current approval status, ensuring accurate compliance records.', async () => {
			// Insert record to main database table. Record will have gambling licence approval status set to false.
			await pool.query(`INSERT INTO test_schema.${mainTable} (referenceid, businessname, gambling_approved) VALUES ($1, $2, $3)`,
				['012179-N-105324-221', 'John Owns a Business Limited', 'false']);

			// Add rows that will be joined to temporary tables.
			await pool.query(`INSERT INTO test_schema.${businessTempTable} (account_number, licence_account_name) VALUES ($1, $2)`, [
				'2895',
				'John Owns a Business Limited',
			]);
			await pool.query(`INSERT INTO test_schema.${licenceTempTable} VALUES ($1, $2, $3, $4, $5, $6)`, [
				'2895',
				'012179-N-105324-221',
				'Active',
				'Remote',
				'General Betting Limited',
				'2002-02-03T00:00:00+00:00',
			]);

			const gcInstance = await build();
			// Call method that will aggregate then use data to update main table.
			// Testing these methods separately to the prior step, which was creating the temporary tables from CSV data.
			await gcInstance.uploadCsv(createMockRequest() as unknown as Request, 'test_schema');

			const response = await pool.query(`SELECT * FROM test_schema.${mainTable}`);
			expect(response.rows[0].gambling_approved).toBe(true);
		});
	});
});

// Scenario: Insert new businesses with their Gambling Commission approval status.

// Given.
describe('Given there are businesses already listed in our main database table.', () => {
	// When.
	describe('When there is matching business data in the temporary tables indicating approval status from the Gambling Commission.', () => {
		// Then.
		it('Then the gambling_approved column for these businesses in the main database should be updated to reflect their current approval status, ensuring accurate compliance records.', async () => {
			// Add rows that will be joined to temporary tables.
			await pool.query(`INSERT INTO test_schema.${businessTempTable} (account_number, licence_account_name) VALUES ($1, $2)`, [
				'2895',
				'John Owns a Business Limited',
			]);
			await pool.query(`INSERT INTO test_schema.${licenceTempTable} VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
				'2895',
				'012179-N-105324-221',
				'Surrendered',
				'Remote',
				'General Betting Limited',
				'2002-02-03T00:00:00+00:00',
				'2023-11-28T00:00:00+00:00',
			]);

			const gcInstance = await build();

			// Call method that will aggregate then use data to update main table.
			// Testing these methods separately to the prior step, which was creating the temporary tables from CSV data.
			await gcInstance.uploadCsv(createMockRequest() as unknown as Request, 'test_schema');

			const response = await pool.query(`SELECT * FROM test_schema.${mainTable}`);

			expect(response.rowCount).toBe(1);
			expect(response.rows[0].gambling_approved).toBe(false);
		});
	});
});

// Scenario: Preserve existing data integrity while updating or inserting new data.

// Given.
describe('Given there is existing data within the main database table.', () => {
	// When.
	describe('When performing operations to update the target table with data that does not meet the expectation of the target tables schema.', () => {
		// Then.
		it('Then the update should fail, and the completeness of the existing data should be maintained.', async () => {
			// Insert record to main database table.
			await pool.query(`INSERT INTO test_schema.${mainTable} (referenceid, businessname, gambling_approved) VALUES ($1, $2, $3)`,
				['2895', 'John Owns a Business Limited', 'true']);

			// Add two rows to temporary tables. JOIN will occur on the temporary tables.
			await pool.query(`INSERT INTO test_schema.${businessTempTable} (account_number, licence_account_name) VALUES ($1, $2), ($3, $4)`, [
				'2895',
				'John Owns a Business Limited',
				'8823',
				'Accountable Accounting Gambling Ltd',
			]);

			// Surrendered status would result in the existing business '2895' having its approval status set to false.
			await pool.query(`INSERT INTO test_schema.${licenceTempTable} VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14)`, [
				'2895',
				'012179-N-105324-221',
				'Surrendered',
				'Remote',
				'General Betting Limited',
				'2002-02-03T00:00:00+00:00',
				'2023-11-28T00:00:00+00:00',
				// Other row.
				'8823',
				'011179-N-104354-333',
				'Active',
				'Non-Remote',
				'General Betting Limited',
				'2002-02-03T00:00:00+00:00',
				'2023-11-28T00:00:00+00:00',
			]);

			/* We make cursor.close() throw an error. This method is called once all the inserts have been completed without issue. If a error is thrown however, the transaction
               should revert, and any changes made to the database should rollback. */
			jest.spyOn(Cursor.prototype, 'close').mockImplementationOnce(() => {
				throw new Error('Error intetionally thrown by test.');
			});

			const gcInstance = await build();

			// We expect the method to reject with an error. Transaction should be rolled back.
			await expect(gcInstance.uploadCsv(createMockRequest() as unknown as Request, 'test_schema')).rejects.toThrow();

			const response = await pool.query(`SELECT * FROM test_schema.${mainTable}`);

			// New rows added were rolled back - transaction has failed.
			expect(response.rowCount).toBe(1);
			// Existing record should keep its 'true' gambling approved status because transaction has failed.
			expect(response.rows[0].gambling_approved).toBe(true);
		});
	});
});

import pool from '../database/setup/databasePool';
import {type HmrcBusinessData} from '../types/DatabaseInsertTypes';

// Function to create database schema and insert test data
const setupTestDatabase = async () => {
	try {
		await pool.query(`
            CREATE SCHEMA IF NOT EXISTS test_schema;
        `);

		await pool.query(`CREATE TABLE IF NOT EXISTS test_schema.hmrc_business_registry (
			referenceid VARCHAR(255),
			businessname VARCHAR(255),
			hmrc_approved BOOLEAN,
			PRIMARY KEY (referenceid),
			UNIQUE (referenceid, businessname)
			);`);
		await pool.query(`CREATE TABLE IF NOT EXISTS test_schema.gambling_business_registry (
			referenceid VARCHAR(255),
			businessname VARCHAR(255),
			gambling_approved BOOLEAN,
			PRIMARY KEY (referenceid),
			UNIQUE (referenceid, businessname)
			);`);

		// Avoid duplication of data
		await pool.query(`
			DELETE FROM test_schema.hmrc_business_registry
			WHERE referenceid = '122702';
		`);

		// Insert test data
		await pool.query(`
			INSERT INTO test_schema.hmrc_business_registry (referenceid, businessname,hmrc_approved)
			VALUES ('122702', 'Barclays', true);
		`);
	} catch (error) {
		console.error('Error setting up test database:', error);
		throw error; // Rethrow the error to propagate it to the caller
	}
};

const clearTestDatabase = async () => {
	try {
		await pool.query(`
            DROP SCHEMA IF EXISTS test_schema CASCADE;
        `);
	} catch (error) {
		console.error('Error clearing test database:', error);
		throw error; // Rethrow the error to propagate it to the caller
	}
};

const deleteRowsFromTestTable = async (tableName: string) => {
	try {
		await pool.query(`TRUNCATE test_schema.${tableName};`);
	} catch (e) {
		console.error('Failed to delete rows in the test table. It\'s likely that the table doesn\'t exist.');
	}
};

const selectFromTestDatabase = async (referenceId: string): Promise<{hmrcApproved: boolean; gamblingApproved: boolean} | undefined> => {
	try {
		const hmrcResult = await pool.query('SELECT * FROM test_schema.hmrc_business_registry WHERE referenceid = $1', [referenceId]);
		const hmrcBusinessData: HmrcBusinessData = hmrcResult.rows[0] as HmrcBusinessData;

		if (!hmrcBusinessData) {
			return undefined;
		}

		return {
			hmrcApproved: hmrcBusinessData.hmrc_approved,
			gamblingApproved: false,
		};
	} catch (error) {
		console.error('Error retrieving data:', error);
		throw new Error('Error retrieving data');
	}
};

const createTestGamblingCommissionTables = async () => {
	// Table definitions match the current format used for the required gambling commission CSVs.
	await pool.query(`
		CREATE TABLE IF NOT EXISTS test_schema.business_licence_register_businesses (
																						account_number BIGINT PRIMARY KEY,
																						licence_account_name VARCHAR(255) NOT NULL
			);`);
	await pool.query(`
		CREATE TABLE IF NOT EXISTS test_schema.business_licence_register_licences (
																					  account_number BIGINT NOT NULL,
																					  licence_number VARCHAR(255) NOT NULL,
			status VARCHAR(255) NOT NULL,
			type VARCHAR(255) NOT NULL,
			activity VARCHAR(255) NOT NULL,
			start_date timestamptz,
			end_date timestamptz
			);`);
};

export {
	clearTestDatabase, setupTestDatabase, selectFromTestDatabase, deleteRowsFromTestTable, createTestGamblingCommissionTables,
};

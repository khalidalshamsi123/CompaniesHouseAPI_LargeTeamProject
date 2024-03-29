import pool from '../database/databasePool';
import {type BusinessData} from '../database/queries';

// Function to create database schema and insert test data
const setupTestDatabase = async () => {
	try {
		await pool.query(`
            CREATE SCHEMA IF NOT EXISTS test_schema;
        `);

		await pool.query(`
            CREATE TABLE IF NOT EXISTS test_schema.business_registry (
                registrationid VARCHAR(8) PRIMARY KEY,
                businessname VARCHAR(255),
                fca_approved BOOLEAN,
                hmrc_approved BOOLEAN,
                gambling_approved BOOLEAN
            );
        `);

		// Avoid duplication of data
		await pool.query(`
            DELETE FROM test_schema.business_registry
            WHERE registrationid = '122702';
        `);

		// Insert test data
		await pool.query(`
            INSERT INTO test_schema.business_registry (registrationid, businessname, fca_approved, hmrc_approved, gambling_approved)
            VALUES ('122702', 'Barclays', true, true, false);
        `);
	} catch (error) {
		console.error('Error setting up test database:', error);
		throw error; // Rethrow the error to propagate it to the caller
	}
};

const clearTestDatabase = async () => {
	try {
		await pool.query(`
            DROP TABLE IF EXISTS test_schema.business_registry;
        `);

		await pool.query(`
            DROP SCHEMA IF EXISTS test_schema;
        `);

		// End the database connection pool
		await pool.end();
	} catch (error) {
		console.error('Error clearing test database:', error);
		throw error; // Rethrow the error to propagate it to the caller
	}
};

const selectFromTestDatabase = async (registrationId: string): Promise<BusinessData | undefined> => {
	// Unlike the original implementation for this method I am not handling any errors as in that implementation it is just re-thrown anyway.
	const result = await pool.query('SELECT * FROM test_schema.business_registry WHERE registrationid = $1', [registrationId]);
	const businessData: BusinessData = result.rows[0] as BusinessData;

	// Return null if cant find any data
	if (!businessData) {
		return undefined;
	}

	return businessData;
};

export {clearTestDatabase, setupTestDatabase, selectFromTestDatabase};

import pool from '../database/databasePool';

// Function to create database schema and insert test data
export async function setupTestDatabase() {
	try {
		await pool.query(`
            CREATE SCHEMA IF NOT EXISTS registration_schema;
        `);

		await pool.query(`
            CREATE TABLE IF NOT EXISTS registration_schema.business_registry (
                registrationid VARCHAR(8) PRIMARY KEY,
                businessname VARCHAR(255),
                fca_approved BOOLEAN,
                hmrc_approved BOOLEAN,
                gambling_approved BOOLEAN
            );
        `);

		// Avoid duplication of data
		await pool.query(`
            DELETE FROM registration_schema.business_registry
            WHERE registrationid = '122702';
        `);

		// Insert test data
		await pool.query(`
            INSERT INTO registration_schema.business_registry (registrationid, businessname, fca_approved, hmrc_approved, gambling_approved)
            VALUES ('122702', 'Barclays', true, true, false);
        `);
	} catch (error) {
		console.error('Error setting up test database:', error);
		throw error; // Rethrow the error to propagate it to the caller
	}
}

export async function clearTestDatabase() {
	try {
		await pool.query(`
            DROP TABLE IF EXISTS registration_schema.business_registry;
        `);

		await pool.query(`
            DROP SCHEMA IF EXISTS registration_schema;
        `);

		// End the database connection pool
		await pool.end();
	} catch (error) {
		console.error('Error clearing test database:', error);
		throw error; // Rethrow the error to propagate it to the caller
	}
}

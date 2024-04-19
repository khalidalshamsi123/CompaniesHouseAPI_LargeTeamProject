import pool from './databasePool';

/**
 * Creates the database schema and tables for the hmrc and gambling business registries if they do not exist.
 * @returns {Promise<void>} A Promise that resolves when schema creation is completed successfully.
 * @throws {Error} Throws an error if schema creation fails.
 */
async function createSchema() {
	try {
		console.log('Creating database schema...');
		await pool.query('CREATE SCHEMA IF NOT EXISTS registration_schema;');
		await pool.query(`CREATE TABLE IF NOT EXISTS registration_schema.hmrc_business_registry (
			referenceid VARCHAR(255),
			businessname VARCHAR(255),
			hmrc_approved BOOLEAN,
			PRIMARY KEY (referenceid),
			UNIQUE (referenceid, businessname)
			);`);
		await pool.query(`CREATE TABLE IF NOT EXISTS registration_schema.gambling_business_registry (
			referenceid VARCHAR(255),
			businessname VARCHAR(255),
			gambling_approved BOOLEAN,
			PRIMARY KEY (referenceid),
			UNIQUE (referenceid, businessname)
			);`);
	} catch (error) {
		console.error('Error creating database schema:', error);
		throw error;
	}
}

export {createSchema};

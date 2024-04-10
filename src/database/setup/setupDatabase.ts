import pool from './databasePool';

async function createSchema() {
	try {
		console.log('Creating database schema...');
		await pool.query('CREATE SCHEMA IF NOT EXISTS registration_schema;');
		await pool.query(`CREATE TABLE IF NOT EXISTS registration_schema.hmrc_business_registry (
			referenceid VARCHAR(255),
			businessname VARCHAR(255),
			hmrc_approved BOOLEAN,
			PRIMARY KEY (referenceId),
			UNIQUE (referenceId)
			);`);
		await pool.query(`CREATE TABLE IF NOT EXISTS registration_schema.gc_business_registry (
			referenceid VARCHAR(255),
			businessname VARCHAR(255),
			gambling_approved BOOLEAN,
			PRIMARY KEY (referenceId),
			UNIQUE (referenceId)
			);`);
	} catch (error) {
		console.error('Error creating database schema:', error);
		throw error;
	}
}

export {createSchema};

import pool from './databasePool';

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

// Call the createSchema function
createSchema()
	.then(() => {
		console.log('Schema creation completed successfully.');
		// Any additional code to run after schema creation
	})
	.catch(error => {
		console.error('Schema creation failed:', error);
		// Handle errors if necessary
	});

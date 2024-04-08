import pool from './databasePool';

async function createSchema() {
	try {
		console.log('Creating database schema...');
		await pool.query('CREATE SCHEMA IF NOT EXISTS registration_schema;');
		await pool.query(`CREATE TABLE IF NOT EXISTS registration_schema.business_registry (
			registrationid VARCHAR(255),
			businessname VARCHAR(255),
			fca_approved BOOLEAN,
			hmrc_approved BOOLEAN,
			gambling_approved BOOLEAN,
			PRIMARY KEY (businessname),
			UNIQUE (registrationid)
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


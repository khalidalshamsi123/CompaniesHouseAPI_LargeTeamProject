import pool from './databasePool';

// Define the SQL commands to create the schema
const createSchemaQuery = `
    CREATE SCHEMA IF NOT EXISTS registration_schema;
    
    CREATE TABLE IF NOT EXISTS registration_schema.business_registry (
        registrationid VARCHAR(8) PRIMARY KEY,
        businessname VARCHAR(255),
        fca_approved BOOLEAN,
        hmrc_approved BOOLEAN,
        gambling_approved BOOLEAN
    );
`;

// Function to execute SQL commands to create the schema
export async function createSchema() {
	try {
		// Connect to the database
		const client = await pool.connect();

		// Execute the SQL commands to create the schema
		await client.query(createSchemaQuery);

		console.log('Database schema created successfully.');

		// Release the client connection
		client.release();

	} catch (error) {
		console.error('Error creating database schema:', error);
		throw error; // Rethrow the error to propagate it to the caller
	}
}

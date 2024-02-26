// Import the necessary modules
import { Pool } from 'pg';

// Define the database connection configuration
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Connect to the default 'postgres' database
    password: 'postgres',
    port: 5432,
});

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
async function createSchema() {
    try {
        // Connect to the database
        const client = await pool.connect();

        // Execute the SQL commands to create the schema
        await client.query(createSchemaQuery);

        // Release the client connection
        client.release();

        console.log('Database schema created successfully.');
    } catch (error) {
        console.error('Error creating database schema:', error);
    } finally {
        // Close the database connection pool
        await pool.end();
    }
}

// Call the function to create the schema
createSchema();

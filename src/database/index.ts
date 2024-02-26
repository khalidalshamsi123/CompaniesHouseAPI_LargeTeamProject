import { Pool } from 'pg';
import { insertBusinessData } from './queries';

// Create a PostgreSQL pool to manage connections
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ProjectDatabase',
    password: 'postgres',
    port: 5432,
});


// Log a message indicating that the pool is being created
console.log('Creating PostgreSQL pool...')

// Export the pool instance
export default pool;

async function main() {
    try {
        // Log a message indicating that the main function is starting
        console.log('Starting main function...');

        // Call insertBusinessData function with actual data
        await insertBusinessData('00445790', 'TESCO PLC', false, true, false);
        console.log('Data insertion completed successfully!');
    } catch (error) {
        // Log an error message if an error occurs
        console.error('Error inserting data:', error);
        process.exit(1); // Exit the process with an error code
    }
}

// Call the main function to start the execution
main();

import {Pool} from 'pg';

//figure out if we are running on a CI environment or not
const hostname = process.env.CI === 'true' ? 'postgres' : 'localhost';

// Create a PostgreSQL pool to manage connections
const pool = new Pool({
	user: 'postgres',
	host: hostname,
	database: 'postgres',
	password: 'postgres',
	port: 5432,
});

// Log a message indicating that the pool is being created
console.log('Creating PostgreSQL pool...');

// Export the pool instance
export default pool;

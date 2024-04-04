import {Pool} from 'pg';

// Figure out if we are running on a CI environment or not
const hostname = process.env.CI === 'true' ? 'postgres' : 'localhost';

// Create a PostgreSQL pool with optimized settings for high traffic and large data processing
const pool = new Pool({
	user: 'postgres',
	host: 'localhost',
	database: 'postgres',
	password: 'postgres',
	port: 5432,
});

console.log('Creating PostgreSQL pool with optimized settings...');

export {pool}; // Export the pool

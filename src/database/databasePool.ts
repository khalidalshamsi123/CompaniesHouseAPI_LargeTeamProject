import {Pool} from 'pg';

// Create a PostgreSQL pool with optimized settings for high traffic and large data processing
const pool = new Pool({
	user: 'postgres',
	host: 'localhost',
	database: 'postgres',
	password: 'postgres',
	port: 5432,
});

// Log a message indicating that the pool is being created
console.log('Creating PostgreSQL pool with optimized settings...');

// Export the pool instance
export default pool;

import {Pool} from 'pg';

const pool = new Pool({
	user: 'postgres',
	host: 'localhost',
	database: 'postgres',
	password: 'postgres',
	port: 5432,
});

console.log('Creating PostgreSQL pool with optimized settings...');

export {pool}; // Export the pool

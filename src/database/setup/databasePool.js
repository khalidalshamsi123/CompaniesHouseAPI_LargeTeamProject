"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pg_1 = require("pg");
// Create a PostgreSQL pool to manage connections
var pool = new pg_1.Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5432,
});
// Log a message indicating that the pool is being created
console.log('Creating PostgreSQL pool...');
// Export the pool instance
exports.default = pool;

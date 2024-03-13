import { Pool } from 'pg';
import fs from "fs";
import path from "path"; // Import the path module
import { Client } from 'ssh2'; // Import the ssh2 client

// Construct the absolute file path using __dirname
const keyPath = path.resolve(__dirname, '..', 'cloud.key');

// SSH configuration
const sshConfig = {
	host: '10.72.101.146',
	port: 22,
	username: 'centos',
	privateKey: fs.readFileSync(keyPath)
};

// Database configuration
const dbConfig = {
	user: 'developer',
	host: 'localhost', // SSH tunnel will forward the connection
	database: 'registry_database',
	password: 'postgres', // Replace with the actual password
	port: 5432
};

// Create an SSH connection
const sshClient = new Client();

let pool: Pool; // Declare pool variable outside the ready event

sshClient.on('ready', () => {
	// Start an SSH tunnel
	sshClient.forwardOut(
		'127.0.0.1', // The local interface to bind to
		5432, // The local port
		'10.72.101.146', // The remote host to connect to
		5432, // The remote port
		(err, stream) => {
			if (err) {
				console.error('Error creating SSH tunnel:', err);
				return sshClient.end();
			}

			// Create a PostgreSQL pool connected through the SSH tunnel
			pool = new Pool({
				...dbConfig,
				stream: () => stream
			});

			// Test the connection
			pool.connect((err, client, release) => {
				if (err) {
					console.error('Error connecting to PostgreSQL:', err);
					return sshClient.end();
				}
				console.log('Connected to PostgreSQL.');
			});
		}
	);
});

// Connect to the SSH server
sshClient.connect(sshConfig);

export {pool}; // Export the pool object

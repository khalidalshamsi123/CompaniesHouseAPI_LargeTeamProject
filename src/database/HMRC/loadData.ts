import {pool} from '../setup/databasePool'; // Ensure the correct relative path
import type {PoolClient} from 'pg';
import {processCsv} from './csvProcessor';

// Your loadData function here...

export async function loadData(filename: string) {
	let client: PoolClient | undefined;
	try {
		// Connect to the database
		client = await pool.connect();
		// The Database was struggling to insert the data in one go, so it needed to work with 'batches' instead to not overwhelm it
		const batchSize = 50; // Variable to specify the number of rows to insert in each batch.
		console.log('Processing the CSV...');
		const rowCount = await processCsv({filename, client, batchSize});
		console.log('Total rows processed:', rowCount);
	} catch (error) {
		console.error('Error connecting to database:', error);
	} finally {
		if (client) {
			// Release the client back to the pool
			client.release();
		} else {
			// If client is not assigned due to an error, release it back to the pool
			await pool.end(); // End the pool to prevent hanging connections
		}
	}
}

// Call the loadData function and handle any errors
loadData('Supervised-Business-Register.csv').catch(console.error);

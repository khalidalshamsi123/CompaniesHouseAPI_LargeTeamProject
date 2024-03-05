import pool from '../databasePool';
import {type PoolClient} from 'pg';
import {processCsv} from './csvProcessor';

export async function loadData(filename: string) {
	let client: PoolClient | undefined;
	try {
		// Connect to the database
		client = await pool.connect();
		// The Database was struggling to insert the data in one go, so it needed to work with 'batches' instead to not overwhelm it
		const batchSize = 50; // Variable to specify the number of rows to insert in each batch.
		const rowCount = await processCsv({filename, client, batchSize});
		console.log('Total rows processed:', rowCount);
	} catch (error) {
		console.error('Error connecting to database:', error);
	} finally {
		if (client) {
			// Release the client back to the pool
			client.release();
		}
	}
}

// Call the loadData function and handle any errors
loadData('Supervised-Business-Register.csv').catch(console.error);

import pool from '../../database/setup/databasePool';
import type {PoolClient} from 'pg';
import {processHmrcCsv} from './processHmrcCsv';

async function hmrcComponent(filename: string) {
	let client: PoolClient | undefined;
	try {
		// Connect to the database
		client = await pool.connect();
		// The Database was struggling to insert the data in one go, so it needed to work with 'batches' instead to not overwhelm it
		const batchSize = 50; // Variable to specify the number of rows to insert in each batch.
		console.log('Processing the CSV...');
		const rowCount = await processHmrcCsv({filename, client, batchSize});
		console.log('Total rows processed:', rowCount);
	} catch (error) {
		console.error('Error connecting to database:', error);
	} finally {
		// Release the client back to the pool
		if (client) {
			client.release();
		}
	}
}

// Call the HMRC function for testing purposes
hmrcComponent('./files/Supervised-Business-Register.csv').catch(console.error);

export{hmrcComponent};

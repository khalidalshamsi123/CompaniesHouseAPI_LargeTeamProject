import type {PoolClient} from 'pg';
import {processHmrcCsv} from './processHmrcCsv';
import fs from 'fs';
import path from 'path'; // Import path module to handle file paths
import pool from '../../database/setup/databasePool';

async function hmrcComponent(csvKey: string) {
	// Check if the csvKey is valid
	if (csvKey !== 'hmrcCsv') {
		throw new Error('Invalid csvKey provided. Expected "hmrcCsv".');
	}

	// Let client: PoolClient | undefined;
	const client: PoolClient = await pool.connect();
	try {
		// Client = await pool.connect();
		// Start transaction
		await client.query('BEGIN');
		// Generate file name from csvKey
		const fileName = getFileNameFromKey(csvKey);
		if (!fileName) {
			throw new Error(`No file name found for csvKey "${csvKey}".`);
		}

		// Construct file path using __dirname
		const filePath = path.join(__dirname, `../../files/${fileName}.csv`);
		// Check if the file exists
		if (!fs.existsSync(filePath)) {
			throw new Error(`CSV file "${fileName}.csv" not found at "${filePath}".`);
		}

		// The Database was struggling to insert the data in one go, so it needed to work with 'batches' instead to not overwhelm it
		const batchSize = 50; // Variable to specify the number of rows to insert in each batch.
		console.log('Processing the CSV...');
		const rowCount = await processHmrcCsv({filePath, client, batchSize});
		console.log('Total rows processed:', rowCount);
	} catch (error) {
		await client.query('ROLLBACK');
		console.error('Error processing HMRC CSV:', error);
	} finally {
		// Release the client back to the pool
		if (client) {
			client.release();
		}
	}
}

/**
 * Compares the given key against strings. If a match is found will return the name of the CSV file relevant to the key provided.
 * WITHOUT the .csv extension.
 * @param key Either 'licencesCsv' or businessesCsv'.
 * @returns the name of the CSV related to the given key. E.g., licencesCsv will return `business-licence-register-businesses`.
 */
function getFileNameFromKey(key: string) {
	if (key === 'hmrcCsv') {
		return 'Supervised-Business-Register';
	}
}

export {hmrcComponent};

// Call the HMRC function for testing purposes
hmrcComponent('hmrcCsv').catch(console.error);

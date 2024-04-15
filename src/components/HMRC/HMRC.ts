import type {PoolClient} from 'pg';
import {processHmrcCsv} from './processHmrcCsv';
import fs from 'fs';
import path from 'path'; // Import path module to handle file paths
import pool from '../../database/setup/databasePool';

class HmrcCsvUploader {
	/**
	 * Public function to upload CSV file based on the provided key.
	 * @param csvKey The key identifying the type of CSV file to upload.
	 */
	public async uploadHmrcCsv(csvKey: string) {
		await this.hmrcUpdateFromCsvKey(csvKey);
	}

	/**
	 * Private function to update HMRC data from a CSV file.
	 * @param csvKey The key identifying the type of CSV file to update.
	 * @throws {Error} If the provided csvKey is invalid or if there's an error processing the CSV file.
	 */
	private async hmrcUpdateFromCsvKey(csvKey: string) {
		// Check if the csvKey is valid
		if (csvKey !== 'hmrcCsv') {
			throw new Error('Invalid csvKey provided. Expected "hmrcCsv".');
		}

		// Let client: PoolClient | undefined;
		const client: PoolClient = await pool.connect();
		try {
			// Start transaction
			await client.query('BEGIN');
			// Generate file name from csvKey
			const fileName = csvKey === 'hmrcCsv' ? 'Supervised-Business-Register' : undefined;
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
			throw error; // Rethrow the error to propagate it further
		} finally {
			// Release the client back to the pool
			if (client) {
				client.release();
			}
		}
	}
}

export {HmrcCsvUploader};

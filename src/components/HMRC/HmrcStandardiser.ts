import {type Request} from 'express';
import {type CsvKeys} from '../../types/GamblingCommissionTypes';
import {PoolClient} from "pg";
import pool from "../../database/setup/databasePool";
import path from "path";
import fs from "fs";
import {processHmrcCsv} from "./processHmrcCsv";

export default class HmrcStandardiser {
	public async standardise(data: Request | CsvKeys[], schema: string): Promise<void> {
		if (data instanceof Array) {
			await this.hmrcUpdateFromCsvKey(data);
		} else {
			// Handle the case where the first argument is a Request object. NOT IMPLEMENTED
		}
	}


	/**
	 * Private function to update HMRC data from a CSV file.
	 * @param csvKeys The keys identifying the type of CSV file to update.
	 * @throws {Error} If the provided csvKey is invalid or if there's an error processing the CSV file.
	 */
	private async hmrcUpdateFromCsvKey(csvKeys: CsvKeys[]) {
		const hmrcCsvContained = csvKeys.includes('hmrcCsv');

		// Check if the csvKey is valid
		if (!hmrcCsvContained) {
			throw new Error('Invalid csvKey provided. Expected "hmrcCsv".');
		}

		// Let client: PoolClient | undefined;
		const client: PoolClient = await pool.connect();
		try {
			// Start transaction
			await client.query('BEGIN');
			// Generate file name from csvKey
			const fileName = hmrcCsvContained ? 'Supervised-Business-Register' : undefined;
			if (!fileName) {
				throw new Error(`No file name found for csvKeys "${csvKeys}".`);
			}

			// Construct file path using __dirname
			const filePath = path.join(__dirname, `../../../files/${fileName}.csv`);
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

import fs from 'fs';
import csvParser from 'csv-parser';
import {insertDataStandardiser} from '../../database/insertDataStandardiser';
import {type PoolClient} from 'pg';
import path from 'path';

import SnapshotManager from '../TableSnapshot/SnapshotManager';

/**
 * Read and process the HMRC CSV data from the received file.
 * @param filePath Specifies the filePath in order to print the fileName.
 * @param client Database client.
 * @param batchSize Size of each batch for database transactions.
 * @returns The number of rows processed.
 */
async function csvReader(filePath: string, client: PoolClient, batchSize: number): Promise<number> {
	let rowCount = 0; // Counter for the number of rows processed
	let status1Index = -1;
	let refIdIndex = -1;
	return new Promise((resolve, reject) => {
		// Extract the file name from the file path
		const fileName = path.basename(filePath);
		// Create a readable stream from the CSV file
		fs.createReadStream(filePath)
			// Pipe the stream through the CSV parser
			.pipe(csvParser())
			// Event handler for each row of data
			.on('data', async (row: Record<string, any>) => {
				try {
					rowCount++;
					// Check if it's the header row
					if (rowCount === 1) {
						// Find the index of the 'STATUS1' and registration ID columns in the header
						status1Index = Object.keys(row).findIndex(key => key.toLowerCase() === 'status');
						refIdIndex = Object.keys(row).findIndex(key => key.toLowerCase().includes('licence number') || key.toLowerCase().includes('reg'));
						return;
					}

					// Process the current row of data
					await insertDataStandardiser({
						row,
						refIdIndex,
						status1Index,
						client,
					});
				} catch (error) {
					console.error('Error processing row:', error);
					reject(error instanceof Error ? error : new Error(String(error)));
				}
			})
			// Event handler for the end of the CSV file
			.on('end', async () => {
				try {
					// Take Snapshot of table.
					const snapshotManager = new SnapshotManager(client);
					await snapshotManager.takeSnapshot('hmrc');
					// Commit any remaining rows in the database
					await client.query('COMMIT');
					console.log(`CSV data loaded successfully from file: ${fileName}`);
					resolve(rowCount); // Resolve the Promise with the total row count
				} catch (error) {
					console.error('Error committing transaction:', error);
					reject(error instanceof Error ? error : new Error(String(error)));
				}
			})
			// Event handler for errors while reading the CSV file
			.on('error', (error: any) => {
				console.error('Error reading CSV file:', error);
				reject(new Error(error instanceof Error ? error.message : String(error)));
			});
	});
}

export {csvReader};

import fs from 'fs';
import csvParser from 'csv-parser';
import {processDataRow} from '../dataProcessor';
import {type PoolClient} from 'pg';

/**
 * Read and process CSV data from the given file.
 * @param filename Path to the CSV file.
 * @param client Database client.
 * @param batchSize Size of each batch for database transactions.
 * @returns The number of rows processed.
 */
export async function readAndProcessCsv(filename: string, client: PoolClient, batchSize: number): Promise<number> {
	let rowCount = 0; // Counter for the number of rows processed
	let status1Index = -1;
	let regIdIndex = -1;
	const cache: Record<string, boolean> = {}; // Cache to store processed registration IDs
	return new Promise((resolve, reject) => {
		// Create a readable stream from the CSV file
		fs.createReadStream(filename)
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
						regIdIndex = Object.keys(row).findIndex(key => key.toLowerCase().includes('licence number') || key.toLowerCase().includes('reg'));
						return;
					}
					// Process the current row of data

					await processDataRow({
						row,
						regIdIndex,
						status1Index,
						cache,
						client,
						batchSize,
						rowCount,
					});
				} catch (error) {
					console.error('Error processing row:', error);
					reject(error instanceof Error ? error : new Error(String(error)));
				}
			})
			// Event handler for the end of the CSV file
			.on('end', async () => {
				try {
					// Commit any remaining rows in the database
					await client.query('COMMIT');
					console.log(`CSV data loaded successfully from file: ${filename}`);
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

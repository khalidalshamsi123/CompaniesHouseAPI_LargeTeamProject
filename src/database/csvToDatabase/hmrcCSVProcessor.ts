import fs from 'fs';
import csvParser from 'csv-parser';
import {type PoolClient} from 'pg';

type CsvProcessorOptions = {
	filename: string;
	client: PoolClient;
	batchSize: number;
};

export async function processCsv({filename, client, batchSize}: CsvProcessorOptions): Promise<number> {
	let rowCount = 0;
	let status1Index = -1;
	let regIdIndex = -1;

	return new Promise((resolve, reject) => {
		fs.createReadStream(filename)
			.pipe(csvParser())
			.on('data', async (row: Record<string, any>) => {
				try {
					rowCount++; // Increment row counter

					// Check if it's the header row
					if (rowCount === 1) {
						// Find the index of the 'STATUS1' and registrationid columns in the header
						status1Index = Object.keys(row).findIndex(key => key.toLowerCase() === 'status1');
						regIdIndex = Object.keys(row).findIndex(key => key.toLowerCase().includes('reg'));
						return;
					}

					const registrationId = String(row[Object.keys(row)[regIdIndex]]);
					const status1Value = String(row.STATUS1);
					let query = '';
					let values: any[] = [];
					// Determine which table to insert the row based on the status1Value
					if (status1Value && status1Value.toLowerCase() === 'approved') {
						// Insert into business_registry
						query = 'INSERT INTO registration_schema.business_registry (registrationid, businessname, fca_approved, hmrc_approved, gambling_approved) VALUES ($1, $2, $3, $4, $5)';
						values = [
							registrationId,
							row.BUSINESS_NAME,
							false,
							true,
							false,
						];
					} else if (status1Value && status1Value.toLowerCase() === 'applied') {
						// Insert into non_approved_registry
						query = 'INSERT INTO registration_schema.non_approved_registry (registrationid, businessname, fca_applied, hmrc_applied, gambling_applied) VALUES ($1, $2, $3, $4, $5)';
						values = [
							registrationId,
							row.BUSINESS_NAME,
							false,
							true,
							false,
						];
					} else {
						return;
					}

					// Execute the query to insert the row into the database
					await client.query(query, values);

					// Commit transaction every batchSize rows, a new transaction is started to improve performance and avoid long-running transactions.
					if (rowCount % batchSize === 0) {
						await client.query('COMMIT');
						await client.query('BEGIN');
					}
				} catch (error) {
					console.error('Error inserting row:', error);
					reject(error instanceof Error ? error : new Error(String(error)));
				}
			})
			.on('end', async () => {
				try {
					// Commit any remaining rows
					await client.query('COMMIT');
					console.log(`CSV data loaded successfully from file: ${filename}`);
					resolve(rowCount);
				} catch (error) {
					console.error('Error committing transaction:', error);
					reject(error instanceof Error ? error : new Error(String(error)));
				}
			})
			.on('error', (error: any) => {
				console.error('Error reading CSV file:', error);
				reject(new Error(error instanceof Error ? error.message : String(error)));
			});
	});
}

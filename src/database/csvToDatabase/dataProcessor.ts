import {type PoolClient} from 'pg';

type DataRow = {
	row: Record<string, any>;
	regIdIndex: number;
	cache: Record<string, boolean>;
	client: PoolClient;
	batchSize: number;
	rowCount: number;
};

/**
 * Process a single row of CSV data.
 * @param data The data object containing row, regIdIndex, cache, client, batchSize, and rowCount.
 */
export async function processDataRow({row, regIdIndex, cache, client, batchSize, rowCount}: DataRow) {
	const registrationId = String(row[Object.keys(row)[regIdIndex]]);
	const status1Value = String(row.STATUS1);
	let query = '';
	let values: any[] = [];
	// Determine the query and values based on the status1Value
	if (status1Value && status1Value.toLowerCase() === 'approved') {
		query = 'INSERT INTO registration_schema.business_registry (registrationid, businessname, fca_approved, hmrc_approved, gambling_approved) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (registrationid) DO UPDATE SET businessname = EXCLUDED.businessname';
		values = [
			registrationId,
			row.BUSINESS_NAME,
			false,
			true,
			false,
		];
	} else {
		// Skip processing if status is not 'approved'
		return;
	}

	// Check if the row has already been processed
	if (!cache[registrationId]) {
		// Execute the query and mark the registration ID as processed
		await client.query(query, values);
		cache[registrationId] = true;
	}

	// Commit transaction every batchSize rows
	if (rowCount % batchSize === 0) {
		await client.query('COMMIT');
		await client.query('BEGIN');
	}
}

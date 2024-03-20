import {type PoolClient} from 'pg';

type DataRow = {
	row: Record<string, any>;
	regIdIndex: number;
	status1Index: number;
	cache: Record<string, boolean>;
	client: PoolClient;
	batchSize: number;
	rowCount: number;
};

/**
 * Process a single row of CSV data.
 * @param data The data object containing row, regIdIndex, cache, client, batchSize, and rowCount.
 */
export async function processDataRow({row, regIdIndex, status1Index, cache, client, batchSize, rowCount}: DataRow) {
	let query = '';
	let values: any[] = [];

	const registrationId = String(row[Object.keys(row)[regIdIndex]]);
	const hmrcStatus = String(row[Object.keys(row)[status1Index]]);

	// Determine the query and values based on the status1Value
	if (hmrcStatus && (hmrcStatus.toLowerCase() === 'approved' || hmrcStatus.toLowerCase() === 'active')) {
		query = 'INSERT INTO registration_schema.business_registry (registrationid, businessname, fca_approved, hmrc_approved, gambling_approved) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (registrationid) DO UPDATE SET businessname = EXCLUDED.businessname';
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
	// Check if the row has already been processed

	// TODO. To me it doesn't look like cache does anything. Besides storing each row that is processed within memory.
	// Which will very quickly become inefficient if processing a large file.
	// I am of the opinion to remove it. Though, as Rhiannon created this component I will discuss this with her at a later date.

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

/**
 * Follows same concept of batching used by the HMRC INSERT process.
 * Will perform a UPSERT in batches. Size of batch depends on the caller.
 * Values contained within given arrays are unnested by Postgres to perform the bulk-insert.
 * @param businessNames An array of legal business names. Known as a `Licence Account Name` within `business-licence-register-businesses.csv`
 * @param gamblingApprovalStatuses An array of approval statuses for each business (row).
 * @param insertClient Database client retrieved from the Postgres pool.
 */
export async function insertGamblingCommissionBatch(businessNames: string[], gamblingApprovalStatuses: boolean[], insertClient: PoolClient) {
	try {
		// Inserts gambling commission rows in batches.
		const query = `INSERT INTO registration_schema.business_registry (businessname, gambling_approved)
		SELECT * FROM UNNEST($1::text[], $2::boolean[])
		ON CONFLICT (businessname) DO UPDATE SET gambling_approved = EXCLUDED.gambling_approved`;
		const values = [
			businessNames,
			gamblingApprovalStatuses,
		];
		// Insert batch.
		await insertClient.query(query, values);
	} catch (e) {
		console.error(e);
	}
}

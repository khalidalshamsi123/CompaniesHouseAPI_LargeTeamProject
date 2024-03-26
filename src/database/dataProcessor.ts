import type {PoolClient} from 'pg';

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
	const registrationId = String(row[Object.keys(row)[regIdIndex]]);
	const status1Value = String(row[Object.keys(row)[status1Index]]).toLowerCase().replace(/[\W_]/g, '');

	// Determine the query and values based on the status1Value
	if (status1Value === 'approved') {
		await hmrcProcess(row, registrationId, client);
	} else if (status1Value === 'active') {
		await gamblingCommissionProcess(row, registrationId, client);
	}

	// Commit transaction every batchSize rows
	if (rowCount % batchSize === 0) {
		await client.query('COMMIT');
		await client.query('BEGIN');
	}
}

/**
 * Process data for HMRC approved businesses.
 * @param row The row data.
 * @param registrationId The registration ID.
 * @param client The database client.
 */
async function hmrcProcess(row: any, registrationId: string, client: PoolClient) {
	const query = `
	    INSERT INTO registration_schema.business_registry (registrationid, businessname, fca_approved, hmrc_approved, gambling_approved)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (businessname)
		DO UPDATE SET hmrc_approved = EXCLUDED.hmrc_approved;
	`;
	const values = [
		registrationId,
		row.BUSINESS_NAME,
		false,
		true,
		false,
	];
	await client.query(query, values);
}

/**
 * Process data for Gambling Commission approved businesses.
 * @param row The row data.
 * @param registrationId The registration ID.
 * @param client The database client.
 */
async function gamblingCommissionProcess(row: any, registrationId: string, client: PoolClient) {
	const query = `
		INSERT INTO registration_schema.business_registry (registrationid, businessname, fca_approved, hmrc_approved, gambling_approved)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (businessname)
		DO UPDATE SET gambling_approved = EXCLUDED.gambling_approved;
	`;
	const values = [
		registrationId,
		row.BUSINESS_NAME,
		false,
		false,
		true,
	];
	await client.query(query, values);
}

// Future developers: To add support for another government regulatory body:
// 1. Identify the condition for approval in the CSV data (e.g., status column value).
// 2. Create a new function similar to hmrcProcess and gamblingCommissionProcess.
// 3. Update the processDataRow function to call the new function based on the identified condition.
// 4. Update the database schema and queries accordingly to store and update the new approval status.
// 5. Ensure proper error handling and transaction management for data consistency.

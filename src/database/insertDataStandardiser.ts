import type {PoolClient} from 'pg';
import {type DataRow, type GamblingCommissionData} from '../types/DatebaseInsertTypes';

/**
 * Process a single row of CSV data.
 * @param data The data object containing row, regIdIndex, cache, client, batchSize, and rowCount.
 */
async function insertDataStandardiser(data: GamblingCommissionData): Promise<void>;
// eslint-disable-next-line @typescript-eslint/unified-signatures
async function insertDataStandardiser(data: DataRow): Promise<void>;
async function insertDataStandardiser(data: DataRow | GamblingCommissionData): Promise<void> {
	if (isDataRow(data)) {
		// Data is of type DataRow
		const {row, regIdIndex, status1Index, client} = data;
		const registrationId = String(row[Object.keys(row)[regIdIndex]]);
		const statusIndex = Object.keys(row)[status1Index];
		const statusValue = String(row[statusIndex]); // Convert status value to string
		// Determine the boolean value based on the status string
		const status = statusValue.toLowerCase();
		if (status === 'approved') {
			await hmrcProcess(row, registrationId, client);
		}
	} else if (isGamblingCommissionData(data)) {
		console.log(data.gamblingApprovalStatuses);
		// Data is of type GamblingCommissionData
		await gamblingCommissionInsert(data.businessNames, data.gamblingApprovalStatuses, data.insertClient, data.schema);
	} else {
		throw new Error('Invalid type provided.');
	}
}

// Type guard functions
function isDataRow(data: any): data is DataRow {
	return 'client' in data;
}

function isGamblingCommissionData(data: any): data is GamblingCommissionData {
	return 'gamblingApprovalStatuses' in data;
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
 * @param businessNames The array of business names.
 * @param gamblingApprovalStatuses The boolean value indicating gambling approval status.
 * @param insertClient The database client.
 * @param schema The database schema.
 */
async function gamblingCommissionInsert(businessNames: string[], gamblingApprovalStatuses: boolean[], insertClient: PoolClient, schema: string) {
	// Construct the SQL query to insert data into the business_registry table
	const query = `
        INSERT INTO ${schema}.business_registry (businessname, gambling_approved)
        -- Unnest the businessNames and gamblingApprovalStatuses arrays to insert multiple rows at once
        SELECT * FROM UNNEST($1::TEXT[], $2::BOOLEAN[])
        AS t (businessname, gambling_approved)
        ON CONFLICT (businessname)
        DO UPDATE SET gambling_approved = EXCLUDED.gambling_approved;
    `;
	// Execute the query using the database client
	await insertClient.query(query, [businessNames, gamblingApprovalStatuses]);
}

export {hmrcProcess, insertDataStandardiser};

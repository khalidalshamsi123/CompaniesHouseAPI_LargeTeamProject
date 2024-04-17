import type {PoolClient} from 'pg';
import {type DataRow, type GamblingCommissionData} from '../types/DatabaseInsertTypes';
import BusinessNameProcessor from '../components/BusinessNameProcessor';

/**
 * Process a single row of CSV data.
 * @param data The data object containing row, regIdIndex, cache, client, batchSize, and rowCount.
 */
async function insertDataStandardiser(data: GamblingCommissionData): Promise<void>;
// eslint-disable-next-line @typescript-eslint/unified-signatures
async function insertDataStandardiser(data: DataRow): Promise<void>;
async function insertDataStandardiser(data: DataRow | GamblingCommissionData): Promise<void> {
	const businessNameProcessor = new BusinessNameProcessor();
	if (isDataRow(data)) {
		// Data is of type DataRow
		const {row, refIdIndex, status1Index, client} = data;
		const referenceId = String(row[Object.keys(row)[refIdIndex]]);
		const statusIndex = Object.keys(row)[status1Index];
		const statusValue = String(row[statusIndex]); // Convert status value to string
		// Determine the boolean value based on the status string
		const status = statusValue.toLowerCase();
		row.BUSINESS_NAME = businessNameProcessor.standardize(row['Business Name'] as string);
		await hmrcProcess(row, referenceId, client, status);
	} else if (isGamblingCommissionData(data)) {
		data.businessNames = businessNameProcessor.standardize(data.businessNames);
		// Data is of type GamblingCommissionData
		await gamblingCommissionInsert(data.referenceId, data.businessNames, data.gamblingApprovalStatuses, data.insertClient, data.schema);
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
async function hmrcProcess(row: any, referenceId: string, client: PoolClient, status: string) {
	let hmrcApproved = false;
	if (status === 'approved') {
		hmrcApproved = true;
	}

	const query = `
        INSERT INTO registration_schema.hmrc_business_registry (referenceid, businessname, hmrc_approved)
        VALUES ($1, $2, $3)
        ON CONFLICT (referenceid)
        DO UPDATE SET hmrc_approved = EXCLUDED.hmrc_approved;
    `;

	const values = [
		referenceId,
		row['Business Name'],
		hmrcApproved,
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

async function gamblingCommissionInsert(referenceIds: string[], businessNames: string[], gamblingApprovalStatuses: boolean[], insertClient: PoolClient, schema: string) {
	// Construct the SQL query to insert data into the business_registry table
	const query = `
        INSERT INTO ${schema}.gambling_business_registry (referenceid, businessname, gambling_approved)
        -- Unnest the referenceIds, businessNames, and gamblingApprovalStatuses arrays to insert multiple rows at once
        SELECT * FROM UNNEST($1::TEXT[], $2::TEXT[], $3::BOOLEAN[])
        AS t (referenceid, businessname, gambling_approved)
        ON CONFLICT (referenceid)
        DO UPDATE SET gambling_approved = EXCLUDED.gambling_approved;
    `;
	// Execute the query using the database client
	await insertClient.query(query, [referenceIds, businessNames, gamblingApprovalStatuses]);
}

export {hmrcProcess, insertDataStandardiser};

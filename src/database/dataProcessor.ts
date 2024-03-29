import type {PoolClient} from 'pg';

type DataRow = {
	row: Record<string, any>;
	regIdIndex: number;
	status1Index: number;
	client: PoolClient;
};

type CsvDataType = {
	businessNames: string[];
	gamblingApprovalStatuses: boolean;
	insertClient: PoolClient;
	schema: string;
};

/**
 * Process a single row of CSV data.
 * @param data The data object containing row, regIdIndex, cache, client, batchSize, and rowCount.
 */
export async function processDataRow(data: CsvDataType): Promise<void>;
// eslint-disable-next-line @typescript-eslint/unified-signatures
export async function processDataRow(data: DataRow): Promise<void>;
export async function processDataRow(data: DataRow | CsvDataType): Promise<void> {
	if ('client' in data) {
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
	} else {
		console.log(data.gamblingApprovalStatuses);
		// Data is of type CsvDataType
		await gamblingCommissionInsert(data.businessNames, data.gamblingApprovalStatuses, data.insertClient, data.schema);
	}
}

/**
 * Process data for HMRC approved businesses.
 * @param row The row data.
 * @param registrationId The registration ID.
 * @param client The database client.
 */
export async function hmrcProcess(row: any, registrationId: string, client: PoolClient) {
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
async function gamblingCommissionInsert(businessNames: string[], gamblingApprovalStatuses: boolean, insertClient: PoolClient, schema: string) {
	const query = `
        INSERT INTO ${schema}.business_registry (businessname, gambling_approved)
        VALUES ($1, $2)
        ON CONFLICT (businessname)
        DO UPDATE SET gambling_approved = EXCLUDED.gambling_approved;
    `;
	const values = [businessNames, gamblingApprovalStatuses];
	await insertClient.query(query, values);
}

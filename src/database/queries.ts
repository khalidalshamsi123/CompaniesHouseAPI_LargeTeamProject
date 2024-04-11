import pool from './setup/databasePool';

// These need to be spelt to match the column names in database so when we read it maps it correctly to this type.
export type HmrcBusinessData = {
	referenceid: string;
	businessname: string;
	hmrc_approved: boolean;
};
export type GamblingBusinessData = {
	referenceid: string;
	businessname: string;
	gambling_approved: boolean;
};

// Finds and returns all the approved (HMRC and gambling) by registration ID
async function findAllApprovedByRegId(referenceId: string, schema: string): Promise<{hmrcApproved: boolean; gamblingApproved: boolean} | undefined> {
	try {
		// Query HMRC and gambling approvals
		const hmrcResult = await pool.query(`SELECT * FROM ${schema}.hmrc_business_registry WHERE referenceid = $1 AND hmrc_approved = true`, [referenceId]);
		console.log('HMRC Result:', hmrcResult.rows); // Print rows of HMRC data

		const gamblingResult = await pool.query(`SELECT * FROM ${schema}.gambling_business_registry WHERE referenceid = $1 AND gambling_approved = true`, [referenceId]);
		console.log('Gambling Result:', gamblingResult.rows); // Print rows of gambling data

		// Determine if both HMRC and gambling approvals exist
		const hmrcApproved = hmrcResult.rows.length > 0;
		const gamblingApproved = gamblingResult.rows.length > 0;

		return {hmrcApproved, gamblingApproved};
	} catch (error) {
		console.error('Error retrieving data:', error);
		throw new Error('Error retrieving data');
	}
}

/**
 * Deletes the rows within the specified table.
 * @param tableName Name of table to delete rows from.
 */
const deleteTableRows = async (tableName: string) => {
	/* I don't use try-catch deliberately. If an error occurs I think the caller
	   should handle the error and decide what to do next. */
	await pool.query(`DELETE FROM registration_schema.${tableName}`);
};

export {findAllApprovedByRegId, deleteTableRows};

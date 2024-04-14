import pool from './setup/databasePool';
import type {CommissionIDs} from '../types/AggregatorTypes';

/**
 * Finds if a given reference ID is approved by specified commissions.
 * @param {string} referenceId - The reference ID to search for.
 * @param {string} schema - The schema to query.
 * @param {CommissionIDs} commissions - The commission object containing commission types ('hmrc' or 'gamblingCommission').
 * @returns {Promise<boolean>} - A boolean indicating if the reference ID is approved by any of the specified commissions.
 * @throws {Error} - If an invalid commission type is given.
 */
async function findAllApprovedByRegId(referenceId: string, schema: string, commissions: CommissionIDs): Promise<boolean> {
	const {hmrc, gamblingCommission} = commissions;

	if (!hmrc && !gamblingCommission) {
		throw new Error('Invalid commission types given');
	}

	let approved = false;
	let hmrcResult;
	let gamblingResult;

	try {
		switch (true) {
			case (hmrc === 'hmrc'):
				hmrcResult = await pool.query(`SELECT * FROM ${schema}.hmrc_business_registry WHERE referenceid = $1 AND hmrc_approved = true`, [referenceId]);
				approved = hmrcResult.rows.length > 0;
				break;
			case (gamblingCommission === 'gamblingCommission'):
				gamblingResult = await pool.query(`SELECT * FROM ${schema}.gambling_business_registry WHERE referenceid = $1 AND gambling_approved = true`, [referenceId]);
				approved = gamblingResult.rows.length > 0;
				break;
			case (hmrc === 'hmrc' && gamblingCommission === 'gamblingCommission'):
				hmrcResult = await pool.query(`SELECT * FROM ${schema}.hmrc_business_registry WHERE referenceid = $1 AND hmrc_approved = true`, [referenceId]);
				gamblingResult = await pool.query(`SELECT * FROM ${schema}.gambling_business_registry WHERE referenceid = $1 AND gambling_approved = true`, [referenceId]);
				approved = hmrcResult.rows.length > 0 || gamblingResult.rows.length > 0;
				break;
			default:
				break;
		}
	} catch (error) {
		console.error('Error in findAllApprovedByRegId:', error);
		throw error;
	}

	return approved;
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

export {findAllApprovedByRegId};

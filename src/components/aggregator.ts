import {fcaGetApprovalStatus} from './fcaQuerier';
import type {ResponseBodyStatus, CommissionIDs} from '../types/AggregatorTypes';
import {findAllApprovedByRegId} from '../database/queries';

/**
 * Retrieves and aggregates approval status information for a business from various regulatory bodies.
 * @param {string} referenceId - The reference ID of the business.
 * @param {string} businessName - The name of the business.
 * @param {string} schema - The schema to query in the database.
 * @param {CommissionIDs} commissions - An object containing commission IDs for querying.
 * @returns {Promise<ResponseBodyStatus>} A promise resolving to the response body status object.
 * @throws {Error} If an error occurs during data retrieval or aggregation.
 */
async function queryAggregator(referenceId: string, businessName: string, schema: string, commissions: CommissionIDs) {
	try {
		// Retrieve approval status for each commission type
		let databaseCommissionApproved = false;

		// Hardcoding this for now becaquse itll be fixed on my branch (#43)
		const commission = commissions.gamblingCommission ?? commissions.hmrc ?? '';

		const databaseResult = await findAllApprovedByRegId(referenceId, schema, commission);
		if (databaseResult !== undefined) {
			databaseCommissionApproved = databaseResult;
		}

		// Retrieve FCA approval status from the API
		const {isAuthorised} = await fcaGetApprovalStatus(referenceId);

		// Generate timestamp
		const timestamp = new Date().toISOString();
		// Construct response object
		const responseObj: ResponseBodyStatus = {
			timestamp,
			referenceId,
			businessName,
			approvedWith: {
				fca: isAuthorised,
				databaseCommissions: databaseCommissionApproved,
			},
			approved: isAuthorised || databaseCommissionApproved,
		};

		return responseObj;
	} catch (error) {
		console.error(error);
		throw error;
	}
}

export {queryAggregator};

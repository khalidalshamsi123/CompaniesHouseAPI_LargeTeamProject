import {fcaGetApprovalStatus} from './fcaQuerier';
import type {CommissionIDs, ResponseBodyStatus} from '../types/AggregatorTypes';
import {findAllApprovedByRegId} from '../database/queries';

// HmrcCsvReader('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1');


/**
 * Queries various regulatory bodies to determine the approval status of a business
 * based on given commission IDs. It handles HMRC, Gambling Commission, and FCA.
 * Avoids unnecessary queries by checking if ID is provided before querying.
 * This can be easily extended to more commissions by modifying the type in AggregatorTypes.ts
 *
 * @param {string} businessName - The name of the business to query.
 * @param {CommissionIDs} commissionIDs - An object containing IDs for querying
 *                                        the HMRC, Gambling Commission, and FCA.
 * @returns {Promise<ResponseBodyStatus | undefined>} A promise that resolves to the status object
 *                                                    or undefined in case of an error.
 */
async function queryAggregator(businessName: string, commissionIDs: CommissionIDs): Promise<ResponseBodyStatus | undefined> {
	try {
		const { gamblingCommission, hmrc, fca } = commissionIDs;

		// Initialize approval flags for each commission
		let fcaApproved = false, hmrcApproved = false, gamblingApproved = false;

		// Conditional queries based on the presence of commission IDs to extract approval statuses
		if (hmrc) {
			const hmrcData = await findAllApprovedByRegId(hmrc);
			hmrcApproved = hmrcData?.hmrc_approved ?? false;
		}

		if (gamblingCommission) {
			const gamblingData = await findAllApprovedByRegId(gamblingCommission);
			gamblingApproved = gamblingData?.gambling_approved ?? false;
		}

		if (fca) {
			const { isAuthorised } = await fcaGetApprovalStatus(fca);
			fcaApproved = isAuthorised;
		}

		// Generate a UNIX timestamp
		const timestamp = new Date().toISOString();

		// Construct the response JSON object (could just return the object straight, but I prefer to define it like this as it makes it clearer to read).
		const responseObj: ResponseBodyStatus = {
			timestamp,
			commissionIDs,
			businessName,
			approvedWith: {
				fca: fcaApproved,
				hmrc: hmrcApproved,
				gamblingCommission: gamblingApproved,
			},
			approved: fcaApproved || hmrcApproved || gamblingApproved,
		};

		return responseObj;
	} catch (error) {
		console.error("Error in queryAggregator:", error);
		// Before we didnt return anything but I think its better practise to promise to return atleast an undefined object so appropriate error handling can be done.
		return undefined;
	}
}

export {queryAggregator};

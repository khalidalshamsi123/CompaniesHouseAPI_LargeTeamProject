import {fcaGetApprovalStatus} from './fcaQuerier';
import type {CommissionIDs, ResponseBodyStatus, ApprovalResult} from '../types/AggregatorTypes';
import {findAllApprovedByRegId} from '../database/queries';
import BusinessNameProcessor from './BusinessNameProcessor';

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
 * @param {string} schema - The schema to use, lets us define to use test schema in tests.
 * @returns {Promise<ResponseBodyStatus | undefined>} A promise that resolves to the status object
 *                                                    or undefined in case of an error.
 */
async function queryAggregator(businessName: string, commissionIDs: CommissionIDs, schema: string): Promise<ResponseBodyStatus | undefined> {
	try {
		const {gamblingCommission, hmrc, fca} = commissionIDs;

		const schemaToUse = schema && schema.length > 0 ? schema : 'registration_schema';

		const businessNameProcessor = new BusinessNameProcessor();

		// Initialize approval flags for each commission
		let fcaApproved = false;
		let hmrcApproved = false;
		let gamblingApproved = false;

		const promises = [];
		const businessNameMessages = [];

		// Conditional queries based on the presence of commission IDs to extract approval statuses
		if (hmrc) {
			businessNameMessages.push(
				(await businessNameProcessor.compareBusinessNameWithRecord(hmrc, businessName, 'hmrc')).message,
			);
			promises.push(findAllApprovedByRegId(hmrc, schemaToUse, 'hmrc')
				.then(approved => {
					hmrcApproved = approved;
					// Return { hmrcApproved };
				}));
		}

		if (gamblingCommission) {
			businessNameMessages.push(
				(await businessNameProcessor.compareBusinessNameWithRecord(gamblingCommission, businessName, 'gambling')).message,
			);
			promises.push(findAllApprovedByRegId(gamblingCommission, schemaToUse, 'gamblingCommission')
				.then(approved => {
					gamblingApproved = approved;
					// Return { gamblingApproved };
				}));
		}

		if (fca) {
			promises.push(fcaGetApprovalStatus(fca)
				.then(({isAuthorised}) => {
					fcaApproved = isAuthorised;
					// Return { fcaApproved };
				}));
		}

		let concatenatedMessage = '';
		// Mismatching business name detected.
		if (businessNameMessages.length > 0) {
			for (const message of businessNameMessages) {
				concatenatedMessage = concatenatedMessage + '\n' + message;
			}
		}

		// Wait for all the promises to resolve, we have all the needed results for querying
		await Promise.allSettled(promises);
		// Const results = await Promise.allSettled(promises);

		/* // Incase the promises werent resolved in time, we set the booleans after.
		results.forEach(result => {
			if (result.status === 'fulfilled') {
				const value = result.value as ApprovalResult;
				hmrcApproved = value.hmrcApproved;
				gamblingApproved = value.gamblingApproved;
				fcaApproved = value.fcaApproved;
			} else {
				console.error('Promise failed:', result.reason);
			}
		}); */

		// Generate a UNIX timestamp
		const timestamp = new Date().toISOString();

		// Construct the response JSON object (could just return the object straight, but I prefer to define it like this as it makes it clearer to read).
		const responseObj: ResponseBodyStatus = {
			timestamp,
			// We have chosen not to follow camel case to es lint standard for this variable. (typescript-eslint/naming-convention)
			// eslint-disable-next-line
			commissionIDs,
			businessName,
			approvedWith: {
				fca: fcaApproved,
				hmrc: hmrcApproved,
				gamblingCommission: gamblingApproved,
			},
			approved: fcaApproved || hmrcApproved || gamblingApproved,
			message: concatenatedMessage,
		};

		return responseObj;
	} catch (errorLog) {
		console.error('Error in queryAggregator:', errorLog);
		// Before we didnt return anything but I think its better practise to promise to return atleast an undefined object so reliable error handling can be done.
		return undefined;
	}
}

export {queryAggregator};

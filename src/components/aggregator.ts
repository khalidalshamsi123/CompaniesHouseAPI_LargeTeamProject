import {hmrcStatusRetriever, hmrcCsvReader} from '../components/HmrcProcessing';
import {fcaGetApprovalStatus} from './fcaQuerier';
import type {ResponseBodyStatus} from '../types/AggregatorTypes';
import {findAllApprovedByRegId} from '../database/queries';

// HmrcCsvReader('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1');

async function queryAggregator(registrationId: string, businessName: string) {
	try {
		// This will only be used for the HMRC and gambling status
		const businessData = await findAllApprovedByRegId(registrationId);

		// Get FCA Approved with absolute latest relevant data from FCA Api
		const {isAuthorised} = await fcaGetApprovalStatus(registrationId);

		// Check if business data was found and if change status code to return 404.
		const statusCode = businessData ? 200 : 404;
		// Check if the business was not found in the database nor the fca api, then return status code 404 defined earlier.
		if (!businessData && !isAuthorised) {
			return statusCode;
		}

		// Unix timestamp generation.
		const timestamp = Math.floor(new Date().getTime() / 1000);

		const hmrcApproved = businessData?.hmrcApproved ?? false;

		const gamblingApproved = businessData?.gamblingApproved ?? false;
		// Construct the response JSON object
		const responseObj: ResponseBodyStatus = {
			timestamp,
			registrationId,
			businessName,
			approvedWith: {
				fca: isAuthorised,
				hmrc: hmrcApproved,
				gamblingCommission: gamblingApproved,
			},
			approved: isAuthorised || hmrcApproved || gamblingApproved,
		};

		// Send the response with correct status code
		return responseObj;
	} catch (error) {
		console.error(error);
	}
}

export {queryAggregator};

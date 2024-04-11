import {hmrcStatusRetriever, hmrcCsvReader} from '../components/HmrcProcessing';
import {fcaGetApprovalStatus} from './fcaQuerier';
import type {ResponseBodyStatus} from '../types/AggregatorTypes';
import {findAllApprovedByRegId} from '../database/queries';

// HmrcCsvReader('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1');

async function queryAggregator(referenceId: string, businessName: string, schema: string) {
	try {
		// This will only be used for the HMRC and gambling status
		const businessData = await findAllApprovedByRegId(referenceId, schema);

		// Get FCA Approved with absolute latest relevant data from FCA Api
		const {isAuthorised} = await fcaGetApprovalStatus(referenceId);

		// Unix timestamp generation.
		const timestamp = new Date().toISOString();

		const hmrcApproved = businessData?.hmrcApproved ?? false;

		const gamblingApproved = businessData?.gamblingApproved ?? false;

		// Construct the response JSON object
		const responseObj: ResponseBodyStatus = {
			timestamp,
			referenceId,
			businessName,
			approvedWith: {
				fca: isAuthorised,
				hmrc: hmrcApproved,
				gamblingCommission: gamblingApproved,
			},
			approved: (isAuthorised || hmrcApproved || gamblingApproved),
		};

		// Send the response object
		return responseObj;
	} catch (error) {
		console.error(error);
		// Error handling needs working on.
	}
}

export {queryAggregator};

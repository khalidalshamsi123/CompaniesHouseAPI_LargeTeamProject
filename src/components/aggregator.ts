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

		// Unix timestamp generation.
		const timestamp = new Date().toISOString();

		const hmrcApproved = businessData?.hmrc_approved ?? false;

		const gamblingApproved = businessData?.gambling_approved ?? false;
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
			approved: (isAuthorised || hmrcApproved || gamblingApproved),
		};
		// Send the response object
		return responseObj;
	} catch (error) {
		console.error(error);
		// Error hadnling needs working on.
	}
}

export {queryAggregator};

import {hmrcStatusRetriever, hmrcCsvReader} from '../components/HmrcProcessing';
import {fcaGetApprovalStatus} from '../components/fcaQuerier';
import type {ResponseBodyStatus} from '../types/AggregatorTypes';

// HmrcCsvReader('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1');

export async function queryAggregator() {
	// Query both of our sources to recieve a expected response - a boolean.
	const hmrcStatusValue: boolean = hmrcStatusRetriever('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1', 'GWYN DEBBSON AND DAUGHTER');
	const fcaQuerierResponse: boolean = await fcaGetApprovalStatus();

	// Unix timestamp generation.
	const timestamp = Math.floor(new Date().getTime() / 1000);

	// Construct a object that contains the approval statuses across the different sources.
	// Provides a unix timestamp as well.
	const response: ResponseBodyStatus = {
		timestamp,
		hmrc: hmrcStatusValue,
		fca: fcaQuerierResponse,
	};

	return response;
}

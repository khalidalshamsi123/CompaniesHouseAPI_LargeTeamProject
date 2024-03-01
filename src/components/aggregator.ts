import {hmrcStatusRetriever, hmrcCsvReader} from '../components/HmrcProcessing';

// HmrcCsvReader('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1');

export async function queryAggregator() {
	const hmrcStatusValue = hmrcStatusRetriever('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1', 'GWYN DEBBSON AND DAUGHTER');
}

import {Router} from 'express';
import {queryAggregator} from '../components/aggregator';
import isAuthorised from '../middleware/authentication';

import type {ResponseBodyStatus} from '../types/AggregatorTypes';
import {hmrcCsvReader} from '../components/HmrcProcessing';

const router = Router();

router.get('/', isAuthorised, async (req, res) => {
	let response: ResponseBodyStatus;
	try {
		response = await queryAggregator();
	} catch (e) {
		console.error(e);
		res.sendStatus(500);
		return;
	}

	res.send(response).status(200);
});

// All hmrc data router.
router.get('/allhmrc', (req, res) => {
	res.send(hmrcCsvReader('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1')).status(200);
});

export default router;

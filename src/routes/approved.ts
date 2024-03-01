import {Router} from 'express';
import {queryAggregator} from '../components/aggregator';
import isAuthorised from '../middleware/authentication';

import type {ResponseBodyStatus} from '../types/AggregatorTypes';

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

export default router;

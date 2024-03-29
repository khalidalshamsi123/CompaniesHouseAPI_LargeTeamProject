import {Router} from 'express';
import {queryAggregator} from '../components/aggregator';
import isAuthorised from '../middleware/authentication';
import {findAllApprovedByRegId} from '../database/queries';
import {fcaGetApprovalStatus} from '../components/fcaQuerier';

import type {ResponseBodyStatus} from '../types/AggregatorTypes';
import {hmrcCsvReader} from '../components/HmrcProcessing';
import {scrapeHmrcWebsite} from '../scraping/fetchingHmrcFile';

const router = Router();

router.get('/', isAuthorised, async (req, res) => {
	try {
		const {registrationId} = req.query;
		const {businessName} = req.query;

		// @ts-expect-error registrationid will always be string, so this error can be supressed, any error handling is done within the function
		const responseObj: ResponseBodyStatus = await queryAggregator(registrationId, businessName);

		// Check if the business was not found in the database nor the fca api, then return status code 404 defined earlier.
		if (!responseObj) {
			res.sendStatus(404);
			return;
		}

		// Check if business data was found and if not approved change status code to return 400 or if approved change to 200.
		const statusCode = responseObj.approved ? 200 : 400;

		// Send the response with correct status code
		res.status(statusCode).json(responseObj);
	} catch (error) {
		console.error(error);
		res.sendStatus(400);
	}
});

// All hmrc data router.
router.get('/allhmrc', async (req, res) => {
	await scrapeHmrcWebsite('#contents > div.gem-c-govspeak.govuk-govspeak > div > p:nth-child(13) > span > a');
	res.sendStatus(200);
});

export default router;

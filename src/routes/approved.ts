import {Router} from 'express';
import {queryAggregator} from '../components/aggregator';
import isAuthorised from '../middleware/authentication';
import {findAllApprovedByRegId} from '../database/queries';
import {fcaGetApprovalStatus} from '../components/fcaQuerier';

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

// Sub route to get all approved (/approved/allApproved)
router.get('/allApproved', async (req, res) => {
	try {
		const {registrationId} = req.query;
		const {businessName} = req.query;
		// This will only be used for the HMRC and gambling status
		// @ts-expect-error Its possible registrationid could be null, if it is null this is dealt within the function.
		const businessData = await findAllApprovedByRegId(registrationId);

		// Get FCA Approved with absolute latest relevant data from FCA Api
		// @ts-expect-error Its possible registrationid could be null, if it is null this is dealt within the function.
		const {isAuthorised} = await fcaGetApprovalStatus(registrationId);

		// Check if business data was found and if change status code to return 404.
		const statusCode = businessData ? 200 : 404;
		// Check if the business was not found in the database nor the fca api, then return status code 404 defined earlier.
		if (!businessData && !isAuthorised) {
			res.sendStatus(statusCode);
			return;
		}

		const hmrcApproved = businessData?.hmrcApproved ?? false;

		const gamblingApproved = businessData?.gamblingApproved ?? false;
		// Construct the response JSON object
		const responseObj = {
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
		res.json(responseObj).status(statusCode);
	} catch (error) {
		console.error(error);
		res.sendStatus(400);
	}
});

export default router;

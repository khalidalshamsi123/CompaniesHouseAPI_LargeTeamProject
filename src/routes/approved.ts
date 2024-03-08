import {Router} from 'express';
import {queryAggregator} from '../components/aggregator';
import isAuthorised from '../middleware/authentication';

import build from '../components/GamblingCommission/GamblingCommissionFactory';

import type {ResponseBodyStatus} from '../types/AggregatorTypes';
import {hmrcCsvReader} from '../components/HmrcProcessing';
import {type GamblingCommissionCsv} from '../types/GamblingCommissionTypes';

import {promises as fs} from 'fs';

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
router.get('/allhmrc', (req, res) => {
	res.send(hmrcCsvReader('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1')).status(200);
});

router.get('/test-gambling-commission-upload-bytes', async (req, res) => {
	// Use the factory method to get a ready-to-use instance of the Gambling Commission class.
	const gamblingCommission = await build();

	try {
		const response1 = await fs.readFile('./business-licence-register-businesses.csv');
		const array1: Uint8Array = new Uint8Array(response1.buffer);

		const response2 = await fs.readFile('./business-licence-register-licences.csv');
		const array2: Uint8Array = new Uint8Array(response2.buffer);

		const object: GamblingCommissionCsv = {
			licensesCsv: {
				byteData: array2,
			},
			businessesCsv: {
				byteData: array1,
			},
		};

		await gamblingCommission.uploadCsvFromBytes(object);

		res.sendStatus(200);
	} catch (err) {
		console.error(err);
		res.sendStatus(500);
	}
});

export default router;

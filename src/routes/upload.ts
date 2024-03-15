import build from '../components/GamblingCommission/GamblingCommissionFactory';

import {Router} from 'express';
import isAuthorised from '../middleware/authentication';
const router = Router();

router.get('/', (req, res) => {
	res.send('Success').status(200);
});

router.post('/gambling-commission', isAuthorised, async (req, res) => {
	// Use the factory method to get a ready-to-use instance of the Gambling Commission class.
	const gamblingCommission = await build();

	try {
		// Pass req, which is a Readable stream to upload method.
		await gamblingCommission.uploadCsv(req, 'registration_schema');
		res.sendStatus(200);
	} catch (err) {
		/* Unprocessable entity code. A user story can be dedicated towards providing proper response codes
		   based on the particular circumstance. */
		res.sendStatus(422);
	}
});

// Router.post('/test-gambling-commission-upload-local', async (req, res) => {
// 	const gamblingCommission = await build();

// 	try {
// 		await gamblingCommission.uploadCsv('businessesCsv');
// 	} catch (error) {
// 		console.error(error);
// 	}
// });

export default router;

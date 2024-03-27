import build from '../components/GamblingCommission/GamblingCommissionFactory';
import {type Request} from 'express-serve-static-core';
import {Router} from 'express';
import isAuthorised from '../middleware/authentication';
import path from 'path';
import multer from 'multer';
import standardiserInterface from "../components/standardiserInterface";
const upload = multer({dest: 'uploads/'});

const router = Router();

router.get('/', (req, res) => {
	res.send('Success').status(404);
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

// This router handles both the upload post for HMRC and Gambling Commission CSVs.
router.put('/', upload.array('files'), async (req: Request, res) => {
	try {
		if (!req.files || req.files.length === 0) {
			return res.status(400).send('No files uploaded');
		}

		const standardiser = new standardiserInterface();
		// You need to await the async call to processInput
		const response = await standardiser.processInput(req as Request, "");

		// Since you are now awaiting, response should be the actual result and not a Promise.
		if (response && response.failedUploads.length === 0) {
			res.status(200).json(response);
		} else {
			// Make sure to handle the case where response may not have the property 'failedUploads'
			res.status(207).json(response);
		}
	} catch (error) {
		console.error('Error uploading CSVs:', error);
		res.status(500).send('An error occurred while uploading the CSVs.');
	}
});

export default router;

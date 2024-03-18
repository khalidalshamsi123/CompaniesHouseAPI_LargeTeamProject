import build from '../components/GamblingCommission/GamblingCommissionFactory';

import {Router} from 'express';
import isAuthorised from '../middleware/authentication';
import path from 'path';
import multer from 'multer';
const upload = multer({dest: 'uploads/'});

const router = Router();

router.get('/', (req, res) => {
	res.send('Success').status(404);
});

router.post('/gambling-commission', async (req, res) => {
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
// !!! The Gambling commission upload functionality is yet to be implemented. !!!
router.put('/', upload.array('files'), async (req, res) => {
	try {
		if (!req.files || req.files.length === 0) {
			return res.status(400).send('No files uploaded');
		}

		// We want to log all the successful and failed upload to provide a detailed feedback to the uploader (companies house employee)
		const successfulUploads = [];
		const failedUploads = [];

		// This line normalizes req.files to an array of File objects as if it isnt
		// an array we use Object.values() to get an array of the object's values
		// and then use the .flat() to flatten the array of arrays into a single array of File objects.
		const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();

		for (const file of files) {
			const fileExtension = path.extname(file.originalname);
			if (fileExtension !== '.csv') {
				failedUploads.push(`${file.originalname} (Invalid file type)`);
				continue;
			}

			const fileName = path.basename(file.originalname, fileExtension);

			try {
				if (fileName === 'HMRC_CSV') {
					// Assuming we will have some implementation here we feed the CSV into to insert into database
					// await handleHMRCCSV(file.path);
					successfulUploads.push(`${file.originalname} (HMRC CSV)`);
				} else if (fileName.includes('Gambling_Commission_')) {
					// Assuming we will have some implementation here we feed the CSV into to insert into database
					// await handleGamblingCommissionCSVs(file.path);
					successfulUploads.push(`${file.originalname} (Gambling Commission CSV)`);
				} else {
					failedUploads.push(`${file.originalname} (Invalid file name)`);
				}
			} catch (error) {
				console.error(`Error processing ${file.originalname}:`, error);
				failedUploads.push(`${file.originalname} (Error occurred)`);
			}
		}

		const response = {
			successfulUploads,
			failedUploads,
		};

		if (failedUploads.length === 0) {
			res.status(200).json(response);
		} else {
			res.status(207).json(response);
		}
	} catch (error) {
		console.error('Error uploading CSVs:', error);
		res.status(500).send('An error occurred while uploading the CSVs.');
	}
});
export default router;

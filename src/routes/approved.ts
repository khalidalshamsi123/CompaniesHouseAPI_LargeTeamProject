import {Router, query} from 'express';
import axios, {type AxiosRequestConfig} from 'axios';
import pl, {DataFrame, col, readCSV} from 'nodejs-polars';
import {csvReader, hmrcCsvReader} from '../components/HmrcProcessing';
import {queryAggregator} from '../components/aggregator';

import * as dotenv from 'dotenv';
import isAuthorised from '../middleware/authentication';

dotenv.config();

const axiosConfig: AxiosRequestConfig = {
	headers: {
		'X-Auth-Email': 'vieirai@cardiff.ac.uk',
		'X-Auth-Key': process.env.API_KEY_FCA,
		'Content-Type': 'application/json',
	},
};

type ResponseBody = {
	authorized: boolean;
	timestamp: number;
};

type JsonValue = {
	name: string;
	status: string;
};

type JsonObjectValues = {
	name: string;
	status: boolean;
};

const router = Router();

router.get('/fca', isAuthorised, async (req, res) => {
	try {
		const fcaResponse = await axios.get('https://register.fca.org.uk/services/V0.1/Firm/122702', axiosConfig);

		const data = fcaResponse.data.Data[0] as Record<string, unknown>;
		const status = data.Status;
		const isAuthorised = (status === 'Authorised');

		const statusCode = isAuthorised ? 200 : 400;
		const timestamp = Math.floor(new Date().getTime() / 1000);

		// Unix timestamp.
		const responseBody: ResponseBody = {
			authorized: isAuthorised,
			timestamp,
		};

		res.send(responseBody).status(statusCode);
	} catch (error) {
		console.error(error);
		res.sendStatus(400);
	}
});

// Creating a sub route
router.get('/hmrc', (req, res) => {
	const response = await queryAggregator();
	res.send().status(200);
});

// All hmrc data router.
router.get('/allhmrc', (req, res) => {
	res.send().status(200);
});

export default router;

import {Router} from 'express';
import axios, {type AxiosRequestConfig} from 'axios';
import pl, {DataFrame, col} from 'nodejs-polars';

import * as dotenv from 'dotenv';

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

const router = Router();

router.get('/fca', async (req, res) => {
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
// First implementation, used for client showcase.
function csvReader(csvFile: string, columnName1: string, columnName2: string, targetValue: string) {
	// Reads the file
	const csvData = pl.readCSV(csvFile);

	// Filters the response with two columns
	const columnOneValues = csvData.getColumn(columnName1);
	const columnTwoValues = csvData.getColumn(columnName2);

	let index = 0;
	// Looping to find the index of a specific value
	for (let i = 0; i < columnOneValues.length; i++) {
		if (columnOneValues[i] === targetValue) {
			index = i;
			break;
		}
	}

	const specifcColumnOneValue: string = columnOneValues[index] as string;
	const specifcColumnTwoValue: string = columnTwoValues[index] as string;

	const jsonValue: JsonValue = {name: specifcColumnOneValue, status: specifcColumnTwoValue};
	return jsonValue;
}

// Second implementation, refactoring the code to return all data with boolean values
function csvRefactoredReader(csvFile: string, columnName1: string, columnName2: string) {
	// Reads the file
	const csvData = pl.readCSV(csvFile);

	// Filters the response with two columns
	const columnOneValues = csvData.getColumn(columnName1);
	const columnTwoValues = csvData.getColumn(columnName2);

	const jsonObjects = [];

	// Looping to find the index of all values with APPROVED
	for (let i = 0; i < columnOneValues.length; i++) {
		if (columnTwoValues[i] === 'APPROVED') {
			const specifcColumnOneValue: string = columnOneValues[i] as string;
			const specifcColumnTwoValue: string = columnTwoValues[i] as string;

			const jsonValue: JsonValue = {name: specifcColumnOneValue, status: specifcColumnTwoValue};
			jsonObjects.push(jsonValue);
		}
	}

	return jsonObjects;
}

// Creating a sub route
router.get('/hmrc', (req, res) => {
	res.send(csvReader('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1', 'GWYN DEBBSON AND DAUGHTER')).status(200);
});

// Test router.
router.get('/test', (req, res) => {
	res.send(csvRefactoredReader('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1')).status(200);
});

export default router;

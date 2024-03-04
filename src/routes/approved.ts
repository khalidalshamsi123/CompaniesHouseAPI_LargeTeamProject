import {Router} from 'express';
import axios, {type AxiosRequestConfig} from 'axios';
import pl, {DataFrame, col} from 'nodejs-polars';

import * as dotenv from 'dotenv';
import isAuthorised from '../middleware/authentication';
import {findAllApprovedByRegID} from "../database/queries";
import {isApprovedFCA} from "../route_utils/fca_util";

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
// First implementation, used for client showcase.
// This function will show the columns (such as business name and status) of the csv that is passed to.
// The parameter 'targetBusinessName' will be used to pick out which business you want to return.
function csvReader(csvFile: string, businessNames: string, approvalStatus: string, targetBusinessName: string) {
	// Reads the file
	const csvData = pl.readCSV(csvFile);

	// Filters the response with two columns
	const businessNamesValues = csvData.getColumn(businessNames);
	const approvalStatusValues = csvData.getColumn(approvalStatus);

	let index = 0;
	// Looping to find the index of a specific value
	for (let i = 0; i < businessNamesValues.length; i++) {
		if (businessNamesValues[i] === targetBusinessName) {
			index = i;
			break;
		}
	}

	const specificBusinessNameValue: string = businessNamesValues[index] as string;
	const specificApprovalStatusValue: string = approvalStatusValues[index] as string;

	const jsonValue: JsonValue = {name: specificBusinessNameValue, status: specificApprovalStatusValue};
	return jsonValue;
}

// Second implementation, refactoring the code to return all hmrc businesses with boolean values
function hmrcCsvReader(csvFile: string, businessName: string, statusColumn: string) {
	try {
		// Reads the file
		const csvData = pl.readCSV(csvFile);

		// Filters the response with two columns
		const businessNameValues = csvData.getColumn(businessName);
		const statusColumnValues = csvData.getColumn(statusColumn);

		const jsonObjects = [];

		// Looping to find the index of all values with APPROVED
		// After finding the values, i convert them to a boolean type
		// to true if it was approved, false if it wasnt.
		for (let i = 0; i < businessNameValues.length; i++) {
			let statusColumnValue = false;
			if (statusColumnValues[i] === 'APPROVED') {
				statusColumnValue = true;
			}

			// This stores the data of the two columns 'name' and 'status' in a JSON object
			// Finally it would be pushed to an array containing all of the JSON objects.
			const jsonValue: JsonObjectValues = {name: businessNameValues[i] as string, status: statusColumnValue};
			jsonObjects.push(jsonValue);
		}

		return jsonObjects;
	} catch (error: any) {
		console.error('Error reading CSV file:', error.message);
		return [];
	}
}

// Creating a sub route
router.get('/hmrc', (req, res) => {
	res.send(csvReader('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1', 'GWYN DEBBSON AND DAUGHTER')).status(200);
});

// All hmrc data router.
router.get('/allhmrc', (req, res) => {
	res.send(hmrcCsvReader('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1')).status(200);
});


//Sub route to get all approved (/approved/allApproved)
router.get('/allApproved', async (req, res) => {
	try {
		const registrationId = req.query.registrationId;
		// @ts-ignore
		//This will only be used for the HMRC and gambling status
		const businessData = await findAllApprovedByRegID(registrationId);

		//Check if business data was found and if not return 404.
		const statusCode = businessData ? 200 : 404;
		if (!businessData) {
			res.sendStatus(statusCode);
			return;
		}

		//Update the FCA Approved with absolute relevant data from FCA Api
		// @ts-ignore
		const { authorized, timestamp } = await isApprovedFCA(registrationId);
		businessData.fcaApproved = authorized;

		//Construct the response JSON object
		const responseObj = {
			registrationId: businessData.registrationId,
			businessName: businessData.businessName,
			Approved: {
				FCA: businessData.fcaApproved,
				HMRC: businessData.hmrcApproved,
				Gambling_Comission: businessData.gamblingApproved,
			},
		};

		//Send the response with correct status code
		res.json(responseObj).status(statusCode);
	} catch (error) {
		console.error(error);
		res.sendStatus(400);
	}
});



export default router;

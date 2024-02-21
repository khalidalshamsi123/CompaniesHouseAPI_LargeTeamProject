import {Router} from 'express';
import axios, {type AxiosRequestConfig} from 'axios';

import * as dotenv from 'dotenv';

dotenv.config();

const axiosConfig: AxiosRequestConfig = {
	headers: {
		'X-Auth-Email': 'alsarmih@cardiff.ac.uk',
		'X-Auth-Key': process.env.API_KEY_FCA,
		'Content-Type': 'application/json',
	},
};

type ResponseBody = {
	authorized: boolean;
	timestamp: number;
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


function csvReader(csvFile: string, columnName1: string, columnName2: string){
  //reads the file
  let csvData = pl.readCSV(csvFile);
  //filters the response with two columns
  let filteredData = csvData.select(columnName1, columnName2);
  return filteredData;
}

//creating a sub route
router.get('/hmrc', (req, res) => {
  res.send(csvReader("hmrc-supervised-data-test-data.csv", 'BUSINESS_NAME', 'STATUS1')).status(200);
} )


export default router

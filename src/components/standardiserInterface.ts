import path from 'path';
import GamblingCommission from './GamblingCommission/GamblingCommission';
import pool from '../database/databasePool';
import hmrcStandardiser from './hmrc/HmrcStandardiser';
import {type CsvKeys} from '../types/GamblingCommissionTypes';
import {type Request} from 'express-serve-static-core';

/**
 * Enum for standardiser keys.
 */
enum StandardiserKey {
	HMRC = 'hmrc',
	GAMBLING_COMMISSION = 'gambling_commission',
}

/**
 * Interface for standardising data.
 */
type Standardiser = {
	standardise(data: CsvKeys[] | Request, schema: string): Promise<void>;
};

/* Obselete following implementation of custom "File-Commission" header.

interface File {
	// Since we only want the name to determine which standardiser the file goes to we define our own interface
	originalname: string;

}

type FileProcessingResult = {
	originalname: string;
	status: string;
}; */

/**
 * Class responsible for managing different data standardisers.
 */
class StandardiserInterface {
	readonly standardisers: Map<StandardiserKey, Standardiser>;

	constructor() {
		this.standardisers = new Map();
	}

	/**
     * Process input data using the appropriate standardiser. This is the function that should be called externally always.
     * @param {CsvKeys[] | Request} data - The data to be processed.
     * @param {string} schema - The database schema to be used.
     * @returns {Promise<void | { successfulUploads: string[], failedUploads: string[] }>} - The result of the processing.
     */
	public async processInput(data: Request | CsvKeys[], schema: string): Promise<{successfullyUploaded: boolean; errorMsg: string}> {
		try {
			await this.setupStandardiserMaps();
			if (data instanceof Array) {
				return await this.processCsvKeys(data, schema);
			}

			return await this.processRequest(data);
		} catch (error) {
			console.error('Error in processInput: ', error);
			throw error; // Rethrow the error after logging it.
		}
	}

	/**
     * Set up the standardiser functions in hashmap.
     */
	// Made this public for testing purposes and there is no real affect of it being public so it should be fine.
	async setupStandardiserMaps(): Promise<void> {
		this.standardisers.set(StandardiserKey.HMRC, new hmrcStandardiser());
	}

	/**
     * Processes the CSV keys and delegates to the appropriate standardiser.
     * @param {CsvKeys[]} csvKeys - The keys representing CSV data types.
     * @param {string} schema - The database schema to be used.
     */
	async processCsvKeys(csvKeys: CsvKeys[], schema: string): Promise<{successfullyUploaded: boolean; errorMsg: string}> {
		let successfullyUploaded = false;
		let errorMsg = '';
		if (csvKeys.includes('businessesCsv') || csvKeys.includes('licencesCsv')) {
			await this.buildGamblingCommissionStandardiser();
			const standardiser = this.standardisers.get(StandardiserKey.GAMBLING_COMMISSION);
			await standardiser!.standardise(csvKeys, schema);
			successfullyUploaded = true;
		} else if (csvKeys.includes('hmrcCsv')) {
			const standardiser = this.standardisers.get(StandardiserKey.HMRC);
			await standardiser!.standardise(csvKeys, schema);
			successfullyUploaded = true;
		} else {
			console.error('Invalid combination of files');
			errorMsg = 'Invalid combination of files';
		}

		return {successfullyUploaded, errorMsg};
	}

	/**
     * Processes a request object containing file uploads.
     * @param {Request} request - The request object from Express.
     * @param {string} schema - The database schema to be used.
     * @returns {Promise<{ successfulUploads: string[], failedUploads: string[] }>} - The result of the file processing.
     */

	/* This whole implementation I (IV) wrote is now obselete as we are assuming that the request contains a custom header informing the file(s) commissions
		so there is no need to use multer. See below for updated implementation.

	async processRequest(request: Request, schema: string): Promise<{ successfulUploads: string[]; failedUploads: string[] }> {
		try {
			// Normalize request.files to an array of File objects
			let files: File[] = [];
			const filesData = request.files;
			if (filesData instanceof Array) { // Single file input or multiple files under one field name
				files = filesData as File[];
			} else if (typeof filesData === 'object') { // Multiple file inputs with different field names
				for (const [fieldname, fileArray] of Object.entries(filesData)) {
					files = files.concat(fileArray as File[]);
				}
			}

			const fileProcessingPromises = files.map(async (file): Promise<FileProcessingResult> => {
				const fileExtension = path.extname(file.originalname);

				if (fileExtension !== '.csv') {
					return { originalname: file.originalname, status: 'Invalid file type' };
				}

				const fileName = path.basename(file.originalname, fileExtension);

				if (fileName.includes('hmrc-supervised-data') || fileName.includes('business-licence-register-businesses')) {
					// Since we are not processing the files here, just return the original name and status
					return { originalname: file.originalname, status: 'CSV' };
				}

				return { originalname: file.originalname, status: 'Invalid file name' };
			});

			const results = await Promise.all(fileProcessingPromises);
			const successfulUploads = results.filter(r => r.status === 'CSV').map(r => r.originalname);
			const failedUploads = results.filter(r => r.status !== 'CSV').map(r => r.originalname);

			return { successfulUploads, failedUploads };
		} catch (error) {
			console.error('Error processing request:', error);
			throw error; // Rethrow the error after logging it.
		}
	} */


	/**
	 * Processes the incoming request by validating custom headers and
	 * standardising the file based on the File-Commission type.
	 * It checks for the presence of a "File-Commission" header and validates its value.
	 * Depending on the "File-Commission" value, a corresponding standardiser is called.
	 * If the operation is successful, the `successfullyUploaded` flag is set to true.
	 * In case of any failure or error, an appropriate error message is set.
	 *
	 * @async
	 * @param {Request} request - The incoming request object to be processed.
	 * @returns {Promise<{successfullyUploaded: boolean; errorMsg: string}>} An object containing
	 * a flag indicating whether the upload was successful, and an error message if applicable.
	 */
	async processRequest(request: Request): Promise<{successfullyUploaded: boolean; errorMsg: string}> {
		let errorMsg = '';
		let successfullyUploaded = false;
		try {
			// Validate that the "File-Commission" custom header exists
			const fileCommission = Array.isArray(request.headers['File-Commission'])
				? request.headers['File-Commission'][0]
				: request.headers['File-Commission'];
			if (!fileCommission) {
				successfullyUploaded = false;
				errorMsg = 'File-Commission header is missing';
			}

			// Validate that the "File-Commission" header has a valid string
			if (typeof fileCommission !== 'string') {
				successfullyUploaded = false;
				errorMsg = 'File-Commission value must be a string';
			}

			// Switch on the file commission to call correct standardiser to run. I did switch instead of chain of if statements feels cleaner/more maintainable
			// so more commissions could be easier to add. Remembering to always use the ENUMS so any keys can be changed much easier.
			switch (fileCommission) {
				case StandardiserKey.GAMBLING_COMMISSION:
					await this.buildGamblingCommissionStandardiser();
					await this.standardisers.get(StandardiserKey.GAMBLING_COMMISSION)!.standardise(request, '');
					successfullyUploaded = true;
					break;
				case StandardiserKey.HMRC:
					await this.standardisers.get(StandardiserKey.HMRC)!.standardise(request, '');
					successfullyUploaded = true;
					break;
				default:
					// Always have this last, no keys would've been matched so we just set error msg here for now as its an invalid file commission
					errorMsg = 'Incorrect File-Commission header: ' + fileCommission;
			}
		} catch (error) {
			console.error('Error processing request:', error);
			errorMsg = 'Error processing request: Unknown error';
		}

		return {successfullyUploaded, errorMsg};
	}

	private async buildGamblingCommissionStandardiser(): Promise<void> {
		await this.createGamblingCommissionTables();
		const standardiser = new GamblingCommission();
		this.standardisers.set(StandardiserKey.GAMBLING_COMMISSION, standardiser);
	}

	private async createGamblingCommissionTables(): Promise<void> {
		try {
			const schema = process.env.NODE_ENV === 'test' ? 'test_schema' : 'registration_schema';

			await pool.query(`
                CREATE TABLE IF NOT EXISTS ${schema}.business_licence_register_businesses (
                    account_number BIGINT PRIMARY KEY,
                    licence_account_name VARCHAR(255) NOT NULL
                );
            `);

			await pool.query(`
                CREATE TABLE IF NOT EXISTS ${schema}.business_licence_register_licences (
                    account_number BIGINT NOT NULL,
                    licence_number VARCHAR(255) NOT NULL,
                    status VARCHAR(255) NOT NULL,
                    type VARCHAR(255) NOT NULL,
                    activity VARCHAR(255) NOT NULL,
                    start_date timestamptz,
                    end_date timestamptz
                );
            `);
		} catch (error) {
			console.error(error);
			console.error('You have most likely forgotten to set your NODE_ENV variable within .env');
		}
	}
}

export default StandardiserInterface;

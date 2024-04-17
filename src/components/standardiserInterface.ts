import path from 'path';
import GamblingCommission from './GamblingCommission/GamblingCommission';
import pool from '../database/setup/databasePool';
import hmrcStandardiser from './HMRC/HmrcStandardiser';
import {type CsvKeys} from '../types/GamblingCommissionTypes';
import {type Request} from 'express-serve-static-core';
import HmrcStandardiser from './HMRC/HmrcStandardiser';

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
		this.standardisers.set(StandardiserKey.HMRC, new HmrcStandardiser());
	}

	/**
     * Processes the CSV keys and delegates to the appropriate standardiser.
     * @param {CsvKeys[]} csvKeys - The keys representing CSV data types.
     * @param {string} schema - The database schema to be used.
     */
	async processCsvKeys(csvKeys: CsvKeys[], schema: string): Promise<{successfullyUploaded: boolean; errorMsg: string}> {
		let successfullyUploaded = false;
		let errorMsg = '';

		// Helper function to filter CSV keys for the Gambling Commission, returning new array with values that match GC
		const filterForGamblingCommission = (commissionKeys: CsvKeys[]) => commissionKeys.filter(commissionKey => commissionKey === 'businessesCsv' || commissionKey === 'licencesCsv');

		// Helper function to filter CSV keys for HMRC, returning new array with values that match HMRC
		const filterForHmrc = (commissionKeys: CsvKeys[]) => commissionKeys.filter(commissionKey => commissionKey === 'hmrcCsv');

		if (csvKeys.includes('businessesCsv') || csvKeys.includes('licencesCsv')) {
			try {
				await this.buildGamblingCommissionStandardiser();
				const standardiser = this.standardisers.get(StandardiserKey.GAMBLING_COMMISSION);
				if (!standardiser) {
					console.error('Standardiser not found for Gambling Commission');
					throw new Error('Standardiser not found');
				}

				// Filter out the keys that aren't applicable for gambling commission standardiser.
				const filteredKeys = filterForGamblingCommission(csvKeys);
				await standardiser.standardise(filteredKeys, schema);
				successfullyUploaded = true;
			} catch (error) {
				console.error('Error during standardisation:', error);
				errorMsg = 'Standardise function not implemented. ';
				if (error instanceof Error) {
					errorMsg += `Error: ${error.message}`;
				}
			}
		}

		if (csvKeys.includes('hmrcCsv')) {
			try {
				const standardiser = this.standardisers.get(StandardiserKey.HMRC);
				if (!standardiser) {
					console.error('Standardiser not found for HMRC');
					throw new Error('Standardiser not found');
				}

				// Filter out the keys that aren't applicable to HMRC standardiser.
				const filteredKeys = filterForHmrc(csvKeys);
				await standardiser.standardise(filteredKeys, schema);
				successfullyUploaded = true;
			} catch (error) {
				console.error('Error during standardisation:', error);
				errorMsg += 'Standardise function not implemented. ';
				if (error instanceof Error) {
					errorMsg += `Error: ${error.message}`;
				}
			}
		}

		if (!successfullyUploaded) {
			console.error('Invalid combination of files or no operation performed');
			errorMsg += 'Invalid combination of files or no operation performed.';
		}

		return {successfullyUploaded, errorMsg};
	}

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
			const fileCommission = Array.isArray(request.headers['file-commission'])
				? request.headers['file-commission'][0]
				: request.headers['file-commission'];
			if (!fileCommission) {
				successfullyUploaded = false;
				errorMsg = 'file-commission header is missing';
			}

			// Validate that the "File-Commission" header has a valid string
			if (typeof fileCommission !== 'string') {
				successfullyUploaded = false;
				errorMsg = 'file-commission value must be a string';
			}

			// Switch on the file commission to call correct standardiser to run. I did switch instead of chain of if statements feels cleaner/more maintainable
			// so more commissions could be easier to add. Remembering to always use the ENUMS so any keys can be changed much easier.
			switch (fileCommission) {
				case StandardiserKey.GAMBLING_COMMISSION:
					try {
						await this.buildGamblingCommissionStandardiser();
						const standardiser = this.standardisers.get(StandardiserKey.GAMBLING_COMMISSION);
						if (!standardiser) {
							console.error('Standardiser not found for Gambling Commission');
						}

						await standardiser!.standardise(request, 'registration_schema');
						successfullyUploaded = true;
					} catch (error) {
						console.error('Error during standardisation:', error);
						errorMsg = 'Standardise function not implemented';
						// The errorMsg goes to companies house manually uploading so we can give insightful detail.
						if (error instanceof Error) {
							errorMsg = `Standardise function not implemented: ${error.message}`;
						}
					}

					break;
				case StandardiserKey.HMRC:
					try {
						const standardiser = this.standardisers.get(StandardiserKey.HMRC);
						if (!standardiser) {
							console.error('Standardiser not found for HMRC');
						}

						await standardiser!.standardise(request, 'registration_schema');
						successfullyUploaded = true;
					} catch (error) {
						console.error('Error during standardisation:', error);
						errorMsg = 'Standardise function not implemented';
						if (error instanceof Error) {
							errorMsg = `Standardise function not implemented: ${error.message}`;
						}
					}

					break;
				default:
					// Always have this last, no keys would've been matched so we just set error msg here for now as its an invalid file commission
					errorMsg = `Incorrect File-Commission header: ${fileCommission}`;
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

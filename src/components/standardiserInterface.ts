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
	public async processInput(data: Request | CsvKeys[], schema: string): Promise<void | {successfulUploads: string[]; failedUploads: string[]}> {
		try {
			await this.setupStandardiserMaps();
			if (data instanceof Array) {
				await this.processCsvKeys(data, schema);
				return;
			}

			return await this.processRequest(data, schema);
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
	async processCsvKeys(csvKeys: CsvKeys[], schema: string): Promise<void> {
		if (csvKeys.includes('businessesCsv') || csvKeys.includes('licencesCsv')) {
			await this.buildGamblingCommissionStandardiser();
			const standardiser = this.standardisers.get(StandardiserKey.GAMBLING_COMMISSION);
			await standardiser!.standardise(csvKeys, schema);
		} else if (csvKeys.includes('hmrcCsv')) {
			const standardiser = this.standardisers.get(StandardiserKey.HMRC);
			await standardiser!.standardise(csvKeys, schema);
		} else {
			console.error('Invalid combination of files');
		}
	}

	/**
     * Processes a request object containing file uploads.
     * @param {Request} request - The request object from Express.
     * @param {string} schema - The database schema to be used.
     * @returns {Promise<{ successfulUploads: string[], failedUploads: string[] }>} - The result of the file processing.
     */
	async processRequest(request: Request, schema: string): Promise<{successfulUploads: string[]; failedUploads: string[]}> {
		try {
			const files = request.files as Express.Multer.File[] | undefined;
			const fileProcessingPromises = (files ?? []).map(async file => {
				const fileExtension = path.extname(file.originalname);

				if (fileExtension !== '.csv') {
					return {originalname: file.originalname, status: 'Invalid file type'};
				}

				const fileName = path.basename(file.originalname, fileExtension);

				try {
					if (fileName.includes('hmrc-supervised-data')) {
						const standardiser = this.standardisers.get(StandardiserKey.HMRC);
						await standardiser!.standardise(request, schema);
						return {originalname: file.originalname, status: 'HMRC CSV'};
					}

					if (fileName.includes('business-licence-register-businesses')) {
						await this.buildGamblingCommissionStandardiser();
						const standardiser = this.standardisers.get(StandardiserKey.GAMBLING_COMMISSION);
						await standardiser!.standardise(request, schema);
						return {originalname: file.originalname, status: 'Gambling Commission CSV'};
					}

					return {originalname: file.originalname, status: 'Invalid file name'};
				} catch (error) {
					console.error(`Error processing ${file.originalname}:`, error);
					return {originalname: file.originalname, status: 'Error occurred'};
				}
			});

			const results = await Promise.all(fileProcessingPromises);
			const successfulUploads = results.filter(r => r.status.includes('CSV')).map(r => `${r.originalname} (${r.status})`);
			const failedUploads = results.filter(r => !r.status.includes('CSV')).map(r => `${r.originalname} (${r.status})`);

			return {successfulUploads, failedUploads};
		} catch (error) {
			console.error('Error processing request:', error);
			throw error; // Rethrow the error after logging it.
		}
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

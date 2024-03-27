import { Request } from 'express';
import { hmrcCsvReader } from "./HmrcProcessing";
import GamblingCommission from "./GamblingCommission/GamblingCommission";
import pool from "../database/databasePool";
import hmrcStandardiser from "./hmrc/hmrcStandardiser";
import path from "path";

interface Standardiser {
    standardise(data: string | string[] | Request, schema: string): Promise<void | Error>;
}

class StandardiserInterface {
    private standardisers: Map<string, Standardiser>;

    constructor() {
        this.standardisers = new Map();
        this.setupStandardiserMaps();
    }

    public async processInput(data: string | string[] | Request, schema: string) {
        // Set to the csvKey(s) data if we are working with csv keys and set false if not so we can treat data as request to pass it to correct function
        const csvKeys = typeof data === 'string' || Array.isArray(data) ? data : false;

        // This means we are using csv keys so we can find which standardiser to use based on the csvkey information
        if (csvKeys !== false) {
            if (csvKeys.includes('unknown')) {
                console.error('Unsupported file type');
                // Handle unsupported file type
                return;
            }

            if (csvKeys.includes('businessesCsv') || csvKeys.includes('licensesCsv')) {
                await this.buildGamblingCommissionStandardiser();
                const standardiser = this.standardisers.get('gambling_commission');
                // @ts-ignore
                await standardiser.standardise(csvKeys,schema);
            } else if (csvKeys.includes('hmrcCsv')) {
                const standardiser = this.standardisers.get('hmrc');
                // @ts-ignore
                await standardiser.standardise(csvKeys,schema);
            } else {
                console.error('Invalid combination of files');
                // Invalid combination of files since for gambling commission both files are needed
            }
            return;
        }
        else if (data instanceof Request) {
            // Let's now treat the data as a request so to find out which CSV has been given in this request we need following logic
            // @ts-ignore
            const files = data.files;

            // We want to log all the successful and failed upload to provide a detailed feedback to the uploader (companies house employee)
            const successfulUploads = [];
            const failedUploads = [];

            for (const file of files) {
                const fileExtension = path.extname(file.originalname);
                // Think this might need to be changed after they changed their file ext to odb?
                if (fileExtension !== '.csv') {
                    failedUploads.push(`${file.originalname} (Invalid file type)`);
                    continue;
                }

                const fileName = path.basename(file.originalname, fileExtension);

                try {
                    if (fileName.includes('hmrc-supervised-data')) {

                        // @ts-ignore
                        await this.standardisers.get('hmrc').standardise(data,'');
                        successfulUploads.push(`${file.originalname} (HMRC CSV)`);
                    } else if (fileName.includes('business-licence-register-businesses')) {
                        // @ts-ignore
                        await this.standardisers.get('gambling_commission').standardise(data,schema);
                        successfulUploads.push(`${file.originalname} (Gambling Commission CSV)`);
                    } else {
                        failedUploads.push(`${file.originalname} (Invalid file name)`);
                    }
                } catch (error) {
                    console.error(`Error processing ${file.originalname}:`, error);
                    failedUploads.push(`${file.originalname} (Error occurred)`);
                }
            }
            return {successfulUploads, failedUploads};
        }
    }

    // Set up standardisers that dont require preproccessing like gambling commission here
    private async setupStandardiserMaps(){
        // @ts-ignore
        this.standardisers.set('hmrc', hmrcStandardiser)
    }

    private async buildGamblingCommissionStandardiser() {
        await this.createGamblingCommissionTables();
        const standardiser = new GamblingCommission();
        this.standardisers.set('gambling_commission', standardiser);
    }

    private async createGamblingCommissionTables() {
        try {
            const environment = process.env.NODE_ENV;
            let schema = 'registration_schema';
            if (environment === 'test') {
                schema = 'test_schema';
            }

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
        } catch (e) {
            console.error(e);
            console.error('You have most likely forgotten to set your NODE_ENV variable within .env');
        }
    }

    private getCsvKeysFromInput(input: string | string[] | Request): string[] {
        if (typeof input === 'string') {
            return [input];
        } else if (Array.isArray(input)) {
            return input;
        } else {
            const csvKeys = input.body.csvKeys; // Assuming the csvKeys are sent in the request body
            if (Array.isArray(csvKeys)) {
                return csvKeys;
            } else {
                return [csvKeys];
            }
        }
    }
}

export default StandardiserInterface;
import { hmrcCsvReader } from "./HmrcProcessing";
import GamblingCommission from "./GamblingCommission/GamblingCommission";
import pool from "../database/databasePool";
import hmrcStandardiser from "./hmrc/hmrcStandardiser";
// Import other Standardiser classes as needed

interface Standardiser {
    standardise(...files: File[]): Promise<void>;
}

class StandardiserInterface {
    private standardisers: Map<string, Standardiser>;

    constructor() {
        this.standardisers = new Map();
        // @ts-ignore It has type standardise defined in the class so not sure why it says it does not.
        // Currently a psuedo class since specific standardiser class has not been created yet
        this.standardisers.set('hmrc', hmrcStandardiser);
    }

    public async processFiles(...files: File[]) {
        const csvKeys = files.map(file => this.getFileType(file));

        if (csvKeys.includes('unknown')) {
            console.error('Unsupported file type');
            // Handle unsupported file type
            return;
        }

        // We want to make sure we only have both CSVs if we try to update the database with new gambling commission information.
        if (csvKeys.includes('businessesCsv') && csvKeys.includes('licensesCsv')) {
            await this.buildGamblingCommissionStandardiser();
            const standardiser = this.standardisers.get('gambling_commission');
            // @ts-ignore
            await standardiser.standardise(...files);
        } else if (csvKeys.includes('hmrcCsv')) {
            const standardiser = this.standardisers.get('hmrc');
            // @ts-ignore
            await standardiser.standardise(...files);
        } else {
            console.error('Invalid combination of files');
            // Invalid combination of files since for gambling commission both files are needed
        }
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

    private getFileType(file: File): string {
        const fileName = file.name.toLowerCase();
        switch (true) {
            case fileName.includes('business-licence-register-licences'):
                return 'licensesCsv';
            case fileName.includes('business-licence-register-businesses'):
                return 'businessesCsv';
            case fileName.includes('hmrc'):
                return 'hmrcCsv';
            default:
                return 'unknown';
        }
    }
}

export default StandardiserInterface;
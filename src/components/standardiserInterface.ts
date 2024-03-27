import { Request } from 'express';
import path from 'path';
import { hmrcCsvReader } from "./HmrcProcessing";
import GamblingCommission from "./GamblingCommission/GamblingCommission";
import pool from "../database/databasePool";
import hmrcStandardiser from "./hmrc/hmrcStandardiser";
import { CsvKeys } from "../types/GamblingCommissionTypes";

enum StandardiserKey {
    HMRC = 'hmrc',
    GAMBLING_COMMISSION = 'gambling_commission',
}

interface Standardiser {
    standardise(data: CsvKeys[] | Request, schema: string): Promise<void>;
}

class StandardiserInterface {
    private standardisers: Map<StandardiserKey, Standardiser>;

    constructor() {
        this.standardisers = new Map();
        this.setupStandardiserMaps();
    }

    public async processInput(data: CsvKeys[] | Request, schema: string): Promise<void | { successfulUploads: string[], failedUploads: string[] }> {
        if (Array.isArray(data)) {
            await this.processCsvKeys(data, schema);
        } else if (data instanceof Request) {
            return await this.processRequest(data, schema);
        } else {
            console.error('Invalid data type supplied to processInput');
        }
    }

    private async setupStandardiserMaps(): Promise<void> {
        this.standardisers.set(StandardiserKey.HMRC, new hmrcStandardiser);
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

    private async processCsvKeys(csvKeys: CsvKeys[], schema: string): Promise<void> {
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

    private async processRequest(request: Request, schema: string): Promise<{ successfulUploads: string[], failedUploads: string[] }> {
        const files = request.files as Express.Multer.File[] | undefined;
        const successfulUploads: string[] = [];
        const failedUploads: string[] = [];

        for (const file of files ?? []) {
            const fileExtension = path.extname(file.originalname);

            if (fileExtension !== '.csv') {
                failedUploads.push(`${file.originalname} (Invalid file type)`);
                continue;
            }

            const fileName = path.basename(file.originalname, fileExtension);

            try {
                if (fileName.includes('hmrc-supervised-data')) {
                    const standardiser = this.standardisers.get(StandardiserKey.HMRC);
                    await standardiser!.standardise(request, schema);
                    successfulUploads.push(`${file.originalname} (HMRC CSV)`);
                } else if (fileName.includes('business-licence-register-businesses')) {
                    const standardiser = this.standardisers.get(StandardiserKey.GAMBLING_COMMISSION);
                    await standardiser!.standardise(request, schema);
                    successfulUploads.push(`${file.originalname} (Gambling Commission CSV)`);
                } else {
                    failedUploads.push(`${file.originalname} (Invalid file name)`);
                }
            } catch (error) {
                console.error(`Error processing ${file.originalname}:`, error);
                failedUploads.push(`${file.originalname} (Error occurred)`);
            }
        }

        return { successfulUploads, failedUploads };
    }
}

export default StandardiserInterface;
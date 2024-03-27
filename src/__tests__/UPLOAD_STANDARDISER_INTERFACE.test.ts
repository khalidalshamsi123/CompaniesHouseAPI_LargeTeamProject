import StandardiserInterface from '../components/standardiserInterface';
import GamblingCommission from "../components/GamblingCommission/GamblingCommission";
import hmrcStandardiser from "../components/hmrc/hmrcStandardiser";
import pool from "../database/databasePool";
import { Request } from 'express-serve-static-core';
import { CsvKeys } from "../types/GamblingCommissionTypes";

// Mocking dependencies
jest.mock("../components/GamblingCommission/GamblingCommission");
jest.mock("../components/hmrc/hmrcStandardiser");
jest.mock("../database/databasePool");

// Mock Express Request
const mockRequest = (files: any[]): Partial<Request> => {
    return {
        files: files,
        headers: {}
    } as Request;
};

describe('StandardiserInterface', () => {
    let standardiserInterface: StandardiserInterface;

    beforeEach(() => {
        // Reset modules and instances before each test
        jest.resetModules();
        jest.clearAllMocks();
        standardiserInterface = new StandardiserInterface();
    });

    describe('processInput', () => {
        it('should process CSV keys correctly', async () => {
            const csvKeys: CsvKeys[] = ['businessesCsv', 'licencesCsv'];
            await standardiserInterface.processInput(csvKeys, 'some_schema');

            const GamblingCommissionMock = GamblingCommission as jest.MockedClass<typeof GamblingCommission>;
            expect(GamblingCommissionMock).toHaveBeenCalledTimes(1);
            expect(GamblingCommissionMock.mock.instances[0].standardise).toHaveBeenCalledWith(csvKeys, 'some_schema');
        });

        it('should process HTTP request with file uploads correctly', async () => {
            const files = [
                { originalname: 'hmrc-supervised-data.csv', mimetype: 'text/csv' },
                { originalname: 'business-licence-register-businesses.csv', mimetype: 'text/csv' }
            ];
            const req = mockRequest(files);

            const result = await standardiserInterface.processInput(req as Request, 'some_schema');

            expect(result).toBeDefined();
            expect(result && result.successfulUploads.length).toBe(2);
            expect(result && result.failedUploads.length).toBe(0);

            const hmrcStandardiserMock = hmrcStandardiser as jest.Mocked<typeof hmrcStandardiser>;
            expect(hmrcStandardiserMock).toHaveBeenCalledTimes(1);
            // Commented out because hmrc standardiser class has not been implemented yet so cannot check if its called with these values
            //expect(hmrcStandardiserMock).toHaveBeenCalledWith(req, 'some_schema');

            const GamblingCommissionMock = GamblingCommission as jest.MockedClass<typeof GamblingCommission>;
            expect(GamblingCommissionMock).toHaveBeenCalledTimes(1);
            expect(GamblingCommissionMock.mock.instances[0].standardise).toHaveBeenCalledWith(req, 'some_schema');
        });

        it('should handle invalid data input', async () => {
            const invalidData = { some: 'invalidData' };

            await expect(standardiserInterface.processInput(invalidData as unknown as Request, 'some_schema'))
                .rejects
                .toThrow('Invalid data type supplied to processInput: [object Object]');
        });
    });

});
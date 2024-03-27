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

// Set up enums
enum StandardiserKey {
    HMRC = 'hmrc',
    GAMBLING_COMMISSION = 'gambling_commission',
}

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

    describe('error handling', () => {
        it('should handle errors during CSV key processing', async () => {
            // @ts-ignore the whole point it is invalid so this error can be ignored.
            const csvKeys: CsvKeys[] = ['invalidCsv'];
            const standardiserMethodSpy = jest.spyOn(standardiserInterface as any, 'processCsvKeys');
            standardiserMethodSpy.mockRejectedValueOnce(new Error('Test Error'));

            await expect(standardiserInterface.processInput(csvKeys, 'some_schema')).rejects.toThrow('Test Error');
            expect(standardiserMethodSpy).toHaveBeenCalledWith(csvKeys, 'some_schema');
        });

        it('should handle errors during request processing', async () => {
            const files = [{ originalname: 'invalid-file.csv', mimetype: 'text/csv' }];
            const req = mockRequest(files);
            const standardiserMethodSpy = jest.spyOn(standardiserInterface as any, 'processRequest');
            standardiserMethodSpy.mockRejectedValueOnce(new Error('Test Error'));

            await expect(standardiserInterface.processInput(req as Request, 'some_schema')).rejects.toThrow('Test Error');
            expect(standardiserMethodSpy).toHaveBeenCalledWith(req, 'some_schema');
        });
    });

    describe('processRequest', () => {
        it('should handle invalid file types', async () => {
            const files = [{ originalname: 'invalid-file.txt', mimetype: 'text/plain' }];
            const req = mockRequest(files);

            const result = await standardiserInterface.processInput(req as Request, 'some_schema');

            expect(result).toBeDefined();
            expect(result?.successfulUploads.length).toBe(0);
            expect(result?.failedUploads.length).toBe(1);
            expect(result?.failedUploads[0]).toContain('Invalid file type');
        });

        it('should handle invalid file names', async () => {
            const files = [{ originalname: 'unknown-file.csv', mimetype: 'text/csv' }];
            const req = mockRequest(files);

            const result = await standardiserInterface.processInput(req as Request, 'some_schema');

            expect(result).toBeDefined();
            expect(result?.successfulUploads.length).toBe(0);
            expect(result?.failedUploads.length).toBe(1);
            expect(result?.failedUploads[0]).toContain('Invalid file name');
        });

        it('should handle empty file list', async () => {
            const req = mockRequest([]);

            const result = await standardiserInterface.processInput(req as Request, 'some_schema');

            expect(result).toBeDefined();
            expect(result?.successfulUploads.length).toBe(0);
            expect(result?.failedUploads.length).toBe(0);
        });
    });

    describe('setupStandardiserMaps', () => {
        it('should set up HMRC standardiser correctly', async () => {
            // Assuming setupStandardiserMaps is a public method just for testing purposes
            // Otherwise we would need to test its effect indirectly
            await standardiserInterface.setupStandardiserMaps();

            expect(standardiserInterface['standardisers'].get(StandardiserKey.HMRC)).toBeInstanceOf(hmrcStandardiser);
        });
    });

    describe('processCsvKeys', () => {
        it('should process HMRC CSV keys correctly', async () => {
            const csvKeys: CsvKeys[] = ['hmrcCsv'];
            const schema = 'test_schema';

            // Perform the action
            await standardiserInterface['processCsvKeys'](csvKeys, schema);

            // Assert that the correct standardiser method was called
            const hmrcStandardiserInstance = standardiserInterface['standardisers'].get(StandardiserKey.HMRC);
            expect(hmrcStandardiserInstance!.standardise).toHaveBeenCalledWith(csvKeys, schema);
        });
    });

    describe('processRequest', () => {
        it('should process request with valid HMRC CSV file', async () => {
            const request = {
                files: [{
                    originalname: 'hmrc-supervised-data.csv',
                    mimetype: 'text/csv',
                }] as Express.Multer.File[],
            } as Express.Request;
            const schema = 'test_schema';

            // Perform the action
            const result = await standardiserInterface['processRequest'](request as Request, schema);

            // Assert the expected result
            expect(result.successfulUploads).toContain('hmrc-supervised-data.csv (HMRC CSV)');
            expect(result.failedUploads).toHaveLength(0);
        });

    });
});
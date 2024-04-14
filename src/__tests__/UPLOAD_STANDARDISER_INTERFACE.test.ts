import StandardiserInterface from '../components/standardiserInterface';
import GamblingCommission from '../components/GamblingCommission/GamblingCommission';
import HmrcStandardiser from '../components/HMRC/HmrcStandardiser';
import pool from '../database/setup/databasePool';
import {type Request} from 'express-serve-static-core';
import {type CsvKeys} from '../types/GamblingCommissionTypes';
import standardiserInterface from '../components/standardiserInterface';

// Mocking dependencies
jest.mock('../components/GamblingCommission/GamblingCommission');
jest.mock('../components/HMRC/HmrcStandardiser');
jest.mock('../database/setup/databasePool');
jest.mock('../components/TableSnapshot/SnapshotManager');

// Set up enums
enum StandardiserKey {
	HMRC = 'hmrc',
	GAMBLING_COMMISSION = 'gambling_commission',
}

// Mock Express Request
type MockRequestOptions = {
	body?: Record<string, unknown>;
	headers?: Record<string, string>;
};

const mockRequest = (options: MockRequestOptions = {}): Partial<Request> => {
	const {body = {}, headers = {}} = options;
	return {
		body,
		headers,
	};
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
			await standardiserInterface.setupStandardiserMaps();
			const result = await standardiserInterface.processInput(csvKeys, 'some_schema');

			expect(result.successfullyUploaded).toBe(true);
			expect(result.errorMsg).toBe('');
		});

		it('should process HTTP request data correctly', async () => {
			const req = mockRequest({
				body: {someData: 'value'},
				headers: {'File-Commission': StandardiserKey.GAMBLING_COMMISSION},
			});
			await standardiserInterface.setupStandardiserMaps();
			const result = await standardiserInterface.processInput(req as Request, 'some_schema');

			expect(result.successfullyUploaded).toBe(true);
			expect(result.errorMsg).toBe('');
		});
	});

	describe('error handling', () => {
		it('should return an error when the file commission header is missing', async () => {
			const req = mockRequest({
				body: {someData: 'value'},
				headers: {'File-Commission': ''},
			});

			const result = await standardiserInterface.processInput(req as Request, 'test_schema');

			expect(result.successfullyUploaded).toBe(false);
			expect(result.errorMsg).toBe('Incorrect File-Commission header: ');
		});

		it('should return an error when the file commission header value is invalid', async () => {
			const req = mockRequest({
				body: {someData: 'value'},
				headers: {'File-Commission': 'invalid commission'},
			});

			const result = await standardiserInterface.processInput(req as Request, 'test_schema');

			expect(result.successfullyUploaded).toBe(false);
			expect(result.errorMsg).toContain('Incorrect File-Commission header: invalid commission');
		});
	});

	describe('setupStandardiserMaps', () => {
		it('should set up HMRC standardiser correctly', async () => {
			// Assuming setupStandardiserMaps is a public method just for testing purposes
			// Otherwise we would need to test its effect indirectly
			await standardiserInterface.setupStandardiserMaps();

			expect(standardiserInterface.standardisers.get(StandardiserKey.HMRC)).toBeInstanceOf(HmrcStandardiser);
		});
	});

	/* This is not neccessary until implementation is done with Full HMRC Standardiser
	describe('processCsvKeys', () => {
		it('should process HMRC CSV keys correctly', async () => {
			const csvKeys: CsvKeys[] = ['hmrcCsv'];
			const schema = 'test_schema';

			// Perform the action
			await standardiserInterface.processCsvKeys(csvKeys, schema);

			// Assert that the correct standardiser method was called
			const hmrcStandardiserInstance = standardiserInterface.standardisers.get(StandardiserKey.HMRC);
			expect(hmrcStandardiserInstance!.standardise).toHaveBeenCalledWith(csvKeys, schema);
		});
	}); */
});

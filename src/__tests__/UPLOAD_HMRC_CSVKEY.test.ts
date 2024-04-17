import fs from 'fs';
import HmrcStandardiser from '../components/HMRC/HmrcStandardiser';
import {type CsvKeys} from '../types/GamblingCommissionTypes';

// Mocking the dependencies
jest.mock('fs');
jest.mock('../components/HMRC/processHmrcCsv', () => ({
	__esModule: true,
	processHmrcCsv: jest.fn(),
}));

describe('HMRC Component', () => {
	describe('Given uploadHmrcCsv function is called with a valid csvKey', () => {
		it('Then it should process the HMRC CSV data successfully', async () => {
			// Mock the behavior of fs.existsSync to return true
			(fs.existsSync as jest.Mock).mockReturnValue(true);

			// Expect uploadHmrcCsv to resolve without throwing an error
			const uploader = new HmrcStandardiser();
			const csvKeys = ['hmrcCsv' as CsvKeys];
			await expect(uploader.standardise(csvKeys, 'test_schema')).resolves.not.toThrow();
		});
	});

	describe('Given the hmrcCsv key is incorrect', () => {
		beforeEach(() => {
			(fs.existsSync as jest.Mock).mockReturnValue(false);
		});

		it('Then it should raise an error', async () => {
			const uploader = new HmrcStandardiser();
			const csvKeys = ['nothmrcCsv' as CsvKeys];
			await expect(uploader.standardise(csvKeys, 'test_schema')).rejects.toThrow('Invalid csvKey provided. Expected "hmrcCsv"');
		});
	});
});

import {HmrcCsvUploader} from '../components/HMRC/HMRC';
import fs from 'fs';

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
			const uploader = new HmrcCsvUploader();
			await expect(uploader.uploadHmrcCsv('hmrcCsv')).resolves.not.toThrow();
		});
	});

	describe('Given the hmrcCsv key is incorrect', () => {
		beforeEach(() => {
			// Set up mock implementation for fs.existsSync
			(fs.existsSync as jest.Mock).mockReturnValue(false);
		});

		it('Then it should raise an error', async () => {
			try {
				// Call the uploadHmrcCsv function with invalid csvKey
				const uploader = new HmrcCsvUploader();
				await uploader.uploadHmrcCsv('NotHmrcCsvKey');
				// If the function does not throw an error, fail the test
				fail('Function should have thrown an error.');
			} catch (error) {
				// Assert that the error is an instance of Error before accessing its message property
				expect(error).toBeInstanceOf(Error);
				// Expect the error message to indicate that the CSV file was not found
				expect((error as Error).message).toContain('Invalid csvKey provided. Expected "hmrcCsv"');
			}
		});
	});
});
// For future the UPLOAD route test files are seperated so that when tests are implemented to test further functionality the test file
// doesn't get extremely long and confusing to read through.

import request from 'supertest';
import app from '../app';
import path from 'path';

/**
 * Enum for standardiser keys.
 */
enum StandardiserKey {
	HMRC = 'hmrc',
	GAMBLING_COMMISSION = 'gambling_commission',
}
describe('GIVEN a Gambling Commission CSV is uploaded', () => {
	describe('WHEN it is a correct CSV but the file commission header is missing', () => {
		it('THEN it should upload Gambling Commission CSV successfully', async () => {
			const filePath = path.join(__dirname, 'test-files', 'business-licence-register-businesses.csv');
			const response = await request(app)
				.put('/upload')
				.set('x-api-key', process.env.API_KEY ?? '') // Fallback to empty string if API_KEY is not set
				.attach('files', filePath);

			expect(response.body.errorMsg.length).toBeGreaterThan(0);
			expect(response.status).toBe(400);
			expect(response.body.successfullyUploaded).toBe(false);
		});
	});

	/* COMMENTING THIS OUT , WILL BE UNCOMMENTED IN MERGE OF BRANCH (#43) WHEN AGGREGATOR CHANGES ARE DONE
	describe('WHEN it is an incorrect file name', () => {
		it('THEN it should fail to upload file with invalid name', async () => {
			const filePath = path.join(__dirname, 'test-files', 'invalid.csv');
			const response = await request(app)
				.put('/upload')
				.set('File-Commission', '') // Assuming this is intentionally left empty for the test
				.set('x-api-key', process.env.API_KEY ?? '') // Fallback to empty string if API_KEY is not set
				.attach('files', filePath);

			expect(response.status).toBe(400);
			expect(response.body.successfullyUploaded).toBe(false);
			expect(response.body.errorMsg.length).toBeGreaterThan(0);
		});
	}); */
});

// For future the UPLOAD route test files are seperated so that when tests are implemented to test further functionality the test file
// doesn't get extremely long and confusing to read through.

import request from 'supertest';
import app from '../app';
import path from 'path';

describe('GIVEN a Gambling Commission CSV is uploaded', () => {
	describe('WHEN it is a correct CSV', () => {
		it('THEN it should upload Gambling Commission CSV successfully', async () => {
			const filePath = path.join(__dirname, 'test-files', 'business-licence-register-businesses.csv');
			const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
			const response = await request(app)
				.put('/upload')
				.set(headers)
				.attach('files', filePath);

			expect(response.status).toBe(200);
			expect(response.body.successfulUploads).toContain('business-licence-register-businesses.csv (Gambling Commission CSV)');
			expect(response.body.failedUploads).toHaveLength(0);
		});
	});

	describe('WHEN it is an incorrect file name', () => {
		it('THEN it should fail to upload file with invalid name', async () => {
			const filePath = path.join(__dirname, 'test-files', 'invalid.csv');
			const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
			const response = await request(app)
				.put('/upload')
				.set(headers)
				.attach('files', filePath);

			expect(response.status).toBe(207);
			expect(response.body.successfulUploads).toHaveLength(0);
			expect(response.body.failedUploads).toContain('invalid.csv (Invalid file name)');
		});
	});
});

// For future the UPLOAD route test files are seperated so that when tests are implemented to test further functionality the test file
// doesn't get extremely long and confusing to read through.

import request from 'supertest';
import app from '../app';
import path from 'path';

import {hmrcComponent} from '../components/HMRC/HMRC';
import fs from 'fs';

// Mocking the dependencies
jest.mock('fs');
jest.mock('../components/HMRC/processHmrcCsv');

/**
 * Enum for standardiser keys.
 */
enum StandardiserKey {
	HMRC = 'hmrc',
	GAMBLING_COMMISSION = 'gambling_commission',
}

// TODO: THIS WHOLE TEST SUITE NEEDS TO BE REWRITTEN TO TEST HMRC STANDARDISER CLASS FUNCTIONALITY SPECIFICALLY ONTOP OF UPLOAD ROUTE OR PUT THIS IN SEPERATE FILES LIKE GC

describe('GIVEN an HMRC CSV is uploaded', () => {
	describe('WHEN it is a correct CSV but the file commission header is missing', () => {
		it('THEN it should not upload HMRC CSV successfully', async () => {
			const filePath = path.join(__dirname, 'test-files', 'hmrc-supervised-data.csv');
			const response = await request(app)
				.put('/upload')
				.set('x-api-key', process.env.API_KEY ?? '') // Fallback to empty string if API_KEY is not set
				.attach('files', filePath);

			expect(response.body.errorMsg.length).toBeGreaterThan(0);
			expect(response.status).toBe(400);
			expect(response.body.successfullyUploaded).toBe(false);
		});
	});
});

	describe('WHEN it is an incorrect file type', () => {
		it('THEN it should fail to upload non-CSV file', async () => {
			const filePath = path.join(__dirname, 'test-files', 'invalid.txt');
			const response = await request(app)
				.put('/upload')
				.set('File-Commission', '') // Assuming this is intentionally left empty for the test
				.set('x-api-key', process.env.API_KEY ?? '') // Fallback to empty string if API_KEY is not set
				.attach('files', filePath);

			expect(response.status).toBe(400);
			expect(response.body.successfullyUploaded).toBe(false);
			expect(response.body.errorMsg.length).toBeGreaterThan(0);
		});
	});
});

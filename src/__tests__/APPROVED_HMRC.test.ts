import request from 'supertest';
import app from '../app';

import {clearTestDatabase, setupTestDatabase} from '../utils/databaseTestFuncs';

beforeAll(async () => {
	await setupTestDatabase();
});

afterAll(async () => {
	await clearTestDatabase();
});

// Given.
describe('Given Companies House wants to retrieve the approval status of GWYN DEBBSON AND DAUGHTER from the HMRC CSV file.', () => {
	// When.
	describe('When Companies House sends a request to the /approved endpoint and it doesnt exist as approved.', () => {
		it('Then it would return 400 status code as theyre not approved.', async () => {
			// Make the request and wait for the response and expect status code 200
			const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
			const response = await request(app).get('/approved/')
				.set(headers)
				.query({registrationId: '1241294', businessName: 'ShouldFail LTD'});
				// Assert the response
			expect(response.statusCode).toBe(400);
		});
	});
});

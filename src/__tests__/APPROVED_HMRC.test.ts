import request from 'supertest';
import app from '../app';

import {createSchema} from '../database/setupDatabase';

jest.mock('../database/queries', () => ({
	findAllApprovedByRegId: jest.fn(),
}));

beforeAll(async () => createSchema());

// Given.
describe('Given Companies House wants to retrieve the approval status of GWYN DEBBSON AND DAUGHTER from the HMRC CSV file.', () => {
	// When.
	describe('When Companies House sends a request to the /approved endpoint and it doesnt exist as approved.', () => {
		it('Then it would return the business name and the status not approved for HMRC.', async () => {
			// Make the request and wait for the response and expect status code 200
			const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
			const response = await request(app).get('/approved/')
				.query({registrationId: '1241232414', businessName: 'ShouldFail LTD'})
				.set(headers);
				// Assert the response
			expect(response.statusCode).toBe(404);
		});
	});
});

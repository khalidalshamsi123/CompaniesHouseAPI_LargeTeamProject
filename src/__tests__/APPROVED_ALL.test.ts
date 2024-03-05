import request from 'supertest';
import app from '../app';
import {clearTestDatabase, setupTestDatabase} from '../utils/databaseTestFuncs';

beforeAll(async () => {
	await setupTestDatabase();
});

afterAll(async () => {
	await clearTestDatabase();
	jest.clearAllMocks();
});

describe('Given a request is made to retrieve approval status for a specific registration ID from the /approved endpoint.', () => {
	describe('When the registration ID 122702 is provided to the endpoint.', () => {
		it('Then the response should contain FCA and HMRC authorization as true and Gambling Commission authorization as false.', async () => {
			// Make the request and wait for the response
			const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
			const response = await request(app)
				.get('/approved')
				.set(headers)
				.query({registrationId: '122702', businessName: 'Barclays'});

			// Assert the response
			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('registrationId', '122702');
			expect(response.body).toHaveProperty('businessName');
			expect(response.body.approvedWith.fca).toBe(true);
			expect(response.body.approvedWith.hmrc).toBe(true);
			expect(response.body.approvedWith.gamblingCommission).toBe(false);
			expect(response.body.approved).toBe(true);
		});
	});
});
describe('Given a request is made to retrieve approval status for a non existent registration ID from the /approved endpoint.', () => {
	describe('When the registration ID 991239 is provided to the endpoint.', () => {
		it('Then the response should contain FCA authorization as false and HMRC and Gambling Commission authorization as false.', async () => {
			// Make the request and wait for the response
			const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
			const response = await request(app)
				.get('/approved')
				.set(headers)
				.query({registrationId: '9912399', businessName: 'RandomTestBusiness'});

			// Assert the response
			expect(response.status).toBe(400);
		});
	});
});


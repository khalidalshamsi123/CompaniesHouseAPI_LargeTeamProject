import request from 'supertest';
import app from '../app';
import {createSchema} from '../database/setupDatabase';

jest.mock('../database/queries', () => ({
	findAllApprovedByRegId: jest.fn(),
}));

beforeAll(async () => createSchema());

describe('Given a request is made to retrieve approval status for a specific registration ID from the /allApproved endpoint.', () => {
	describe('When the registration ID 122702 is provided to the endpoint.', () => {
		it('Then the response should contain FCA authorization as true and HMRC and Gambling Commission authorization as false.', async () => {
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
			expect(response.body.approvedWith.hmrc).toBe(false);
			expect(response.body.approvedWith.gamblingCommission).toBe(false);
			expect(response.body.approved).toBe(true);
		});
	});
});
describe('Given a request is made to retrieve approval status for a non existent registration ID from the /approved endpoint.', () => {
	describe('When the registration ID 9912392193219 is provided to the endpoint.', () => {
		it('Then the response should contain FCA authorization as false and HMRC and Gambling Commission authorization as false.', async () => {
			// Make the request and wait for the response
			const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
			const response = await request(app)
				.get('/approved')
				.query({registrationId: '9912392193219', businessName: 'RandomTestBusiness'})
				.set(headers);

			// Assert the response
			expect(response.status).toBe(404);
		});
	});
});


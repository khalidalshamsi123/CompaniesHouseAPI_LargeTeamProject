import request from 'supertest';
import app from '../app';

// Scenario: Retrieve Barclays Approval Status from FCA Endpoint.

// Given.
describe('Given Companies House wants to retrieve the approval status of Barclays from the FCA endpoint.', () => {
	// When.
	describe('When Companies House sends a request to the /approved/fca endpoint.', () => {
		it('Then authorized should either be true or false.', async () => {
			// Make the request and wait for the response
			const response = await request(app).get('/approved/fca');

			// Assert the response
			expect([400, 200]).toContain(response.statusCode);
			expect(response.body).toHaveProperty('authorized');
			expect(typeof response.body.authorized).toBe('boolean');
		});
	});
});
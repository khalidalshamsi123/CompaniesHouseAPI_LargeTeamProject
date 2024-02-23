import request from 'supertest';
import app from '../app';
import exp from 'constants';

// Given.
describe('Given Companies House wants to retrieve the approval status of GWYN DEBBSON AND DAUGHTER from the HMRC CSV file.', () => {
	// When.
	describe('When Companies House sends a request to the /approved/hmrc endpoint.', () => {
		it('Then it would return the business name and the status applied.', async () => {
			// Make the request and wait for the response and expect status code 200
			const response = await request(app).get('/approved/hmrc').expect(200);
			// Assert the response
			expect(response.body).toHaveProperty('Status');
			expect(response.body.Status).toBe('APPROVED');
		});
	});
});

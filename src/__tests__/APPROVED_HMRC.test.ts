import request from 'supertest';
import app from '../app';

// Given.
describe('Given Companies House wants to retrieve the approval status of GWYN DEBBSON AND DAUGHTER from the HMRC CSV file.', () => {
	// When.
	describe('When Companies House sends a request to the /approved endpoint.', () => {
		it('Then it would return the business name and the status approved.', async () => {
			// Make the request and wait for the response and expect status code 200
			const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
			const response = await request(app).get('/approved/')
				.set(headers);
			// Assert the response
			expect(response.statusCode).toBe(200);
			// Assert the response
			expect(response.body).toHaveProperty('hmrc');
			expect(response.body.hmrc).toBe(true);
		});
	});
});

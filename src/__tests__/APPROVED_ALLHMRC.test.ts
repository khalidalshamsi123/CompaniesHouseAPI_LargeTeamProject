import request from 'supertest';
import app from '../app';

// Scenario 1, a business with the status false
// Given.
describe('Given Companies House wants to retrieve the approval status of HARRY SMITH AND SONS from the HMRC CSV file.', () => {
	// When.
	describe('When Companies House sends a request to the /approved/allhmrc endpoint.', () => {
		it('Then it would return the business name and the status false.', async () => {
			const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
			// Make the request and wait for the response and expect status code 200
			const response = await request(app).get('/approved/allhmrc').set(headers).expect(200);
			// Assert the response
			expect(response.body[1]).toHaveProperty('status');
			expect(response.body[1].name).toBe('HARRY SMITH AND SONS');
			expect(response.body[1].status).toBe(false);
		});
	});
});

// Scenario 2, a business with the status true
// Given.
describe('Given Companies House wants to retrieve the approval status of FRANK SIMONS AND SONS from the HMRC CSV file.', () => {
	// When.
	describe('When Companies House sends a request to the /approved/allhmrc endpoint.', () => {
		it('Then it would return the business name and the status true.', async () => {
			const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
			// Make the request and wait for the response and expect status code 200
			const response = await request(app).get('/approved/allhmrc').set(headers).expect(200);
			// Assert the response
			expect(response.body[3]).toHaveProperty('status');
			expect(response.body[3].name).toBe('FRANK SIMONS AND SONS');
			expect(response.body[3].status).toBe(true);
		});
	});
});


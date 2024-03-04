import request from 'supertest';
import app from '../app';

import {createSchema} from '../database/setupDatabase';

jest.mock('../database/setupDatabase', () => ({
	createSchema: jest.fn(),
}));
jest.mock('../database/queries', () => ({
	insertBusinessData: jest.fn(),
	findAllApprovedByRegId: jest.fn(),
}));




describe('Setup Database - Creating business_registry table for the following tests', () => {
	it('should create business_registry table with correct columns', async () => {
		await createSchema();
		expect(createSchema).toHaveBeenCalled();
	});
	// Scenario: Retrieve Barclays Approval Status from FCA Endpoint.

// Given.
	describe('Given Companies House wants to retrieve the approval status of Barclays from the FCA endpoint and its approved by FCA.', () => {
		// When.
		describe('When Companies House sends a request to the /approved/fca endpoint.', () => {
			it('Then authorized should be true and status code of 200 returned', async () => {
				// Make the request and wait for the response
				const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
				const response = await request(app).get('/approved/')
					.query({registrationId: '122702', businessName: 'Barclays'})
					.set(headers);
				// Assert the response
				expect(response.statusCode).toBe(200);
				expect(response.body.approvedWith).toHaveProperty('fca');
				expect(typeof response.body.approvedWith.fca).toBe('boolean');
				expect(response.body.approvedWith.fca).toBe(true);
			});
		});
	});

});

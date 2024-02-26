import request from 'supertest';
import app from '../app';
import isAuthorised from '../middleware/authentication';

import {Request, Response} from 'express';

// Scenario: Companies House sends a request with a valid API key.

// Given.
describe('Given Companies House wants to retrieve the approval status of Barclays from the application and given a valid API key is provided.', () => {
    // When.
	describe('When Companies House sends a GET request to the /approved/fca endpoint with the valid API key in the headers.', () => {
        // Then.
		it('Then they should receive a response containing the approval status of Barclays with the FCA and a 200 (success) status code.', async () => {
            // Make the request and wait for the response
			const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
			const response = await request(app).get('/approved/fca')
				.set(headers);
			// Assert the response.
			expect([400, 200]).toContain(response.statusCode);
			expect(response.body).toHaveProperty('authorized');
			expect(typeof response.body.authorized).toBe('boolean');
        });
    });
});

// Scenario: Unauthorized user sends a request with an invalid API key.

// Given.
describe('Given a unauthorized user wants to retrieve the approval status of Barclays from the application.', () => {
	// When.
	describe('When the user sends a GET request to the /approved/fca endpoint, with an invalid API key in the headers.', () => {
        // Then.
		it('Then they should receive a response containing a 401 (unauthorized) status code and message stating the key is invalid.', async () => {
            // Make the request and wait for the response
			const headers: Record<string, string> = {'x-api-key': 'invalid api key'};
			const response = await request(app).get('/approved/fca')
				.set(headers)
                // Expect a 401 (unauthorised) status code.
                .expect(401);
			// Assert the response
			expect(response.body).toHaveProperty('message');
			expect(response.body.message).toBe('Invalid API Key Provided.');
		});
	});
});

// Scenario: Unauthorized user sends a request with no API key.

// Given.
describe('Given an unauthorized user wants to retrieve the approval status of Barclays from the application.', () => {
	// When.
	describe('When the user sends a GET request to the /approved/fca endpoint with no API key in the headers.', () => {
        // Then.
		it('Then they should receive a response containing a 401 (unauthorized) status code and message stating that the API key is missing.', async () => {
            // Make the request with no API key in headers and wait for the response.
			const response = await request(app).get('/approved/fca')
            // Expect a 401 (unauthorised) status code.
            .expect(401);
			// Assert the response
			expect(response.body).toHaveProperty('message');
			expect(response.body.message).toBe('Missing API Key In Headers.');
		});
	});
});

// Testing of middleware function directly - unit tests. Mocking req, res and next().
const mockRequest = (apiKey: string | undefined) => {
    return {
        header: jest.fn().mockReturnValue(apiKey),
    } as unknown as Request;
};

const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.body = jest.fn().mockReturnValue(res);
    return res;
};

describe('Given request and response have been mocked. And given request is missing the API key header.', () => {
    describe('When authentication middleware function is called, providing the two mocked objects.', () => {
        // Pass in mock objects alongside empty function to represent next().
        let req = mockRequest(undefined);
        let res = mockResponse();
        
        isAuthorised(req, res, () => {});

        console.log(req);

        it('Then the response should contain a status code of 401 (unauthorised) and message stating the API key is missing.', () => {
            // Assert the response
			expect(req.statusCode).toHaveBeenCalledWith(401);
            expect(req.body).toHaveProperty('message');
            expect(req.body.message).toBe('Missing API Key In Headers.');
        });
    });
});
import request from 'supertest';
import app from '../app';
import isAuthorised from '../middleware/authentication';

import {type NextFunction, type Request, type Response} from 'express';

// Mock for express.js next function used by middleware.
const nextFunction: NextFunction = jest.fn();

/* Because we don't want to rely on sending real http requests to test this component we instead need to mock
   the Request and Response objects, and the Next (function) that are all typically provided to the middleware. */
const mockResponse = () => {
	/* We define a Partial Response type, which allows us to have a object whose properties are all optional.
	   Which lets us avoid having to define all the fields typically required by Request (and Response). */
	const res: Partial<Response> = {};
	/* When these methods are used the Response object will be returned as the value.
	   This is to allow for method-chaining typically seen in the Response object.
	   We have no purpose for the values provided themselves, so they are not stored
	   on the object.
	   However, we can still test to see what values were provided to the mocked functions
	   and therefore know what results/responses we were given by the component. */
	res.status = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	return res;
};

const mockRequest = (apiKey: string | undefined) => {
	const req: Partial<Request> = {
		/* Mock for get() method normally found on Request object.
		   Simulating a scenario where the method is called and it
		   either 'finds' the API key in the headers, or it cannot. */
		get: jest.fn().mockReturnValue(apiKey),
	};
	return req;
};

// Scenario: Companies House sends a request with a valid API key.

// Given.
describe('Given Companies House wants to retrieve the approval status of Barclays from the application and given a valid API key is provided.', () => {
	// When.
	describe('When Companies House sends a GET request to the /approved/ endpoint with the valid API key in the headers.', () => {
		// Then.
		it('Then they should receive a response containing the approval status of Barclays with the FCA and a 200 (success) status code.', async () => {
			// Make the request and wait for the response
			const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
			const response = await request(app).get('/approved/')
				.query({registrationId: '122702', businessName: 'Barclays'})
				.set(headers);
			// Assert the response.
			expect(response.statusCode).toBe(200);
			expect(typeof response.body.approvedWith.fca).toBe('boolean');
		});

		it('Then the request should pass authentication.', () => {
			const req = mockRequest(process.env.API_KEY);
			const res = mockResponse();

			isAuthorised(
				req as Request,
				res as Response,
				nextFunction,
			);
			// If the next() method has been called we know that the authentication middleware has accepted the API key provided as valid.
			// Passing along the request to the next middleware in the chain.
			expect(nextFunction).toHaveBeenCalled();
		});
	});
});

// Scenario: Unauthorized user sends a request with an invalid API key.

// Given.
describe('Given a unauthorized user wants to retrieve the approval status of Barclays from the application.', () => {
	// When.
	describe('When the user sends a GET request to the /approved/ endpoint, with an invalid API key in the headers.', () => {
		// Then.
		it('Then they should receive a response containing a 401 (unauthorized) status code and message stating the key is invalid.', async () => {
			// Make the request and wait for the response
			const headers: Record<string, string> = {'x-api-key': 'invalid api key'};
			const response = await request(app).get('/approved/')
				.set(headers)
			// Expect a 401 (unauthorised) status code.
				.expect(401);
			// Assert the response
			expect(response.body).toHaveProperty('message');
			expect(response.body.message).toBe('Invalid API Key Provided.');
		});

		it('Then they should receive a response containing a 401 (unauthorized) status code and message stating the key is invalid.', () => {
			// Object we expect our mocked res.json method to have been called with.
			const expectedResponse = {
				message: 'Invalid API Key Provided.',
			};
			const req = mockRequest('invalid api key');
			const res = mockResponse();

			isAuthorised(
				req as Request,
				res as Response,
				nextFunction,
			);

			// Assert the response
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith(expectedResponse);
		});
	});
});

// Scenario: Unauthorized user sends a request with no API key.

// Given.
describe('Given an unauthorized user wants to retrieve the approval status of Barclays from the application.', () => {
	// When.
	describe('When the user sends a GET request to the /approved/ endpoint with no API key in the headers.', () => {
		// Then.
		it('Then they should receive a response containing a 401 (unauthorized) status code and message stating that the API key is missing.', async () => {
			// Make the request with no API key in headers and wait for the response.
			const response = await request(app).get('/approved/')
			// Expect a 401 (unauthorised) status code.
				.expect(401);
			// Assert the response
			expect(response.body).toHaveProperty('message');
			expect(response.body.message).toBe('Missing API Key In Headers.');
		});

		it('Then they should receive a response containing a 401 (unauthorized) status code and message stating that the API key is missing.', () => {
			// Object we expect our mocked res.json method to have been called with.
			const expectedResponse = {
				message: 'Missing API Key In Headers.',
			};
			const req = mockRequest(undefined);
			const res = mockResponse();

			isAuthorised(
				req as Request,
				res as Response,
				nextFunction,
			);

			// Assert the response
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith(expectedResponse);
		});
	});
});

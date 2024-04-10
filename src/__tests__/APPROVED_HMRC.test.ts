import request from 'supertest';
import app from '../app';
import * as fcaQuerier from '../components/fcaQuerier';

import {clearTestDatabase, setupTestDatabase, selectFromTestDatabase} from '../utils/databaseTestFuncs';
import * as productionQueries from '../database/queries';

beforeAll(async () => {
	// Clearing in the afterAll section causes issues with test suites following this one.
	await clearTestDatabase();
	// Replace the implementation for the findAllApprovedByRegId() method with the one
	// that interacts with the test database, for the duration of this test suite.
	jest.spyOn(productionQueries, 'findAllApprovedByRegId').mockImplementation(selectFromTestDatabase);
	jest.spyOn(fcaQuerier, 'fcaGetApprovalStatus').mockResolvedValue({isAuthorised: false});
	await setupTestDatabase();
});

afterAll(async () => {
	// Clears all the spy mocks.
	jest.clearAllMocks();
});

// Given.
describe('Given Companies House wants to retrieve the approval status of GWYN DEBBSON AND DAUGHTER with the HMRC. And given the business is not in the database.', () => {
	// When.
	describe('When Companies House sends a request to the /approved endpoint querying for the business.', () => {
		it('Then it should return a 400 status code.', async () => {
			// Make the request and wait for the response and expect status code 400.
			const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
			const response = await request(app).get('/approved/')
				.set(headers)
				.query({referenceId: '1241294', businessName: 'ShouldFail LTD'});
			// Assert the response.
			expect(response.statusCode).toBe(400);
		});
	});
});

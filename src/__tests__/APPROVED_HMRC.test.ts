import request from 'supertest';
import app from '../app';
import * as fcaQuerier from '../components/fcaQuerier';
import {clearTestDatabase, setupTestDatabase} from '../utils/databaseTestFuncs';
import * as productionQueries from '../components/aggregator';

jest.mock('../components/BusinessNameProcessor');

beforeAll(async () => {
	// Clear the test database and set up necessary mocks
	await clearTestDatabase();
	jest.spyOn(fcaQuerier, 'fcaGetApprovalStatus').mockResolvedValue({isAuthorised: false});
	// Mocking queryAggregator to throw an error when the reference ID is not found
	jest.spyOn(productionQueries, 'queryAggregator').mockImplementation(() => {
		throw new Error('Reference ID not found');
	});
	await setupTestDatabase();
});

afterAll(async () => {
	// Clear all mocks
	jest.clearAllMocks();
});

describe('Given Companies House wants to retrieve the approval status of GWYN DEBBSON AND DAUGHTER with the HMRC. And given the business is not in the database.', () => {
	describe('When Companies House sends a request to the /approved endpoint querying for the business.', () => {
		it('Then it should return a 500 status code.', async () => {
			// Make the request and expect status code 500
			const headers: Record<string, string> = {'x-api-key': process.env.API_KEY!};
			const response = await request(app).post('/approved/')
				.set(headers)
				.send({
					businessName: 'ShouldFail LTD',
					commissions: {
						gamblingCommission: '1241294',
						hmrc: '',
						fca: '',
					},
				})
				.set('Content-Type', 'application/json');

			// Assert the response
			expect(response.status).toBe(500);
		});
	});
});

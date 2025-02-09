import request from 'supertest';
import app from '../app';
import * as fcaQuerier from '../components/fcaQuerier';
import {clearTestDatabase, setupTestDatabase} from '../utils/databaseTestFuncs';
import * as productionQueries from '../components/aggregator';

beforeAll(async () => {
	// Clear the test database and set up necessary mocks
	await clearTestDatabase();
	await setupTestDatabase();
});

afterAll(async () => {
	// Clear all mocks
	jest.clearAllMocks();
});

jest.mock('../components/BusinessNameProcessor');

jest.mock('../database/queries', () => ({
	findAllApprovedByRegId: jest.fn(),
}));

describe('Given Companies House wants to retrieve the approval status of Barclays from the FCA endpoint and its approved by FCA.', () => {
	describe('Given Companies House wants to retrieve the approval status of Barclays from the FCA endpoint and its approved by FCA.', () => {
		it('Then authorized should be true and status code of 200 returned', async () => {
			jest.spyOn(fcaQuerier, 'fcaGetApprovalStatus').mockResolvedValue({isAuthorised: true});
			// Make the request to the route handler function directly
			const response = await request(app).post('/approved/')
				.send({
					businessName: 'Barclays',
					commissions: {
						fca: '122702',
						gamblingCommission: '',
						hmrc: '',
					},
				})
				.set('Content-Type', 'application/json')
				.set('x-api-key', process.env.API_KEY!);

			console.log('Response received:', response.body);
			// Assert the response
			expect(response.status).toBe(200);
			expect(response.body.approvedWith).toHaveProperty('fca');
			expect(typeof response.body.approvedWith.fca).toBe('boolean');
			expect(response.body.approvedWith.fca).toBe(true);
		});
	});
});

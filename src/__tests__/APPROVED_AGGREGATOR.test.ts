import {queryAggregator} from '../components/aggregator';
import * as fcaQuerier from '../components/fcaQuerier';
import * as productionQueries from '../database/queries';
import {clearTestDatabase, setupTestDatabase} from '../utils/databaseTestFuncs';

jest.mock('../components/BusinessNameProcessor');

beforeAll(async () => {
	await clearTestDatabase();
	await setupTestDatabase();
});

describe('Testing the data retrieval functionality of the Aggregator', () => {
	describe('Given the business is approved by at least one regulatory body.', () => {
		describe('When the aggregator receives this information.', () => {
			it('Then the overall approval status for the business should be true.', async () => {
				jest.spyOn(fcaQuerier, 'fcaGetApprovalStatus').mockResolvedValue({isAuthorised: true});
				jest.spyOn(productionQueries, 'findAllApprovedByRegId').mockResolvedValueOnce(true);

				const response = await queryAggregator('Barclays', {hmrc: '122702', gamblingCommission: '', fca: ''}, 'test_schema');

				expect(response).toHaveProperty('approved');
				expect(response?.approved).toEqual(true);
			});
		});
	});

	describe('Given the business is approved by no regulatory bodies.', () => {
		describe('When the aggregator requests this information.', () => {
			it('Then the overall approval status for the business should be returned as false by the aggregator.', async () => {
				jest.spyOn(fcaQuerier, 'fcaGetApprovalStatus').mockResolvedValue({isAuthorised: false});
				jest.spyOn(productionQueries, 'findAllApprovedByRegId').mockResolvedValueOnce(false);

				const response = await queryAggregator('Fake Company', {hmrc: '', gamblingCommission: '2999931', fca: ''}, 'test_schema');

				expect(response).toHaveProperty('approved');
				expect(response?.approved).toEqual(false);
			});
		});
	});

	describe('Testing the boolean "approved" value is as expected when returned by the aggregator.', () => {
		describe('Given the business is approved by at least one regulatory body.', () => {
			describe('When the aggregator receives this information.', () => {
				it('Then the overall approval status for the business should be returned as true by the aggregator.', async () => {
					const fcaExpectedResult = {isAuthorised: true};
					const databaseExpectedResult = true;

					jest.spyOn(fcaQuerier, 'fcaGetApprovalStatus').mockResolvedValue(fcaExpectedResult);
					jest.spyOn(productionQueries, 'findAllApprovedByRegId').mockResolvedValue(databaseExpectedResult);

					const response = await queryAggregator('Barclays', {hmrc: '', gamblingCommission: '', fca: '122702'}, 'test_schema');

					expect(response).toHaveProperty('approved');
					expect(response?.approved).toEqual(true);
				});
			});
		});

		describe('Given the business is not approved by any regulatory bodies.', () => {
			describe('When the aggregator requests this information.', () => {
				it('Then the overall approval status for the business should be returned as false by the aggregator.', async () => {
					const fcaExpectedResult = {isAuthorised: false};
					const databaseExpectedResult = false;

					jest.spyOn(fcaQuerier, 'fcaGetApprovalStatus').mockResolvedValue(fcaExpectedResult);
					jest.spyOn(productionQueries, 'findAllApprovedByRegId').mockResolvedValue(databaseExpectedResult);

					const response = await queryAggregator('Barclays', {hmrc: '', gamblingCommission: '', fca: '122702'}, 'test_schema');

					expect(response).toHaveProperty('approved');
					expect(response?.approved).toEqual(false);
				});
			});
		});
	});
});

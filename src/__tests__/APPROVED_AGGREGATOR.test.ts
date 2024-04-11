import {queryAggregator} from '../components/aggregator';
import * as fcaQuerier from '../components/fcaQuerier';
import * as productionQueries from '../database/queries';

describe('Testing the data retrieval functionality of the Aggregator', () => {
	// Scenario: Approved by at least one regulatory body.
	describe('Given the business is approved by at least one regulatory body.', () => {
		describe('When the aggregator receives this information.', () => {
			it('Then the overall approval status for the business .', async () => {
				// Mock the external API call only
				jest.spyOn(fcaQuerier, 'fcaGetApprovalStatus').mockResolvedValue({isAuthorised: false});
				// Make the request and wait for the response
				const response = await queryAggregator('122702', 'Barclays', 'test_schema');

				// Assert that the overall approval status is true if any regulatory body approves the business
				expect(response).toHaveProperty('approved');
				expect(response?.approved).toEqual(true);
			});
		});
	});
	//  Scenario: Approved by no regulatory body.
	describe('Given the business is approved by no regulatory bodies.', () => {
		describe('When the aggregator requests this information.', () => {
			it('Then the overall approval status for the business should be returned as false by the aggregator.', async () => {
				// Const fcaExpectedResult = {
				// 	isAuthorised: false,
				// };
				// const databaseExpectedResult = undefined; // No approvals expected
				jest.spyOn(fcaQuerier, 'fcaGetApprovalStatus').mockResolvedValue({isAuthorised: false});

				// Make the request and wait for the response
				const response = await queryAggregator('123456', 'Fake Company', 'test_schema');
				expect(response).toHaveProperty('approved');
				expect(response?.approved).toEqual(false);
			});
		});
	});
});

describe('Testing the boolean "approved" value is as expected when returned by the aggregator.', () => {
	// Scenario: Approved by at least one regulatory body.
	describe('Given the business is approved by at least one regulatory body.', () => {
		describe('When the aggregator receives this information.', () => {
			it('Then the overall approval status for the business should be returned as true by the aggregator.', async () => {
				const fcaExpectedResult = {
					isAuthorised: false,
				};
				const databaseExpectedResult = {
					hmrcApproved: true,
					gamblingApproved: false,
				};

				jest.spyOn(fcaQuerier, 'fcaGetApprovalStatus').mockResolvedValue(fcaExpectedResult);
				jest.spyOn(productionQueries, 'findAllApprovedByRegId').mockResolvedValue(databaseExpectedResult);

				// Make the request and wait for the response
				const response = await queryAggregator('122702', 'Barclays', 'test_schema');
				expect(response).toHaveProperty('approved');
				expect(response?.approved).toEqual(true);
			});
		});
	});
	//  Scenario: Approved by no regulatory body.
	describe('Given the business is not approved by any regulatory bodies.', () => {
		describe('When the aggregator requests this information.', () => {
			it('Then the overall approval status for the business should be returned as false by the aggregator.', async () => {
				const fcaExpectedResult = {
					isAuthorised: false,
				};
				const databaseExpectedResult = {
					hmrcApproved: false,
					gamblingApproved: false,
				};

				jest.spyOn(fcaQuerier, 'fcaGetApprovalStatus').mockResolvedValue(fcaExpectedResult);
				jest.spyOn(productionQueries, 'findAllApprovedByRegId').mockResolvedValue(databaseExpectedResult);
				// Make the request and wait for the response
				const response = await queryAggregator('122702', 'Barclays', 'test_schema');
				expect(response).toHaveProperty('approved');
				expect(response?.approved).toEqual(false);
			});
		});
	});
});


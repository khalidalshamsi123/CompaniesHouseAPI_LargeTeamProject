import {queryAggregator} from '../components/aggregator';
import * as fcaQuerier from '../components/fcaQuerier';
import * as productionQueries from '../database/queries';

// Scenario: Approved by at least one regulatory body.

describe('Given the business is approved by at least one regulatory body.', () => {
	describe('When the aggregator receives this information.', () => {
		it('Then the overall approval status for the business should be returned as true by the aggregator.', async () => {
			const fcaExpectedResult = {
				isAuthorised: false,
			};
			const databaseExpectedResult: productionQueries.BusinessData = {
				registrationid: '122702',
				businessname: 'Barclays',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				fca_approved: false,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				hmrc_approved: true,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				gambling_approved: false,
			};

			jest.spyOn(fcaQuerier, 'fcaGetApprovalStatus').mockResolvedValue(fcaExpectedResult);
			jest.spyOn(productionQueries, 'findAllApprovedByRegId').mockResolvedValue(databaseExpectedResult);

			// Make the request and wait for the response
			const response = await queryAggregator('122702', 'Barclays');
			expect(response).toHaveProperty('approved');
			expect(response?.approved).toEqual(true);
		});
	});
});

//  Scenario: Approved by no regulatory body.

describe('Given the business is approved by no regulatory bodies.', () => {
	describe('When the aggregator requests this information.', () => {
		it('Then the overall approval status for the business should be returned as false by the aggregator.', async () => {
			const fcaExpectedResult = {
				isAuthorised: false,
			};
			const databaseExpectedResult: productionQueries.BusinessData = {
				registrationid: '122702',
				businessname: 'Barclays',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				fca_approved: false,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				hmrc_approved: false,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				gambling_approved: false,
			};

			jest.spyOn(fcaQuerier, 'fcaGetApprovalStatus').mockResolvedValue(fcaExpectedResult);
			jest.spyOn(productionQueries, 'findAllApprovedByRegId').mockResolvedValue(databaseExpectedResult);
			// Make the request and wait for the response
			const response = await queryAggregator('122702', 'Barclays');
			expect(response).toHaveProperty('approved');
			expect(response?.approved).toEqual(false);
		});
	});
});


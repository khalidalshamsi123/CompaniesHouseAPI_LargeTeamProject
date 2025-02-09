import {insertDataStandardiser} from '../database/insertDataStandardiser';
import {type PoolClient} from 'pg';

// Mock PoolClient and its methods
const mockClient: PoolClient = {
	query: jest.fn(),
} as unknown as PoolClient;

mockClient.query = jest.fn(); // Mocking the query function

describe('processDataRow function', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('when processing data for HMRC approved businesses', () => {
		type MockDataRow = {
			row: {
				REFERENCE_ID: string;
				'Business Name': string;
				STATUS: string;
			};
			refIdIndex: number;
			status1Index: number;
			client: PoolClient;
		};

		const mockDataRow: MockDataRow = {
			row: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				REFERENCE_ID: '12345',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				'Business Name': 'Test Company',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				STATUS: 'approved',
			},
			refIdIndex: 0,
			status1Index: 2,
			client: mockClient,
		};

		it('should call hmrcProcess function', async () => {
			// WHEN
			await insertDataStandardiser(mockDataRow);

			// THEN
			expect(mockClient.query).toHaveBeenCalled();
			expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
		});
	});

	describe('when processing data for Gambling Commission approved businesses', () => {
		const mockCsvData = {
			referenceId: ['12345-N-54321'],
			businessNames: ['Test Company'],
			gamblingApprovalStatuses: [true],
			insertClient: mockClient,
			schema: 'test_schema',
		};

		it('should call gamblingCommissionInsert function', async () => {
			// GIVEN
			// Mock data for Gambling Commission approved businesses

			// WHEN
			await insertDataStandardiser(mockCsvData);

			// THEN
			expect(mockClient.query).toHaveBeenCalled();
			expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
		});
	});
});

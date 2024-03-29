import { processDataRow } from '../database/dataProcessor';
import { PoolClient } from 'pg';

// Mock PoolClient and its methods
const mockClient: PoolClient = {
    query: jest.fn()
} as unknown as PoolClient;

describe('processDataRow function', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('when processing data for HMRC approved businesses', () => {
        const mockDataRow = {
            row: {
                REGISTRATION_ID: '12345',
                BUSINESS_NAME: 'Test Company',
                STATUS: true,
            },
            regIdIndex: 0,
            status1Index: 2, // Assuming STATUS is the third column
            client: mockClient
        } as any; // Adjusted to any for type mismatch

        it('should call hmrcProcess function', async () => {
            // GIVEN
            // Mock data for HMRC approved businesses

            // WHEN
            await processDataRow(mockDataRow);

            // THEN
            expect(mockClient.query).toHaveBeenCalled();
            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
        });
    });

    describe('when processing data for Gambling Commission approved businesses', () => {
        const mockCsvData = {
            businessNames: ['Test Company'],
            gamblingApprovalStatuses: true,
            insertClient: mockClient,
            schema: 'test_schema'
        };

        it('should call gamblingCommissionInsert function', async () => {
            // GIVEN
            // Mock data for Gambling Commission approved businesses

            // WHEN
            await processDataRow(mockCsvData);

            // THEN
            expect(mockClient.query).toHaveBeenCalled();
            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
        });
    });
});

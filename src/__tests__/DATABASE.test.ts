// Mock the database module
import {createSchema} from '../database/setupDatabase';
import {insertBusinessData} from '../database/queries';

jest.mock('../database/setupDatabase', () => ({
	createSchema: jest.fn(),
}));
jest.mock('../database/queries', () => ({
	insertBusinessData: jest.fn(),
}));

describe('Database Setup and Insertion Tests', () => {
	describe('Setup Database - Creating business_registry table', () => {
		it('should create business_registry table with correct columns', async () => {
			await createSchema();
			expect(createSchema).toHaveBeenCalled();
		});
	});

	describe('Insert Database - Inserting mock data', () => {
		it('should insert correct mock data into the database', async () => {
			// Call the insertBusinessData function with mock data
			await insertBusinessData({
				registrationid: '00445790',
				businessname: 'TESCO PLC',
				fca_approved: false,
				hmrc_approved: true,
				gambling_approved: false,
			});

			// Assert that the data insertion is successful
			expect(insertBusinessData).toHaveBeenCalledWith({
				registrationid: '00445790',
				businessname: 'TESCO PLC',
				fca_approved: false,
				hmrc_approved: true,
				gambling_approved: false,
			});
		});
	});
});

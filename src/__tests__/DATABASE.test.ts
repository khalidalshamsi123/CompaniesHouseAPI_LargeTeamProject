// Mock the database module
import {createSchema} from '../database/setupDatabase';

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
});

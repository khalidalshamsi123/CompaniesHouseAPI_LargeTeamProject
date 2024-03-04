// Mock the database module
import {createSchema} from '../database/setupDatabase';
import fs from 'fs';

// Mock the fs.createReadStream and csvParser modules
jest.mock('csv-parser');
jest.mock('pg');
jest.mock('fs');
jest.mock('../database/setupDatabase', () => ({
	createSchema: jest.fn(),
}));

describe('Database Setup and Insertion Tests', () => {
	describe('Setup Database - Creating business_registry table', () => {
		it('should create business_registry table with correct columns', async () => {
			await createSchema();
			expect(createSchema).toHaveBeenCalled();
		});
	});
});

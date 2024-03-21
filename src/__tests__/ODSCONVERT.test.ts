/* eslint-disable @typescript-eslint/naming-convention */
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import {convertToCsv} from '../scraping/odsToCsv';

// The reason the eslint error for naming-conventions has been disabled
// is because it wants to change the names of the xslx methods and objects when we cant do that.

// Mock the libraries
jest.mock('xlsx', () => ({
	readFile: jest.fn(),
	utils: {
		sheet_to_csv: jest.fn(),
	},
}));

// Mocking fs library
jest.mock('fs', () => ({
	writeFileSync: jest.fn(),
	existsSync: jest.fn(),
}));

describe('Given the ods file is located', () => {
	describe('When the ods file is downloaded', () => {
		it('Then it would convert the file data to a csv file', async () => {
			// Mocked data
			const odsFileData = {
				SheetNames: ['Sheet1'],
				Sheets: {
					Sheet1: {A1: {v: 'Header1'}, A2: {v: 'Data1'}},
				},
			};

			const csvData = 'Header1\nData1';

			// Mocking XLSX.readFile to return odsFileData
			(XLSX.readFile as jest.Mock).mockReturnValue(odsFileData);

			// Mocking XLSX.utils.sheet_to_csv to return csvData
			(XLSX.utils.sheet_to_csv as jest.Mock).mockReturnValue(csvData);

			// Mocking fs.existsSync to return true
			(fs.existsSync as jest.Mock).mockReturnValue(true);

			// Calling the function
			const result = convertToCsv();

			// Expectations
			expect(result).toBe(true); // Function should return true on success
		});
	});
});

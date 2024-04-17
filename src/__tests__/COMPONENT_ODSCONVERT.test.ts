import * as XLSX from 'xlsx';
import * as fs from 'fs';
import {convertToCsv} from '../components/scraping/odsToCsv';

describe('Given the ods file is located', () => {
	describe('When the ods file is downloaded', () => {
		it('Then it would convert the file data to a csv file', async () => {
			// Mocked data
			const odsFileData = fs.readFileSync('./odsMockedData/TestMockData.ods');

			// Calling the function
			const result = await convertToCsv(odsFileData, './odsMockedData/test.csv');

			// Expectations
			expect(result).toBe(true); // Function should return true on success
		});
	});
});

describe('Given the ODS file is located', () => {
	describe('When the ODS file is converted to CSV', () => {
		it('Then the values in the CSV should match the values in the ODS file', async () => {
			// Read the content of the ODS file
			const odsFileData = fs.readFileSync('./odsMockedData/TestMockData.ods');
			// Turn it to a workbook to check the data of it
			const odsWorkbook = XLSX.read(odsFileData, {type: 'buffer'});
			const odsSheetName = odsWorkbook.SheetNames[0];
			const odsSheet = odsWorkbook.Sheets[odsSheetName];

			// Convert ODS file to CSV
			await convertToCsv(odsFileData, './odsMockedData/test.csv');

			// Read the content of the CSV file
			const csvFileContent = fs.readFileSync('./odsMockedData/test.csv', 'utf-8');

			// Parse the content of the ODS file
			const odsCsvContent = XLSX.utils.sheet_to_csv(odsSheet);

			// Extract values from the CSV data
			const csvValues = csvFileContent.split('\n').map(row => row.split(','));

			// Extract values from the ODS data
			const odsValues = odsCsvContent.split('\n').map(row => row.split(','));

			// Compare each value
			for (let i = 0; i < csvValues.length; i++) {
				for (let j = 0; j < csvValues[i].length; j++) {
					expect(csvValues[i][j]).toEqual(odsValues[i][j]);
				}
			}
		});
	});
});

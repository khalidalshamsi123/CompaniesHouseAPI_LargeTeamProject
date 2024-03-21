import * as XSLX from 'xlsx';
import * as fs from 'fs';

function convertToCsv() {
	try {
		const odsFile = XSLX.readFile('temphmrcfile.ods');

		/* This is a fail safe. Just in case the scraped ods file is empty
		it would not overwrite the csv file
		*/
		if (!odsFile || odsFile.SheetNames[0].length === 0) {
			console.error('There is no Ods file or the file is empty');
			return false;
		}

		// Since this ods file contains only one sheet, we have to select it
		const firstSheet = odsFile.SheetNames[0];
		const odsSheet = odsFile.Sheets[firstSheet];

		// Convert the ods sheet to a csv file
		const csvFile = XSLX.utils.sheet_to_csv(odsSheet);

		// Write the csv file
		fs.writeFileSync('./TheConvertedFile.csv', csvFile, 'utf-8');

		console.log('file has been converted');
		return true;
	} catch (error) {
		console.error('Error occurred while converting:', error);
		return false;
	}
}

export {convertToCsv};

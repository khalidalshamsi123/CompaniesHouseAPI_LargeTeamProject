import * as XSLX from 'xlsx';
import * as fs from 'fs';

function convertToCsv() {
	const odsFile = XSLX.readFile('temphmrcfile.ods');

	const firstSheet = odsFile.SheetNames[0];
	const odsSheet = odsFile.Sheets[firstSheet];

	// Convert the ods sheet to a csv file
	const csvFile = XSLX.utils.sheet_to_csv(odsSheet);

	// Write the csv file
	fs.writeFileSync('./TheConvertedFile.csv', csvFile, 'utf-8');

	console.log('file has been converted');
}

export {convertToCsv};

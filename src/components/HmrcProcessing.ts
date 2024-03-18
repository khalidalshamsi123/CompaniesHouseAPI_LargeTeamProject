import pl from 'nodejs-polars';

type JsonValue = {
	name: string;
	status: boolean;
};

type JsonObjectValues = {
	name: string;
	status: boolean;
};

// First implementation, used for client showcase.
// This function will show the columns (such as business name and status) of the csv that is passed to.
// The parameter 'targetBusinessName' will be used to pick out which business you want to return.
export function hmrcStatusRetriever(csvFile: string, businessNames: string, approvalStatus: string, targetBusinessName: string) {
	// Reads the file
	const csvData = pl.readCSV(csvFile);

	// Filters the response with two columns
	const businessNamesValues = csvData.getColumn(businessNames);
	const approvalStatusValues = csvData.getColumn(approvalStatus);

	let index = 0;
	// Looping to find the index of a specific value
	for (let i = 0; i < businessNamesValues.length; i++) {
		if (businessNamesValues[i] === targetBusinessName) {
			index = i;
			break;
		}
	}

	let specificApprovalStatusValue = false;

	if (approvalStatusValues[index] === 'APPROVED') {
		specificApprovalStatusValue = true;
	}

	const statusValue = specificApprovalStatusValue;
	return statusValue;
}

// Second implementation, refactoring the code to return all hmrc businesses with boolean values
export function hmrcCsvReader(csvFile: string, businessName: string, statusColumn: string) {
	try {
		// Reads the file
		const csvData = pl.readCSV(csvFile);

		// Filters the response with two columns
		const businessNameValues = csvData.getColumn(businessName);
		const statusColumnValues = csvData.getColumn(statusColumn);

		const jsonObjects = [];

		// Looping to find the index of all values with APPROVED
		// After finding the values, i convert them to a boolean type
		// to true if it was approved, false if it wasnt.
		for (let i = 0; i < businessNameValues.length; i++) {
			let statusColumnValue = false;
			if (statusColumnValues[i] === 'APPROVED') {
				statusColumnValue = true;
			}

			// This stores the data of the two columns 'name' and 'status' in a JSON object
			// Finally it would be pushed to an array containing all of the JSON objects.
			const jsonValue: JsonObjectValues = {name: businessNameValues[i] as string, status: statusColumnValue};
			jsonObjects.push(jsonValue);
		}

		return jsonObjects;
	} catch (error: any) {
		console.error('Error reading CSV file:', error.message);
		return [];
	}
}

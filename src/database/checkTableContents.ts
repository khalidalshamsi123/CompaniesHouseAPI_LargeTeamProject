import pool from './databasePool';

async function printTableContents(schema: string, tableName: string) {
	// Query to select all rows from the specified table in the specified schema
	const query = `SELECT * FROM "${schema}"."${tableName}"`;

	try {
		// Execute the query
		const result = await pool.query(query);

		// Print the table contents
		console.log(`Contents of table '${tableName}' in schema '${schema}':`);
		console.table(result.rows); // Print the rows in a tabular format
	} catch (error) {
		console.error(`Failed to print table '${tableName}' in schema '${schema}':`, error);
	}
}

async function printAllTableContents(schema: string) {
	try {
		// Execute both queries concurrently using Promise.allSettled()
		const results = await Promise.allSettled([
			printTableContents(schema, 'non_approved_registry'),
			printTableContents(schema, 'business_registry'),
		]);

		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				console.error(`Failed to print table ${index === 0 ? 'non_approved_registry' : 'business_registry'} in schema '${schema}':`, result.reason);
			}
		});

		console.log('Table contents printed successfully.');
	} catch (error) {
		console.error('Failed to print table contents:', error);
	}
}

async function main() {
	try {
		// Call the function to print contents of both tables
		await printAllTableContents('registration_schema');
		console.log('All table contents printed successfully.');
	} catch (error) {
		console.error('Failed to print table contents:', error);
	} finally {
		// Close the pool after all operations are complete
		await pool.end();
	}
}

// Call the main function and handle the returned promise
main()
	.then(() => {
		console.log('Main function completed successfully.');
	})
	.catch(error => {
		console.error('Main function encountered an error:', error);
	});

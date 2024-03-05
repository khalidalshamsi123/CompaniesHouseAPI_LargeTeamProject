import pool from './databasePool';

async function printTableContents(schema: string, tableName: string) {
	const query = `SELECT * FROM "${schema}"."${tableName}"`;

	try {
		const result = await pool.query(query);
		console.log(`Contents of table '${tableName}' in schema '${schema}':`);
		console.table(result.rows);
	} catch (error) {
		console.error(`Failed to print table '${tableName}' in schema '${schema}':`, error);
		throw error; // Propagate the error to the caller
	}
}

async function printAllTableContents(schema: string) {
	try {
		const results = await Promise.allSettled([
			printTableContents(schema, 'business_registry'),
			// Add additional print functions for other tables if needed
		]);

		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				console.error(`Failed to print table ${index === 0 ? 'business_registry' : 'another_table'} in schema '${schema}':`, result.reason);
			}
		});

		console.log('Table contents printed successfully.');
	} catch (error) {
		console.error('Failed to print table contents:', error);
		throw error; // Propagate the error to the caller
	}
}

async function main() {
	try {
		await printAllTableContents('registration_schema');
	} catch (error) {
		console.error('Failed to print table contents:', error);
	} finally {
		await pool.end();
	}
}

main()
	.then(() => {
		console.log('Main function completed successfully.');
	})
	.catch(error => {
		console.error('Main function encountered an error:', error);
	});

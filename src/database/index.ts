import {createSchema as setupDatabase} from './setupDatabase';
import {insertBusinessData} from './queries';
import type {BusinessData} from './queries';

async function main() {
	try {
		// Call the setupDatabase function to create the schema
		await setupDatabase();

		// Log a message indicating that the main function is starting
		console.log('Starting main function...');

		// Call insertBusinessData function with actual data
		const businessData: BusinessData = {
			registrationId: '00445790',
			businessName: 'TESCO PLC',
			fcaApproved: false,
			hmrcApproved: true,
			gamblingApproved: false,
		};

		await insertBusinessData(businessData);

		console.log('Data insertion completed successfully!');
	} catch (error) {
		// Log an error message if an error occurs
		console.error('Error:', error);
		process.exit(1); // Exit the process with an error code
	}
}

// Call the main function to start the execution
main().catch(error => {
	console.error('Unhandled error:', error);
	process.exit(1); // Exit the process with an error code
});

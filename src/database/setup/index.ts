import {createSchema as setupDatabase} from './setupDatabase';
import {insertBusinessData} from '../queries';
import type {BusinessData} from '../queries';

async function main() {
	try {
		// Call the setupDatabase function to create the schema
		await setupDatabase();

		// Call insertBusinessData function with actual data
		const businessData: BusinessData = {

			registrationid: '00445790',

			businessname: 'TESCO PLC',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			fca_approved: false,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			hmrc_approved: true,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			gambling_approved: false,
		};

		await insertBusinessData(businessData);

		console.log('Data insertion completed successfully!');
	} catch (error) {
		// Log an error message if an error occurs
		console.error('Error:', error);
		process.exit(1); // Exit the process with an error code
	}
}

export {main};

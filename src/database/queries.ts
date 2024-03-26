import {pool} from './setup/databasePool';

// These need to be spelt to match the column names in database so when we read it maps it correctly to this type.
export type BusinessData = {
	registrationid: string;
	businessname: string;
	fca_approved: boolean;
	hmrc_approved: boolean;
	gambling_approved: boolean;
};

async function insertBusinessData(data: BusinessData): Promise<void> {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const {registrationid, businessname, fca_approved, hmrc_approved, gambling_approved} = data;
	try {
		const query = `
            INSERT INTO registration_schema.business_registry (registrationid, businessname, fca_approved, hmrc_approved, gambling_approved)
            VALUES ($1, $2, $3, $4, $5)
        `;

		const values = [registrationid, businessname, fca_approved, hmrc_approved, gambling_approved];

		await pool.query(query, values);

		console.log('Data inserted successfully!');
	} catch (error: any) {
		// Check if the error is a unique constraint violation
		if (error.code === '23505') {
			console.log(`Data with registration ID ${registrationid} already exists in the database.`);
		} else {
			console.error('Error inserting data:', error);
			throw new Error('Error inserting data'); // Creating and throwing an error object
		}
	}
}

// Finds and returns all the approved (HMRC and gambling) by registration ID
async function findAllApprovedByRegId(registrationId: string): Promise<BusinessData | undefined> {
	try {
		const result = await pool.query('SELECT * FROM registration_schema.business_registry WHERE registrationid = $1', [registrationId]);
		const businessData: BusinessData = result.rows[0] as BusinessData;

		// Return null if cant find any data
		if (!businessData) {
			return undefined;
		}

		return businessData;
	} catch (error) {
		console.error('Error retrieving data:', error);
		throw new Error('Error retrieving data');
	}
}

export {findAllApprovedByRegId, insertBusinessData};

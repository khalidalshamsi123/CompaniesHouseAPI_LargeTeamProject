import pool from './databasePool';

export type BusinessData = {
	registrationId: string;
	businessName: string;
	fcaApproved: boolean;
	hmrcApproved: boolean;
	gamblingApproved: boolean;
};

async function insertBusinessData(data: BusinessData): Promise<void> {
	const {registrationId, businessName, fcaApproved, hmrcApproved, gamblingApproved} = data;
	try {
		const query = `
            INSERT INTO registration_schema.business_registry (registrationid, businessname, fca_approved, hmrc_approved, gambling_approved)
            VALUES ($1, $2, $3, $4, $5)
        `;

		const values = [registrationId, businessName, fcaApproved, hmrcApproved, gamblingApproved];

		await pool.query(query, values);

		console.log('Data inserted successfully!');
	} catch (error: any) {
		// Check if the error is a unique constraint violation
		if (error.code === '23505') {
			console.log(`Data with registration ID ${registrationId} already exists in the database.`);
		} else {
			console.error('Error inserting data:', error);
			throw new Error('Error inserting data'); // Creating and throwing an error object
		}
	}
}

export {insertBusinessData};

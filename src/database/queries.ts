import pool from './index';

async function insertBusinessData(registrationId: string, businessName: string, fcaApproved: boolean, hmrcApproved: boolean, gamblingApproved: boolean): Promise<void> {
    try {
        const query = `
            INSERT INTO registration_schema.business_registry (registrationid, businessname, fca_approved, hmrc_approved, gambling_approved)
            VALUES ($1, $2, $3, $4, $5)
        `;

        const values = [registrationId, businessName, fcaApproved, hmrcApproved, gamblingApproved];

        await pool.query(query, values);

        console.log('Data inserted successfully!');
    } catch (error) {
        console.error('Error inserting data:', error);
        throw error;
    }
}

export { insertBusinessData };

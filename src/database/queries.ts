import {pool} from './databasePool';
// These need to be spelt to match the column names in database so when we read it maps it correctly to this type.

export type BusinessData = {
    registrationid: string;
    businessname: string;
    fca_approved: boolean;
    hmrc_approved: boolean;
    gambling_approved: boolean;
};

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

export {findAllApprovedByRegId};

import pool from '../../database/databasePool';
import GamblingCommission from './GamblingCommission';

/**
 * Creates a ready-to-use instance of the Gambling Commission class.
*/
const build = async (): Promise<GamblingCommission> => {
	// Create database tables for Gambling Commission CSVs if they do not already exist.
	await createGamblingCommissionTables();
	return new GamblingCommission();
};

/**
 * Creates the tables that will hold the Gambling Commission CSVs if they do not already exist.
 *
 * The business licences CSV files rows tend to share a lot of the same column values. In the worst
 * case I have seen that the only unique column values were the ones relating to the start and
 * end date of the licence.
 *
 * You can't simply include the start_date and end_date values to a composite primary key as
 * these values can be null by the nature of the dataset.
 *
 * So, sadly there's no way purely via the schema to ensure some sort of uniqueness between rows.
 * This issue will instead have to be tackled progromatically when needed.
 *
 * I have decided to make this method public, to allow it to be easily tested. There's no harm
 * in allowing other components to call this utility method as it only creates the tables if they
 * don't exist already.
*/
export const createGamblingCommissionTables = async () => {
	// Determine what environment the application is running in.
	const environment = process.env.NODE_ENV;
	// By default will use the production schema.
	let schema = 'registration_schema';
	// Which schema the tables will be created in depends on the environment.
	// Production or test.
	if (environment === 'test') {
		schema = 'test_schema';
	}

	// Table definitions match the current format used for the required gambling commission CSVs.
	await pool.query(`
		CREATE TABLE IF NOT EXISTS ${schema}.business_licence_register_businesses (
			account_number BIGINT PRIMARY KEY,
			licence_account_name VARCHAR(255) NOT NULL
		);
		
		CREATE TABLE IF NOT EXISTS ${schema}.business_licence_register_licences (
			account_number BIGINT NOT NULL,
			licence_number VARCHAR(255) NOT NULL,
			status VARCHAR(255) NOT NULL,
			type VARCHAR(255) NOT NULL,
			activity VARCHAR(255) NOT NULL,
			start_date timestamptz,
			end_date timestamptz
		);`,
	);
};

export default build;

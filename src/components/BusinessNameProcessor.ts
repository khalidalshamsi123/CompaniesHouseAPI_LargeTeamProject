import pool from '../database/setup/databasePool';
import {type Regulator} from '../types/CSVRegulatorTypes';

export default class BusinessNameProcessor {
	/** A hashmap of the legal structures found in the UK.
	 * 	The short-hand and long-form version of these legal structures tend to be used interchangebly.
	 *  Making it important that we standardize them to a common format their long-form.
	 *
	 *  I made design decision to convert from abbreviated to unabbreviated form because of a few reasons:
	 *     1. The unabbreviated version is much more likely to be found within the business name itself.
	 *	      Meaning it would be difficult to assess whether we have detected the legal structure of the business, or a part of its name.
	 *	      E.g., `Game Company Corporation Ltd`. would be standardized as `Game Company Corp Ltd`. which isn't valid or intended.
	 *	   2. We can safely assume that an abbreviation will be its own 'word', that it will be seperated from other words by spaces.
	 *	  	  Which in turn enables us to more easily detect them and acquire the right unabbreviated version to replace them with.
	*/
	private readonly legalStructures = new Map<string, string>([
		['ltd', 'limited'],
		['llp', 'limited liability partnership'],
		['plc', 'public limited company'],
		['inc', 'incorporated'],
		['corp', 'corporation'],
		['lp', 'limited partnership'],
		['swrl', 'society with restricted liability'],
		['assoc', 'association'],
		['cic', 'community interest company'],
	]);

	/**
	 * Standardizes an array of business names. Lower-cases each, and converts any known abbreviated legal structures in the name to the unabbreviated version.
	 * @param {string[]} businessNames An array of business name strings.
	 * @returns {string[]} An array of standardized business names.
	 */
	public standardize(businessNames: string[]): string;
	/**
	 * Standardizes a business name, sets it to lower-case and converts any known abbreviated legal structures to the unabbreviated version.
	 * @param businessName Business name to standardize.
	 * @returns {string} A standardized version of the provided business name.
	 */
	public standardize(businessName: string): string;

	public standardize(nameData: string | string[]): string | string[] {
		if (nameData instanceof Array) {
			// Standardize each business name and return result in an array.
			// This keeps the output structured the same as the input.
			return nameData.map(name => this.standardizeSingle(name));
		}

		return this.standardizeSingle(nameData);
	}

	/**
	 * Compares a given business name with the corresponding name in the database based on the specified regulator.
 	 * This method fetches the business name from a specific regulatory table (either HMRC or Gambling) using the provided record ID,
     * standardizes the provided business name using `standardizeSingle`, and checks for a match.
	 * @param {string} recordID - The unique identifier for the business record in the database.
 	 * @param {string} businessName - The business name to compare against the database.
 	 * @param {Regulator} regulator - The regulator type, which determines the database schema and table. Valid values are 'hmrc' or 'gambling'.
 	 * @returns {Promise<{isMatch: boolean, message?: string}>} A promise that resolves to an object containing:
 	 *    - `isMatch`: A boolean indicating whether the provided business name matches the name in the database.
 	 *    - `message`: An optional message describing the result of the comparison. This message is included if there is a mismatch.
 	 * @throws {Error} Throws an error if the business cannot be found, or if other issues occur.
	 */
	public async compareBusinessNameWithRecord(recordID: string, businessName: string, regulator: Regulator): Promise<{isMatch: boolean; message?: string}> {
		let schema = 'registration_schema';
		if (process.env.NODE_ENV === 'test') {
			schema = 'test_schema';
		}

		let table;
		let regulatorName;
		switch (regulator) {
			case 'hmrc':
				regulatorName = 'HMRC';
				table = 'hmrc_business_registry';
				break;
			case 'gambling':
				regulatorName = 'the Gambling Commission';
				table = 'gambling_business_registry';
				break;
			// Can't remove default case even though it's redundant because another lint rule will then throw an error.
			// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
			default:
				// Do nothing.
		}

		businessName = this.standardizeSingle(businessName);

		const data = await pool.query(`SELECT businessname FROM ${schema}.${table} WHERE referenceid = $1`, [recordID]);

		if (data.rowCount === 0 || !data.rows[0].businessname) {
			throw new Error('Business not found in our records under the given regulatory body.');
		}

		const businessNameDatabase = data.rows[0].businessname as string;

		if (businessNameDatabase === businessName) {
			// Names match.
			return {isMatch: true};
		}

		const message = `The standardized version of the provided business name does not match the one stored in our database for ${regulatorName}. Given: '${businessName}' | Expected: '${businessNameDatabase}'`;
		return {isMatch: false, message};
	}

	/**
	 * Standardizes a single business name. Unabbrevates company legal structures (e.g. Ltd -> limited) and lowercases the string.
	 * @param {string} name Unstandardized name.
	 * @returns {string} Standardized name.
	 */
	private standardizeSingle(name: string): string {
		name = name.toLowerCase();
		for (const [abbreviated, unabbreviated] of this.legalStructures.entries()) {
			if (name.includes(abbreviated)) {
				const regex = new RegExp(`\\b${abbreviated}\\b`, 'gi');
				name = name.replace(regex, unabbreviated);
			}
			// Any unrecognised unabbreviated legal structures are left unchanged.
		}

		return name;
	}
}

export default class BusinessNameStandardizer {
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
	 * @param businessNames An array of business name strings.
	 */
	public standardize(businessNames: string[]): string;
	/**
	 * Standardizes a business name, sets it to lower-case and converts any known abbreviated legal structures to the unabbreviated version.
	 * @param businessName Business name to standardize.
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

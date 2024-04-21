import BusinessNameProcessor from '../components/BusinessNameProcessor';

//  Scenario: Long-form legal structure in name.

// Given.
describe('Given a business name with an abbreviated business structure within.', () => {
	const businessName = 'Test Business Ltd.';
	const businessNames = ['Test Business Ltd.', 'Test Company Plc'];
	// When.
	describe('When the business name standardizer is used on this name.', () => {
		const businessNameStandardizer = new BusinessNameProcessor();
		const standardizedName = businessNameStandardizer.standardize(businessName);
		const standardizedNames = businessNameStandardizer.standardize(businessNames);
		// Then.
		it('Then the abbreviated legal structure should be converted to the appropriate unabbreviated equivalent.', () => {
			expect(standardizedName).toBe('test business limited.');
			expect(standardizedNames).toStrictEqual([
				'test business limited.',
				'test company public limited company',
			]);
		});
	});
});

// Scenario: Unabbreviated legal structure already present.

// Given.
describe('Given a business name with a unabbreviated business structure within.', () => {
	const businessName = 'Test Business Limited.';
	const businessNames = ['Test Business Limited.', 'Test Company public limited company'];
	// When.
	describe('When the business name standardizer is used on this name.', () => {
		const businessNameStandardizer = new BusinessNameProcessor();
		const standardizedName = businessNameStandardizer.standardize(businessName);
		const standardizedNames = businessNameStandardizer.standardize(businessNames);
		// Then.
		it('Then the input should be given back unchanged besides being lower-case.', () => {
			expect(standardizedName).toBe('test business limited.');
			expect(standardizedNames).toStrictEqual([
				'test business limited.',
				'test company public limited company',
			]);
		});
	});
});

// Scenario: Case sensitivity handling.

// Given.
describe('Given a business name with abbreviated legal structures in different case formats (e.g., "Ltd", "LTD", "lTd").', () => {
	const businessName = 'Test Business LTD.';
	const businessNames = ['Test Business LTD.', 'Test Company PLc'];
	// When.
	describe('When the business name standardizer is used on this name.', () => {
		const businessNameStandardizer = new BusinessNameProcessor();
		const standardizedName = businessNameStandardizer.standardize(businessName);
		const standardizedNames = businessNameStandardizer.standardize(businessNames);
		// Then.
		it('Then the abbreviated legal structure should be converted to the appropriate unabbreviated equivalent.', () => {
			expect(standardizedName).toBe('test business limited.');
			expect(standardizedNames).toStrictEqual([
				'test business limited.',
				'test company public limited company',
			]);
		});
	});
});

// Scenario: Lower-case output.

// Given.
describe('Given a business name including capitalisation.', () => {
	const businessName = 'Test Business Plc.';
	const businessNames = ['Test Business Ltd.', 'Test Company Plc'];
	// When.
	describe('When the business name standardizer is used on this name.', () => {
		const businessNameStandardizer = new BusinessNameProcessor();
		const standardizedName = businessNameStandardizer.standardize(businessName);
		const standardizedNames = businessNameStandardizer.standardize(businessNames);
		// Then.
		it('Then the business name outputted should be lowercase.', () => {
			expect(standardizedName).toBe('test business public limited company.');
			expect(standardizedNames).toStrictEqual([
				'test business limited.',
				'test company public limited company',
			]);
		});
	});
});

// Scenario: Non-standard abbreviated legal structures.

// Given.
describe('Given a business name with an unincluded, or unrecognized abbreviated legal structure.', () => {
	const businessName = 'Test Business UNOWEN.';
	const businessNames = ['Test Business UNOWEN.', 'Test Company UNOWEN usp'];
	// When.
	describe('When the business name standardizer is used on this name.', () => {
		const businessNameStandardizer = new BusinessNameProcessor();
		const standardizedName = businessNameStandardizer.standardize(businessName);
		const standardizedNames = businessNameStandardizer.standardize(businessNames);
		// Then.
		it('Then the standardizer should leave the unrecognized abbreviated legal structure as is.', () => {
			expect(standardizedName).toBe('test business unowen.');
			expect(standardizedNames).toStrictEqual([
				'test business unowen.',
				'test company unowen usp',
			]);
		});
	});
});

// Scenario: Abbreviation mixed inside other words.

describe('Given a business name with an abbreviated legal structure mixed in with another word, not separated by spaces (e.g., "BusinessUNLTD Ltd").', () => {
	const businessName = 'BusinessUNLTD Ltd.';
	const businessNames = ['BusinessUNLTD Ltd.', 'CompGames Plc'];
	// When.
	describe('When the business name standardizer is used on this name.', () => {
		const businessNameStandardizer = new BusinessNameProcessor();
		const standardizedName = businessNameStandardizer.standardize(businessName);
		const standardizedNames = businessNameStandardizer.standardize(businessNames);
		// Then.
		it('Then the standardized name should not attempt to change the abbreviation mixed within other words.', () => {
			expect(standardizedName).toBe('businessunltd limited.');
			expect(standardizedNames).toStrictEqual([
				'businessunltd limited.',
				'compgames public limited company',
			]);
		});
	});
});


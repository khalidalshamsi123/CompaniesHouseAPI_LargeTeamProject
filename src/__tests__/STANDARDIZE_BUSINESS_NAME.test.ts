//  Scenario: Long-form legal structure in name.

import BusinessNameStandardizer from '../components/BusinessNameStandardizer';

// Given.
describe('Given a business name with an abbreviated business structure within.', () => {
	const businessName = 'Test Business Ltd.';
	// When.
	describe('When the business name standardizer is used on this name.', () => {
		const standardizedName = new BusinessNameStandardizer().standardize(businessName);
		// Then.
		it('Then the abbreviated legal structure should be converted to the appropriate unabbreviated equivalent.', () => {
			expect(standardizedName).toBe('test business limited.');
		});
	});
});

// Scenario: Unabbreviated legal structure already present.

// Given.
describe('Given a business name with a unabbreviated business structure within.', () => {
	const businessName = 'Test Business Limited.';
	// When.
	describe('When the business name standardizer is used on this name.', () => {
		const standardizedName = new BusinessNameStandardizer().standardize(businessName);
		// Then.
		it('Then the input should be given back unchanged besides being lower-case.', () => {
			expect(standardizedName).toBe('test business limited.');
		});
	});
});

// Scenario: Case sensitivity handling.

// Given.
describe('Given a business name with abbreviated legal structures in different case formats (e.g., "Ltd", "LTD", "lTd").', () => {
	const businessName = 'Test Business LTD.';
	// When.
	describe('When the business name standardizer is used on this name.', () => {
		const standardizedName = new BusinessNameStandardizer().standardize(businessName);
		// Then.
		it('Then the abbreviated legal structure should be converted to the appropriate unabbreviated equivalent.', () => {
			expect(standardizedName).toBe('test business limited.');
		});
	});
});

// Scenario: Lower-case output.

// Given.
describe('Given a business name including capitalisation.', () => {
	const businessName = 'Test Business Plc.';
	// When.
	describe('When the business name standardizer is used on this name.', () => {
		const standardizedName = new BusinessNameStandardizer().standardize(businessName);
		// Then.
		it('Then the business name outputted should be lowercase.', () => {
			expect(standardizedName).toBe('test business public limited company.');
		});
	});
});

// Scenario: Non-standard abbreviated legal structures.

// Given.
describe('Given a business name with an unincluded, or unrecognized abbreviated legal structure.', () => {
	const businessName = 'Test Business UNOWEN.';
	// When.
	describe('When the business name standardizer is used on this name.', () => {
		const standardizedName = new BusinessNameStandardizer().standardize(businessName);
		// Then.
		it('Then the standardizer should leave the unrecognized abbreviated legal structure as is.', () => {
			expect(standardizedName).toBe('test business unowen.');
		});
	});
});

// Scenario: Abbreviation mixed inside other words.

describe('Given a business name with an abbreviated legal structure mixed in with another word, not separated by spaces (e.g., "BusinessUNLTD Ltd").', () => {
	const businessName = 'BusinessUNLTD Ltd.';
	// When.
	describe('When the business name standardizer is used on this name.', () => {
		const standardizedName = new BusinessNameStandardizer().standardize(businessName);
		// Then.
		it('Then the standardized name should not attempt to change the abbreviation mixed within other words.', () => {
			expect(standardizedName).toBe('businessunltd limited.');
		});
	});
});


import request from 'supertest';
import app from '../app';
import isAuthorised from '../routes/approved';

// Scenario: FCA endpoint returns 400 then logic is exuted for FCA individual.
// Given
describe('Given a firm is not found or unathorised in the Firm API'), () => {
	// When
	describe('The status comes back as FSR-API-02-01-11'), () => {
		// Then
		it()
	};
};

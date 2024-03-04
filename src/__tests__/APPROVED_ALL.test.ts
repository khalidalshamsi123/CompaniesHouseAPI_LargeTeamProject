import request from 'supertest';
import app from '../app';
import {createSchema} from "../database/setupDatabase";

jest.mock('../database/setupDatabase', () => ({
    createSchema: jest.fn(),
}));
jest.mock('../database/queries', () => ({
    insertBusinessData: jest.fn(),
    findAllApprovedByRegID: jest.fn(),
}));
describe('Setup Database - Creating business_registry table for the following tests', () => {
    it('should create business_registry table with correct columns', async () => {
        await createSchema();
        expect(createSchema).toHaveBeenCalled();
    });

    describe('Given a request is made to retrieve approval status for a specific registration ID from the /allApproved endpoint.', () => {
        describe('When the registration ID 122702 is provided to the endpoint.', () => {
            it('Then the response should contain FCA authorization as true and HMRC and Gambling Commission authorization as false.', async () => {
                //Make the request and wait for the response
                const response = await request(app)
                    .get('/approved/allApproved')
                    .query({ registrationId: '122702', businessName: 'Barclays' });

                //Assert the response
                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('registrationId', '122702');
                expect(response.body).toHaveProperty('businessName');
                expect(response.body.Approved.FCA).toBe(true);
                expect(response.body.Approved.HMRC).toBe(false);
                expect(response.body.Approved.Gambling_Comission).toBe(false);
            });
        });
    });
});


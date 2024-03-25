import * as fs from 'fs';
import axios from 'axios';
import {scrapeHmrcWebsite} from '../scraping/fetchingHmrcFile';

// Mock data
const htmlData = `
            <div id="contents">
                <div class="gem-c-govspeak govuk-govspeak">
                        <p>
                            <span>
                            <a class="govuk-link" href="https://assets.publishing.service.gov.uk/media/65981efad7737c000df334c9/Supervised-Business-Register.csv">Supervised Business Register</a>
                            </span>
                        </p>
                </div>
            </div>
        `;

const odsHtmlData = `
        <div id="contents">
            <div class="gem-c-govspeak govuk-govspeak">
                    <p>
                        <span>
                        <a class="govuk-link" href="https://assets.publishing.service.gov.uk/media/65981efad7737c000df334c9/Supervised-Business-Register.ods">Supervised Business Register</a>
                        </span>
                    </p>
            </div>
        </div>
    `;

const invalidHtmlData = `
    <div id="contents">
        <div class="gem-c-govspeak govuk-govspeak">
                <p>
                    <span>
                    <a class="govuk-link" href="https://assets.publishing.service.gov.uk/Supervised-Business-Register.pdf">Supervised Business Register</a>
                    </span>
                </p>
        </div>
    </div>
`;
jest.mock('axios');

jest.mock('fs', () => ({
	writeFile: jest.fn(),
}));

describe('Given the hmrc website is up and running', () => {
	describe('When the function scrapeHmrcWebsite is called', () => {
		it('Then it would retreive the href of the csv file', async () => {
			// Mock Axios response
			const mockedResponse = {
				data: htmlData,
			};

			// Mock Axios.get method to return the mocked response
			(axios.get as jest.Mock).mockResolvedValue(mockedResponse);

			const href = await scrapeHmrcWebsite('#contents .gem-c-govspeak.govuk-govspeak .govuk-link');

			expect(href).toBe('https://assets.publishing.service.gov.uk/media/65981efad7737c000df334c9/Supervised-Business-Register.csv');
		});
	});
});

describe('Given the hmrc website is up and running', () => {
	describe('When the function scrapeHmrcWebsite is called', () => {
		it('Then it would retreive the href of the ods file', async () => {
			// Mock Axios response
			const mockedResponse = {
				data: odsHtmlData,
			};

			// Mock Axios.get method to return the mocked response
			(axios.get as jest.Mock).mockResolvedValue(mockedResponse);

			const href = await scrapeHmrcWebsite('#contents .gem-c-govspeak.govuk-govspeak .govuk-link');

			expect(href).toBe('https://assets.publishing.service.gov.uk/media/65981efad7737c000df334c9/Supervised-Business-Register.ods');
		});
	});
});

describe('Given the hmrc website is up and running', () => {
	describe('When the function scrapeHmrcWebsite is called and the wrong file type was provided', () => {
		it('Then it would return empty', async () => {
			// Mock Axios response
			const mockedResponse = {
				data: invalidHtmlData,
			};

			// Mock Axios.get method to return the mocked response
			(axios.get as jest.Mock).mockResolvedValue(mockedResponse);

			const href = await scrapeHmrcWebsite('#contents .gem-c-govspeak.govuk-govspeak .govuk-link');

			expect(href).toBe('empty');
		});
	});
});

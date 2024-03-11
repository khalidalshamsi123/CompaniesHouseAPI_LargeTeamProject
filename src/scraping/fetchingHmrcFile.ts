import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
// Loading the hmrc website

// Selecting the element 'body'.
// const $body = $('body');

// Traversing the divs searching for grandchildren divs
// $('body #wrapper #content .govuk-grid-row .govuk-grid-column-two-thirds #contents .gem-c-govspeak.govuk-govspeak .govspeak ')
// 	.each((index, element) => {
// 		console.log($(element));
// 	});

async function scrapeHmrcWebsite() { 
	const hmrcResponse: AxiosResponse<string | Buffer> = await axios.get('https://www.gov.uk/guidance/money-laundering-regulations-supervised-business-register');

	const $ = cheerio.load(hmrcResponse.data);
	console.log($('body').text());
}

export {scrapeHmrcWebsite};

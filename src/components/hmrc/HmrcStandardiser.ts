import {type Request} from 'express';
import {type CsvKeys} from '../../types/GamblingCommissionTypes';

export default class HmrcStandardiser {
	public async standardise(data: Request | CsvKeys[], schema: string): Promise<void> {
		if (data instanceof Array) {
			// Handle the case where the first argument is a string (csvKey).
		} else {
			// Handle the case where the first argument is a Request object.
		}
	}
}

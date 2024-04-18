import {Router} from 'express';
import {queryAggregator} from '../components/aggregator';

import isAuthorised from '../middleware/authentication';

import {type PostCommissionIDsQueryBody} from '../types/AggregatorTypes';

const router = Router();

/**
 * Retrieves business information based on multiple registration IDs (commissions)
 * and business name. Validates that at least one registration ID is provided.
 *
 * @route POST /
 * @param {Request} req - Request object, expects a query with businessName and a commissions object.
 * @param {Response} res - Response object used to send back HTTP responses.
 * @returns Returns JSON data with business approval details as responseObj, or an error status.
 */
router.post('/', isAuthorised, async (req, res) => {
	try {
		const {businessName, commissions} = req.body as PostCommissionIDsQueryBody;

		// Validate input, remove whitespace so no invalid characters are counted toward the check
		if (!businessName.trim().length) {
			res.status(400).json({error: 'Invalid or missing business name'});
			return;
		}

		if (!commissions || (typeof commissions !== 'object')) {
			res.status(400).json({error: 'Invalid or missing commissions data'});
			return;
		}

		const {gamblingCommission, hmrc, fca} = commissions;
		if (!gamblingCommission && !hmrc && !fca) {
			res.status(400).json({error: 'At least one commission ID must be provided'});
			return;
		}

		// Just give an empty schema name and itll resolve to registration_schema, defining it is only needed for test_schema
		const responseObj = await queryAggregator(businessName, commissions, '');

		if (responseObj === undefined) {
			res.sendStatus(404);
			return;
		}

		// Determine status code based on approval status of commission results
		const statusCode = responseObj.approved ? 200 : 404;
		res.status(statusCode).json(responseObj);
	} catch (error) {
		console.error(error);
		res.sendStatus(500);
	}
});

export default router;

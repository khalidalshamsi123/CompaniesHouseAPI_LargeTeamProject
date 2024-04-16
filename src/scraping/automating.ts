import {Router} from 'express';
import {scheduleFetching} from './scheduleFetchingCSVFiles';

const router = Router();

router.get('/', (req, res) => {
	scheduleFetching();
	res.send('Fetching files...');
});

export default router;


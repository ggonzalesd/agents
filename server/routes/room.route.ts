import { matchMaker } from 'colyseus';
import { Router } from 'express';

const router = Router();

router.get('/', async (_, res) => {
	const data = await matchMaker.query({});

	console.log({ data });

	res.json({ message: 'Room route works XD' });
});

export default router;

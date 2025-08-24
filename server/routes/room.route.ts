import { matchMaker } from 'colyseus';
import { Router } from 'express';

const router = Router();

router.get('/', async (_, res) => {
	const data = await matchMaker.query({});

	res.json({ message: 'Room route works', data: data.map((d) => d.roomId) });
});

export default router;

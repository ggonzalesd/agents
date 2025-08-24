import { matchMaker } from 'colyseus';
import { Router } from 'express';

import { authMiddleware } from '$/middlewares/auth.middleware';
import { roleMiddleware } from '$/middlewares/role.middleware';
import { getAuth } from '$/utils/req.utils';

const router = Router();

router.get('/', authMiddleware(), async (_, res) => {
	const data = await matchMaker.query({});

	res.json({ message: 'Room route works', data: data.map((d) => d.roomId) });
});

router.post(
	'/:id',
	authMiddleware(),
	roleMiddleware('ADMIN', 'MOD'),
	async (req, res) => {
		const { token } = getAuth(req);
		const { id } = req.params;

		const room = await matchMaker.createRoom('main-room', {
			id,
			token,
		});

		res.json({ message: 'Room found', data: room.roomId });
	},
);

export default router;

import { Router } from 'express';
import { matchMaker } from 'colyseus';

import { HttpError } from '#/utils/HttpError';

import { getAuth } from '$/utils/req.utils';

import * as AuthMiddleware from '$/middlewares/auth.middleware';
import * as RoleMiddleware from '$/middlewares/role.middleware';

const router = Router();

router.get('/', AuthMiddleware.validateJwtToken(), async (_, res) => {
	const data = await matchMaker.query({});

	res.json({ message: 'Room route works', data: data.map((d) => d.roomId) });
});

router.post(
	'/:id',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD'),
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

router.post(
	'/stop/:id',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD'),
	async (req, res) => {
		const { id } = req.params;

		const rooms = await matchMaker.query({ roomId: id as string });
		const room = rooms[0];

		if (!room) {
			throw HttpError.notFound(`Room with ID ${id} not found`);
		}

		const r = await matchMaker.getLocalRoomById(room.roomId);
		r.disconnect();

		const roomcache = await matchMaker.getRoomById(room.roomId);
		if (roomcache) {
			roomcache.dispose();
		}

		res.json({ message: 'Room stopped', data: id });
	},
);

export default router;

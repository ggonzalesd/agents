import jsonwebtoken from 'jsonwebtoken';

import { Option } from '#/utils/Option';
import { authPayloadSchema } from '#/schema/auth.schema';

import envConfig from '$/config/env.config';
import type { AuthPayload } from '$/models/Payload.model';

const ACCESS_TOKEN_EXPIRY = '1h';

export const signToken = (payload: AuthPayload) => {
	return jsonwebtoken.sign(payload, envConfig.JWT_SECRET, {
		expiresIn: ACCESS_TOKEN_EXPIRY,
	});
};

export const verifyToken = (token?: string | null): Option<AuthPayload> => {
	if (token == null) {
		return Option.none();
	}

	try {
		const decoded = jsonwebtoken.verify(token, envConfig.JWT_SECRET);
		const parsed = authPayloadSchema.parse(decoded);

		return Option.some(parsed);
	} catch (_error) {
		return Option.none();
	}
};

import type { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';

import { HttpError } from '#/utils/HttpError';
import { jsonResponse } from '#/utils/HttpResponse';
import { LOGIN_TYPE } from '#/schema/auth.schema';
import type {
	loginRequestSchema,
	registerRequestSchema,
	revokeRequestSchema,
	redeemTokenLoginRequestSchema,
	createRedeemTokenRequestSchema,
} from '#/schema/auth.schema';

import prisma from '$/config/prisma.config';

import { getAuth } from '$/utils/req.utils';
import type { AuthPayload } from '$/models/Payload.model';

import * as UserRepository from '$/db/user.db';
import * as RedeemTokenRepository from '$/db/redeemToken.db';
import * as RefreshTokenRepository from '$/db/refreshToken.db';
import * as JwtService from '$/services/jwt.service';
import * as AuthService from '$/services/auth.service';

const COOKIE_OPTIONS = {
	httpOnly: true,
	sameSite: 'strict' as const,
	secure: process.env.NODE_ENV === 'production',
};

// ─────────────────────────────────────────────────────────────────────────────
// Login with credentials
// ─────────────────────────────────────────────────────────────────────────────

export const authLoginController = async (req: Request, res: Response) => {
	const { password, username } = req.body as ReturnType<
		typeof loginRequestSchema.parse
	>;

	const userOption = await UserRepository.getUserByUsername({ username });
	const user = userOption.orElseThrow(
		HttpError.unauthorized('Invalid username or password'),
	);

	const isPasswordValid = bcrypt.compareSync(password, user.password);
	if (!isPasswordValid) {
		throw HttpError.unauthorized('Invalid username or password');
	}

	const now = new Date();
	const validUntil = new Date(now.getTime() + 60 * 60 * 1000);

	const payload: AuthPayload = {
		id: user.id,
		username: user.username,
		hash: user.hash,
		role: user.role,
		loginType: LOGIN_TYPE.CREDENTIALS,
		validFrom: now.toISOString(),
		validUntil: validUntil.toISOString(),
	};

	const token = JwtService.signToken(payload);

	const refreshTokenRecord = await RefreshTokenRepository.createRefreshToken({
		userId: user.id,
	});

	res.cookie('token', token, COOKIE_OPTIONS);
	res.cookie('refreshToken', refreshTokenRecord.token, {
		...COOKIE_OPTIONS,
		path: '/api/v1/auth/refresh',
	});

	const { password: _, hash: __, ...result } = user;

	res.json(
		jsonResponse.ok(
			{
				token,
				payload,
				user: result,
			},
			{ message: 'Login successful' },
		),
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Login with redeem token
// ─────────────────────────────────────────────────────────────────────────────

export const authRedeemLoginController = async (
	req: Request,
	res: Response,
) => {
	const { token: redeemTokenValue } = req.body as ReturnType<
		typeof redeemTokenLoginRequestSchema.parse
	>;

	const redeemTokenOption = await RedeemTokenRepository.getRedeemTokenByToken({
		token: redeemTokenValue,
	});

	const redeemToken = redeemTokenOption.orElseThrow(
		HttpError.unauthorized('Invalid or expired token'),
	);

	const now = new Date();

	if (now > redeemToken.validUntil) {
		await RedeemTokenRepository.deleteRedeemToken({ id: redeemToken.id });
		throw HttpError.forbidden('Token has expired');
	}

	if (now < redeemToken.validFrom) {
		throw HttpError.forbidden('Token is not yet valid');
	}

	await RedeemTokenRepository.deleteRedeemToken({ id: redeemToken.id });

	const userOption = await UserRepository.getUserByUsername({
		username: redeemToken.user.username,
	});

	const user = userOption.orElseThrow(
		HttpError.unauthorized('Associated user not found'),
	);

	const payload: AuthPayload = {
		id: redeemToken.user.id,
		username: redeemToken.user.username,
		hash: redeemToken.user.hash,
		role: redeemToken.user.role as AuthPayload['role'],
		loginType: LOGIN_TYPE.REDEEM_TOKEN,
		validFrom: redeemToken.validFrom.toISOString(),
		validUntil: redeemToken.validUntil.toISOString(),
	};

	const token = JwtService.signToken(payload);

	res.cookie('token', token, COOKIE_OPTIONS);

	const { password: _, hash: __, ...result } = user;

	res.json(
		jsonResponse.ok(
			{
				token,
				payload,
				user: result,
			},
			{ message: 'Redeem token login successful' },
		),
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Refresh token
// ─────────────────────────────────────────────────────────────────────────────

export const refreshTokenController = async (req: Request, res: Response) => {
	const refreshTokenValue = req.cookies?.refreshToken as string | undefined;

	if (!refreshTokenValue) {
		throw HttpError.unauthorized('No refresh token provided');
	}

	const refreshTokenOption =
		await RefreshTokenRepository.getRefreshTokenByToken({
			token: refreshTokenValue,
		});

	const refreshToken = refreshTokenOption.orElseThrow(
		HttpError.unauthorized('Invalid refresh token'),
	);

	if (new Date() > refreshToken.expiresAt) {
		await RefreshTokenRepository.deleteRefreshToken({ id: refreshToken.id });
		throw HttpError.unauthorized('Refresh token expired');
	}

	const userOption = await UserRepository.getUserByUsername({
		username:
			(
				await prisma.user.findUnique({
					where: { id: refreshToken.userId },
					select: { username: true },
				})
			)?.username ?? '',
	});

	const user = userOption.orElseThrow(HttpError.unauthorized('User not found'));

	await RefreshTokenRepository.deleteRefreshToken({ id: refreshToken.id });

	const newRefreshToken = await RefreshTokenRepository.createRefreshToken({
		userId: user.id,
	});

	const now = new Date();
	const validUntil = new Date(now.getTime() + 60 * 60 * 1000);

	const payload: AuthPayload = {
		id: user.id,
		username: user.username,
		hash: user.hash,
		role: user.role,
		loginType: LOGIN_TYPE.CREDENTIALS,
		validFrom: now.toISOString(),
		validUntil: validUntil.toISOString(),
	};

	const token = JwtService.signToken(payload);

	res.cookie('token', token, COOKIE_OPTIONS);
	res.cookie('refreshToken', newRefreshToken.token, {
		...COOKIE_OPTIONS,
		path: '/api/v1/auth/refresh',
	});

	res.json(
		jsonResponse.ok({ token }, { message: 'Token refreshed successfully' }),
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────────────────────────────────────

export const authRegisterController = async (req: Request, res: Response) => {
	const payload = req.body as ReturnType<typeof registerRequestSchema.parse>;

	const newUser = await AuthService.createUser(payload, {
		role: 'USER',
	});

	res.status(201).json(
		jsonResponse.ok(newUser, {
			message: 'User registered successfully',
			status: 201,
		}),
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Revoke
// ─────────────────────────────────────────────────────────────────────────────

export const revokeTokensController = async (req: Request, res: Response) => {
	const body = req.body as ReturnType<typeof revokeRequestSchema.parse>;

	await prisma.$transaction(async (tx) => {
		await UserRepository.revokeUserHash(
			{
				id: body.id,
				withPassword: body.newPassword,
			},
			tx,
		);

		await RefreshTokenRepository.deleteAllRefreshTokensByUserId(
			{ userId: body.id },
			tx,
		);
	});

	res.json(
		jsonResponse.ok(null, {
			message: 'User tokens revoked successfully',
		}),
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────────────────────

export const profileAuthController = async (req: Request, res: Response) => {
	const { user } = getAuth(req);

	const userWithRelations = await UserRepository.getUserById({
		userId: user.id,
	});

	if (userWithRelations.isNone()) {
		throw HttpError.notFound('User profile not found');
	}

	const { user: fullUser, agent, entity, profile } = userWithRelations.value;

	const { password: _, hash: __, ...userResult } = fullUser;

	res.json(
		jsonResponse.ok(
			{
				user: userResult,
				agent: {
					identifier: agent.identifier,
					display: agent.display,
					positionX: agent.positionX,
					positionY: agent.positionY,
					positionZ: agent.positionZ,
				},
				entity: {
					life: entity.life,
					maxLife: entity.maxLife,
					saturation: entity.saturation,
					maxSaturation: entity.maxSaturation,
				},
				banned: profile.banned,
			},
			{
				message: 'User profile retrieved successfully',
			},
		),
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────────────────────

export const logoutController = async (req: Request, res: Response) => {
	const refreshTokenValue = req.cookies?.refreshToken as string | undefined;

	if (refreshTokenValue) {
		await RefreshTokenRepository.deleteRefreshTokenByToken({
			token: refreshTokenValue,
		});
	}

	res.clearCookie('token');
	res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
	res.json(jsonResponse.ok(null, { message: 'Logged out successfully' }));
};

// ─────────────────────────────────────────────────────────────────────────────
// Redeem Token CRUD (Admin)
// ─────────────────────────────────────────────────────────────────────────────

export const createRedeemTokenController = async (
	req: Request,
	res: Response,
) => {
	const body = req.body as ReturnType<
		typeof createRedeemTokenRequestSchema.parse
	>;

	const userExists = await prisma.user.findUnique({
		where: { id: body.userId },
	});

	if (!userExists) {
		throw HttpError.notFound('User not found');
	}

	if (body.validFrom >= body.validUntil) {
		throw HttpError.badRequest('validFrom must be before validUntil');
	}

	const redeemToken = await RedeemTokenRepository.createRedeemToken({
		userId: body.userId,
		validFrom: body.validFrom,
		validUntil: body.validUntil,
	});

	res.status(201).json(
		jsonResponse.ok(redeemToken, {
			message: 'Redeem token created successfully',
			status: 201,
		}),
	);
};

export const listRedeemTokensController = async (
	_req: Request,
	res: Response,
) => {
	const tokens = await RedeemTokenRepository.listAllRedeemTokens();

	res.json(
		jsonResponse.ok(tokens, {
			message: 'Redeem tokens retrieved successfully',
		}),
	);
};

export const deleteRedeemTokenController = async (
	req: Request,
	res: Response,
) => {
	const { id } = req.params;

	if (!id) {
		throw HttpError.badRequest('Token ID is required');
	}

	await RedeemTokenRepository.deleteRedeemToken({ id });

	res.json(
		jsonResponse.ok(null, {
			message: 'Redeem token deleted successfully',
		}),
	);
};

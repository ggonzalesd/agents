import type { AuthPayload } from '$/models/Payload.model';
import type { UserDB } from '$/models/user.model';
import type { Request } from 'express';

export const getAuth = (req: Request) => ({
	user: (req as any).user as UserDB,
	payload: (req as any).payload as AuthPayload,
	token: (req as any).token as string,
});

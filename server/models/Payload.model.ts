import type { LoginType } from '#/schema/auth.schema';
import type { Role } from './Role.model';

export interface AuthPayload {
	id: string;
	username: string;
	hash: string;
	role: Role;
	loginType: LoginType;
	validFrom: string;
	validUntil: string;
}

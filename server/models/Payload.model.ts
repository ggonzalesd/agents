import type { Role } from './Role.model';

export interface AuthPayload {
	id: string;
	username: string;
	hash: string;
	role: Role;
}

import type { Role } from './Role.model';

export interface UserDB {
	id: string;
	username: string;
	display: string | null;
	password: string;
	hash: string;
	createdAt: Date;
	role: Role;
}

import type { RoleDB } from './Role.model';

export interface UserDB {
	id: number;
	username: string;
	display: string;
	password: string;
	createdAt: Date;
	roles: RoleDB[];
}

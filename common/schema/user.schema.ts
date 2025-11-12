import { z } from 'zod';
import { apiResSchema } from '#/schema/api.schema';

export const createUserRequestSchema = z.object({
	name: z.string().min(2).max(255),
	password: z
		.string()
		.min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
		.max(64, { message: "La contraseña no puede exceder 64 caracteres" })
		.regex(/[A-Z]/, { message: "La contraseña debe contener al menos una letra mayúscula" })
		.regex(/[a-z]/, { message: "La contraseña debe contener al menos una letra minúscula" })
		.regex(/[0-9]/, { message: "La contraseña debe contener al menos un número" })
		.regex(/[\W_]/, { message: "La contraseña debe contener al menos un carácter especial" }),
	identifier: z.string().min(2).max(255),
	display: z.string().min(2).max(255),
	x: z.string().min(1).max(255),
	y: z.string().min(1).max(255),
	z: z.string().min(1).max(255),
	skin: z.string().min(2).max(255),
});

export const getUserResSchema = apiResSchema.extend({
	data: createUserRequestSchema,
});

export const listUsersResSchema = apiResSchema.extend({
	data: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			password: z.string(),
			identifier: z.string(),
			display: z.string(),
			x: z.string(),
			y: z.string(),
			z: z.string(),
			skin: z.string(),
		}),
	),
});

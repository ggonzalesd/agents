import envConfig from '$/config/env.config';

import { createUserService } from '$/services/auth.service';

export const superAdminSeed = async () => {
	const userOp = await createUserService(
		{
			username: 'superadmin',
			password: envConfig.ADMIN_PASSWORD,
			display: 'Super Admin',
		},
		{
			role: 'ADMIN',
		},
		false,
	);

	userOp
		.ifSome((user) => {
			console.log(`Super admin created with username: ${user.username}`);
		})
		.ifNone(() => {
			console.log('There was an error creating the super admin user');
		});
};

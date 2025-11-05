import type { Sql } from 'postgres';

import envConfig from '$/config/env.config';

import sql from '$/config/db.config';

import * as UserRepository from '$/db/user.db';
import * as AgentRepository from '$/db/agent.db';
import * as EntityRepository from '$/db/entity.db';
import * as ProfileRepository from '$/db/profile.db';

async function createSuperuser(username: string, sql: Sql) {
	let existingAdmin = (
		await UserRepository.getUserByUsername({ username }, sql)
	).raw();

	if (!existingAdmin) {
		existingAdmin = (
			await UserRepository.createUser(
				{
					username,
					password: envConfig.ADMIN_PASSWORD,
					display: 'Super Admin',
					role: 'ADMIN',
				},
				sql,
			)
		).unwrap('Failed to create super admin user');
	}

	return existingAdmin;
}

async function createSuperagent(identifier: string, display: string, sql: Sql) {
	let existingAgent = (
		await AgentRepository.getAgentByIdentifier({ identifier }, sql)
	).raw();

	if (!existingAgent) {
		existingAgent = (
			await AgentRepository.createAgent(
				{
					identifier,
					display,
					positionX: 0,
					positionY: 0,
					positionZ: 0,
					rotation: 0,
					metadata: {},
				},
				sql,
			)
		).unwrap('Failed to create super admin agent');
	}

	return existingAgent;
}

async function createEntity(entityId: string, sql: Sql) {
	let existingEntity = (
		await EntityRepository.getEntityById({ id: entityId }, sql)
	).raw();

	if (!existingEntity) {
		existingEntity = (
			await EntityRepository.createEntity(
				{
					id: entityId,
					life: 100,
					maxLife: 100,
					saturation: 100,
					maxSaturation: 100,
				},
				sql,
			)
		).unwrap('Failed to create super admin entity');
	}
	return existingEntity;
}

export const superAdminSeed = async () =>
	sql.begin(async (sql) => {
		// * Create Super Admin User
		// Check if super admin user exists
		const existingAdmin = await createSuperuser('superadmin', sql);

		console.log(
			`Super admin user ready: ${existingAdmin.username} (ID: ${existingAdmin.id})`,
		);

		// * Create Superadmin Agent
		// Check if default agent exists
		const identifier = 'big-man-4231de';
		const existingAgent = await createSuperagent(
			identifier,
			'Super Admin',
			sql,
		);

		console.log(
			`Agent ready: ${existingAgent.display} (ID: ${existingAgent.id})`,
		);

		// * Create Superadmin Entity
		const entityId = existingAgent.id;
		const existingEntity = await createEntity(entityId, sql);

		console.log(
			`Entity ready: ${existingEntity.id} (Life: ${existingEntity.life}/${existingEntity.maxLife})`,
		);

		// * Create Profiles
		const profiles = await ProfileRepository.getProfilesByUserId({
			userId: existingAdmin.id,
		});
		console.log(`Found ${profiles.length} profiles for super admin user.`);

		if (profiles.length === 0) {
			(await ProfileRepository.getProfileByEntityId({ entityId }, sql)).ifSome(
				() => {
					throw new Error('Profile already exists for another user!');
				},
			);

			const newProfile = await ProfileRepository.createProfile(
				{
					userId: existingAdmin.id,
					entityId: existingEntity.id,
				},
				sql,
			);

			profiles.push(newProfile);
		}

		console.log(
			`Super admin profiles ready: ${profiles.map((p) => p.entityId).join(', ')}`,
		);
	});

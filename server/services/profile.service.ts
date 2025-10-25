import { HttpError } from '#/utils/HttpError';

import * as UserRepository from '$/db/user.db';
import * as ProfileRepository from '$/db/profile.db';
import * as EntityRepository from '$/db/entity.db';
import * as AgentRepository from '$/db/agent.db';

export const getUserInfo = async (username: string) => {
	const user = (
		await UserRepository.getUserByUsername({ username })
	).orElseThrow(() => HttpError.notFound(`User '${username}' not found`));

	const profiles = await ProfileRepository.getProfilesByUserId({
		userId: user.id,
	});
	const profile = profiles.find((p) => !p.banned);
	if (!profile) {
		throw HttpError.notFound(`No active profile found for user '${username}'`);
	}

	const entity = (
		await EntityRepository.getEntityById({ id: profile.entityId })
	).orElseThrow(() =>
		HttpError.notFound(`Entity for profile '${profile.entityId}' not found`),
	);

	const agent = (
		await AgentRepository.getAgentById({ id: entity.id })
	).orElseThrow(() =>
		HttpError.notFound(`Agent for entity '${entity.id}' not found`),
	);

	return {
		username,
		user,
		profile,
		entity,
		agent,
	};
};

import { PrismaClient, Role } from './../server/generated/prisma/client';
import envConfig from './../server/config/env.config';

import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createPlayer(props: {
	username: string;
	password: string;
	display: string;
	identifier: string;
	role?: Role;
}) {
	const player = await prisma.user.create({
		data: {
			password: bcrypt.hashSync(props.password, 10),
			username: props.username,
			role: props.role || Role.USER,
		},
	});

	const agent = await prisma.agent.create({
		data: {
			display: props.display,
			identifier: props.identifier,
			metadata: {},
			positionX: 0,
			positionY: 0,
			positionZ: 0,
			rotation: 0,
		},
	});

	const entity = await prisma.entity.create({
		data: {
			id: agent.id,
		},
	});

	const profile = await prisma.profile.create({
		data: {
			userId: player.id,
			entityId: entity.id,
		},
	});

	return { player, agent, entity, profile };
}

async function createNPC(props: {
	display: string;
	identifier: string;
	model: string;
	skinUrl: string;
	description?: string;
}) {
	const agent = await prisma.agent.create({
		data: {
			display: props.display,
			identifier: props.identifier,
			metadata: {},
			positionX: 0,
			positionY: 0,
			positionZ: 0,
			rotation: 0,
		},
	});

	const entity = await prisma.entity.create({
		data: {
			id: agent.id,
		},
	});

	const npc = await prisma.nPC.create({
		data: {
			id: entity.id,
			description: props.description || '',
			model: props.model,
			skinUrl: props.skinUrl,
		},
	});

	return { agent, entity, npc };
}

async function main() {
	// Seed Superadmin User
	const superadminPlayer = await createPlayer({
		username: 'superadmin',
		password: envConfig.ADMIN_PASSWORD,
		display: 'Super Admin',
		identifier: 'great-man-feq2',
		role: Role.ADMIN,
	});
	console.log(`Created superadmin user: ${superadminPlayer.player.username}`);

	// Seed Player 1
	const player1 = await createPlayer({
		username: 'happyman',
		password: 'password123',
		display: 'Happy Man',
		identifier: 'happy-man-x3z4',
	});
	console.log(`Created player 1 user: ${player1.player.username}`);

	// Seed Player 2
	const player2 = await createPlayer({
		username: 'foreignman',
		password: 'password123',
		display: 'Foreign Man',
		identifier: 'foreign-man-b7n8',
	});
	console.log(`Created player 2 user: ${player2.player.username}`);

	// --- Seed NPCs ---

	// Seed NPC 1
	const npc1 = await createNPC({
		display: 'Scout-Delta',
		identifier: 'scout-777',
		model: 'gpt-4.1-mini',
		skinUrl: `${envConfig.S3_URL}/${envConfig.S3_NAME}/skins/scout-777.png`,
		description: [
			'I am a scouting NPC focused on analyzing the environment.',
			'I describe only what I detect or what the engine tells me.',
			'I do not make up events, characters or places that do not exist.',
			'My objectives are: explore, report findings, remember key observations, and react logically to threats.',
			'I do not lie. If data is missing, I explicitly say that I lack the information.',
		].join(' '),
	});
}

main()
	.finally(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		process.exit(1);
	});

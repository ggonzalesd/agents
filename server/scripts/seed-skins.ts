import * as fs from 'node:fs';
import * as path from 'node:path';

import {
	CreateBucketCommand,
	HeadBucketCommand,
	PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';

import envConfig from '$/config/env.config';
import { s3ClientConfig } from '$/config/s3.config';
import * as S3Service from '$/services/s3.service';

const SKIN_PATH = path.resolve(
	import.meta.dirname,
	'../../public/3d/gordon.png',
);

const SEED_USERNAMES = ['superadmin', 'happyman', 'foreignman'];
const SEED_NPC_IDENTIFIERS = ['scout-777'];

async function ensurePublicBucket() {
	const bucketName = envConfig.S3_NAME;

	try {
		await s3ClientConfig.send(new HeadBucketCommand({ Bucket: bucketName }));
		console.log(`Bucket "${bucketName}" already exists.`);
	} catch {
		console.log(`Bucket "${bucketName}" not found, creating...`);
		await s3ClientConfig.send(new CreateBucketCommand({ Bucket: bucketName }));
		console.log(`Bucket "${bucketName}" created.`);
	}

	const policy = JSON.stringify({
		Version: '2012-10-17',
		Statement: [
			{
				Effect: 'Allow',
				Principal: '*',
				Action: ['s3:GetObject'],
				Resource: [`arn:aws:s3:::${bucketName}/*`],
			},
		],
	});

	await s3ClientConfig.send(
		new PutBucketPolicyCommand({ Bucket: bucketName, Policy: policy }),
	);
	console.log(`Bucket "${bucketName}" set to public read.`);
}

async function uploadSkins() {
	await ensurePublicBucket();

	const skinBuffer = fs.readFileSync(SKIN_PATH);

	// Upload default fallback skin
	await S3Service.uploadFile('skins/default.png', skinBuffer, 'image/png');
	console.log('Uploaded default skin -> skins/default.png');

	for (const username of SEED_USERNAMES) {
		const key = `skins/${username}.png`;
		await S3Service.uploadFile(key, skinBuffer, 'image/png');
		console.log(`Uploaded skin for player: ${username} -> ${key}`);
	}

	for (const identifier of SEED_NPC_IDENTIFIERS) {
		const key = `skins/${identifier}.png`;
		await S3Service.uploadFile(key, skinBuffer, 'image/png');
		console.log(`Uploaded skin for NPC: ${identifier} -> ${key}`);
	}

	console.log('All seed skins uploaded successfully.');
}

uploadSkins().catch((e) => {
	console.error('Failed to upload seed skins:', e);
	process.exit(1);
});

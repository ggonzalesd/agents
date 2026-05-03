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

const TEXTURES_DIR = path.resolve(
	import.meta.dirname,
	'../../public/3d/textures/entity',
);

const DEFAULT_SKIN_PATH = path.resolve(
	import.meta.dirname,
	'../../public/3d/gordon.png',
);

interface SkinMapping {
	s3Key: string;
	filePath: string;
}

const SKIN_MAPPINGS: SkinMapping[] = [
	{ s3Key: 'skins/combine.png', filePath: path.join(TEXTURES_DIR, 'combine.png') },
	{ s3Key: 'skins/spike.png', filePath: path.join(TEXTURES_DIR, 'spike.png') },
	{ s3Key: 'skins/kanye.png', filePath: path.join(TEXTURES_DIR, 'kanye.png') },
];

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

	const defaultBuffer = fs.readFileSync(DEFAULT_SKIN_PATH);

	await S3Service.uploadFile('skins/default.png', defaultBuffer, 'image/png');
	console.log('Uploaded default skin -> skins/default.png');

	for (const mapping of SKIN_MAPPINGS) {
		const buffer = fs.readFileSync(mapping.filePath);
		await S3Service.uploadFile(mapping.s3Key, buffer, 'image/png');
		console.log(`Uploaded ${path.basename(mapping.filePath)} -> ${mapping.s3Key}`);
	}

	console.log('All seed skins uploaded successfully.');
}

uploadSkins().catch((e) => {
	console.error('Failed to upload seed skins:', e);
	process.exit(1);
});

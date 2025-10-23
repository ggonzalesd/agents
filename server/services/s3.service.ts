import { Readable } from 'node:stream';
import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl as _getSignedUrl } from '@aws-sdk/s3-request-presigner';

import envConfig from '$/config/env.config';
import { s3ClientConfig } from '$/config/s3.config';

export namespace S3Service {
	const client: S3Client = s3ClientConfig;
	const bucketName = envConfig.S3_NAME;

	export const getObject = (key: string): GetObjectCommand => {
		return new GetObjectCommand({
			Bucket: bucketName,
			Key: key,
		});
	};

	export const getSignedUrl = (
		key: string,
		expiresIn?: number,
	): Promise<string> => {
		const command = getObject(key);

		return _getSignedUrl(client, command, {
			expiresIn: expiresIn ?? 3600, // Default to 1 hour if not specified
		});
	};

	export const uploadFile = async (
		key: string,
		file: Buffer,
		contentType?: string,
		metadata?: Record<string, string>,
	): Promise<void> => {
		const command = new PutObjectCommand({
			Bucket: bucketName,
			Key: key,
			Body: file,
			ContentType: contentType,
			Metadata: metadata,
		});

		await client.send(command);
	};

	export const getMetadata = async (
		key: string,
	): Promise<Record<string, any> | null> => {
		const command = getObject(key);

		const response = await client.send(command);
		return response.Metadata ?? null;
	};

	export const exists = async (key: string): Promise<boolean> => {
		try {
			const command = getObject(key);

			await client.send(command);
		} catch (error) {
			return false;
		}

		return true;
	};

	export const deleteFile = async (key: string): Promise<void> => {
		const command = new DeleteObjectCommand({
			Bucket: bucketName,
			Key: key,
		});

		await client.send(command);
	};

	export const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];

			stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
			stream.on('error', (err) => reject(err));
			stream.on('end', () => resolve(Buffer.concat(chunks)));
		});
	};

	export const getFile = async (key: string): Promise<Buffer | null> => {
		const command = getObject(key);

		const response = await client.send(command);

		if (!response.Body || !(response.Body instanceof Readable)) {
			return null;
		}

		return streamToBuffer(response.Body);
	};
}

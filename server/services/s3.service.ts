import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { s3ClientConfig } from '$/config/s3.config';
import envConfig from '$/config/env.config';

export class S3BucketAdapter {
	private readonly client: S3Client;
	private readonly bucketName;

	constructor() {
		this.client = s3ClientConfig;
		this.bucketName = envConfig.S3_NAME;
	}

	getObject(key: string): GetObjectCommand {
		return new GetObjectCommand({
			Bucket: this.bucketName,
			Key: key,
		});
	}

	getSignedUrl(key: string, expiresIn?: number): Promise<string> {
		const command = this.getObject(key);

		return getSignedUrl(this.client, command, {
			expiresIn: expiresIn ?? 3600, // Default to 1 hour if not specified
		});
	}

	async uploadFile(
		key: string,
		file: Buffer,
		contentType?: string,
		metadata?: Record<string, string>,
	): Promise<void> {
		const command = new PutObjectCommand({
			Bucket: this.bucketName,
			Key: key,
			Body: file,
			ContentType: contentType,
			Metadata: metadata,
		});

		await this.client.send(command);
	}

	async getMetadata(key: string): Promise<Record<string, any> | null> {
		const command = this.getObject(key);

		const response = await this.client.send(command);
		return response.Metadata ?? null;
	}

	async exists(key: string): Promise<boolean> {
		try {
			const command = this.getObject(key);

			await this.client.send(command);
		} catch (error) {
			return false;
		}

		return true;
	}

	async delete(key: string): Promise<void> {
		const command = new DeleteObjectCommand({
			Bucket: this.bucketName,
			Key: key,
		});

		await this.client.send(command);
	}

	async streamToBuffer(stream: ReadableStream): Promise<Buffer> {
		const chunks: Uint8Array[] = [];
		const reader = stream.getReader();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
		}

		return Buffer.concat(chunks);
	}

	async getFile(key: string): Promise<Buffer | null> {
		const command = this.getObject(key);

		const response = await this.client.send(command);

		if (!response.Body || !(response.Body instanceof ReadableStream)) {
			return null;
		}

		return this.streamToBuffer(response.Body);
	}
}

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assertObjectKey } from "./keys.ts";
import type { ObjectStorage, SignedUrlOptions, UploadUrl } from "./types.ts";

export type S3ObjectStorageOptions = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** MinIO needs path-style URLs. Defaults to true when `endpoint` is set. */
  forcePathStyle?: boolean;
};

export function createS3ObjectStorage(
  options: S3ObjectStorageOptions,
): ObjectStorage {
  const client = new S3Client({
    region: options.region,
    endpoint: options.endpoint,
    forcePathStyle: options.forcePathStyle ?? Boolean(options.endpoint),
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });
  const bucket = options.bucket;

  return {
    async createUploadUrl(
      key: string,
      contentType: string,
      urlOptions: SignedUrlOptions,
    ): Promise<UploadUrl> {
      assertObjectKey(key);
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: contentType,
        }),
        { expiresIn: urlOptions.expiresInSeconds },
      );
      return { url, method: "PUT" };
    },

    async createReadUrl(
      key: string,
      urlOptions: SignedUrlOptions,
    ): Promise<string> {
      assertObjectKey(key);
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
        { expiresIn: urlOptions.expiresInSeconds },
      );
    },

    async putObject(
      key: string,
      body: Uint8Array,
      contentType: string,
    ): Promise<void> {
      assertObjectKey(key);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },

    async deleteObject(key: string): Promise<void> {
      assertObjectKey(key);
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
    },
  };
}

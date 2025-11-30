import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const getEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
};

const client = () => {
  const region = getEnv('AWS_REGION');
  return new S3Client({
    region,
    credentials: {
      accessKeyId: getEnv('AWS_ACCESS_KEY_ID'),
      secretAccessKey: getEnv('AWS_SECRET_ACCESS_KEY'),
    },
  });
};

const publicBase = () => {
  const bucket = getEnv('S3_BUCKET_NAME');
  const region = getEnv('AWS_REGION');
  const override = process.env.S3_PUBLIC_URL_BASE;
  if (override) return override.replace(/\/$/, '');
  return `https://${bucket}.s3.${region}.amazonaws.com`;
};

export const buildObjectKey = (fileName: string, prefix = 'uploads') => {
  const safeName = fileName.toLowerCase().replace(/[^a-z0-9._-]+/gi, '-');
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${stamp}-${rand}-${safeName}`;
};

export const createPresignedUpload = async (key: string, contentType: string) => {
  const bucket = getEnv('S3_BUCKET_NAME');
  const acl = process.env.S3_UPLOAD_ACL;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ...(acl ? { ACL: acl as 'private' | 'public-read' } : {}),
  });

  const url = await getSignedUrl(client(), command, { expiresIn: 60 * 5 });
  const publicUrl = `${publicBase()}/${key}`;
  return { uploadUrl: url, key, publicUrl };
};

export const createPresignedRead = async (key: string) => {
  const bucket = getEnv('S3_BUCKET_NAME');
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const url = await getSignedUrl(client(), command, { expiresIn: 60 * 5 });
  return { downloadUrl: url, key };
};

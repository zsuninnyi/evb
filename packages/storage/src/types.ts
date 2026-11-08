export type UploadUrl = {
  url: string;
  method: "PUT";
};

export type SignedUrlOptions = {
  expiresInSeconds: number;
};

export type ObjectStorage = {
  createUploadUrl(
    key: string,
    contentType: string,
    options: SignedUrlOptions,
  ): Promise<UploadUrl>;
  createReadUrl(key: string, options: SignedUrlOptions): Promise<string>;
  putObject(key: string, body: Uint8Array, contentType: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
};

import { createReadStream, existsSync } from "fs";
import { basename } from "path";

/**
 * Uploads a file to IPFS via Pinata's pinFileToIPFS endpoint.
 *
 * @param filePath - Absolute or relative path to the image file.
 * @returns The IPFS URI in the form `ipfs://<CID>`.
 * @throws If env keys are missing, file doesn't exist, or Pinata returns non-200.
 */
export async function uploadImage(filePath: string): Promise<string> {
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!apiKey) {
    throw new Error("PINATA_API_KEY is not set");
  }
  if (!secretKey) {
    throw new Error("PINATA_SECRET_KEY is not set");
  }

  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Read file into a Blob using createReadStream (as required by spec)
  const chunks: Buffer[] = [];
  for await (const chunk of createReadStream(filePath)) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
  }
  const fileBlob = new Blob(chunks);

  // Build multipart form
  const formData = new FormData();
  formData.append("file", fileBlob, basename(filePath));

  // POST to Pinata
  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: secretKey,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Pinata upload failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { IpfsHash: string };
  return `ipfs://${data.IpfsHash}`;
}

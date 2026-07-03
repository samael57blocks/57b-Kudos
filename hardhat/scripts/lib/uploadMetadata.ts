/**
 * Uploads a metadata JSON object to IPFS via Pinata's pinJSONToIPFS endpoint.
 *
 * @param metadata - Object with name, description, image, and attributes.
 * @returns The IPFS URI in the form `ipfs://<CID>`.
 * @throws If env keys are missing, name/description empty, or Pinata returns non-200.
 */
export async function uploadMetadata(metadata: {
  name: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string }>;
}): Promise<string> {
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!apiKey) {
    throw new Error("PINATA_API_KEY is not set");
  }
  if (!secretKey) {
    throw new Error("PINATA_SECRET_KEY is not set");
  }

  if (!metadata.name) {
    throw new Error("Metadata name is required and cannot be empty");
  }
  if (!metadata.description) {
    throw new Error("Metadata description is required and cannot be empty");
  }

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: apiKey,
        pinata_secret_api_key: secretKey,
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Pinata metadata upload failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { IpfsHash: string };
  return `ipfs://${data.IpfsHash}`;
}

import { uploadMetadata } from "./lib/uploadMetadata";

/**
 * CLI entry point for uploading a metadata JSON to IPFS via Pinata.
 *
 * Usage:
 *   hardhat run scripts/uploadMetadata.ts -- '<json-string>'
 *
 * The JSON argument must be a valid JSON string with name, description,
 * image, and attributes fields.
 *
 * Prints the resulting `ipfs://<CID>` to stdout on success.
 * Exits with code 1 on error (logs to stderr).
 */
async function main(): Promise<void> {
  const jsonStr = process.argv[2];
  if (!jsonStr) {
    console.error(
      "Usage: hardhat run scripts/uploadMetadata.ts -- '<json-string>'",
    );
    process.exit(1);
  }

  let metadata: Parameters<typeof uploadMetadata>[0];
  try {
    metadata = JSON.parse(jsonStr);
  } catch {
    console.error("Error: argument must be a valid JSON string");
    process.exit(1);
  }

  const cid = await uploadMetadata(metadata);
  console.log(cid);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});

import { uploadImage } from "./lib/uploadImage";

/**
 * CLI entry point for uploading an image file to IPFS via Pinata.
 *
 * Usage:
 *   hardhat run scripts/uploadImage.ts -- <file-path>
 *
 * Prints the resulting `ipfs://<CID>` to stdout on success.
 * Exits with code 1 on error (logs to stderr).
 */
async function main(): Promise<void> {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error(
      "Usage: hardhat run scripts/uploadImage.ts -- <file-path>",
    );
    process.exit(1);
  }

  const cid = await uploadImage(filePath);
  console.log(cid);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});

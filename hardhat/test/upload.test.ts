import { expect } from "chai";
import { writeFileSync, mkdtempSync, rmSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { uploadImage } from "../scripts/lib/uploadImage";
import { uploadMetadata } from "../scripts/lib/uploadMetadata";

// ── Suite-level fetch save/restore ───────────────────────────────────

let originalFetch: typeof globalThis.fetch;

before(function () {
  originalFetch = globalThis.fetch;
});

after(function () {
  globalThis.fetch = originalFetch;
});

// ── uploadImage tests ────────────────────────────────────────────────

describe("uploadImage", function () {
  let tmpDir: string;
  let tmpFile: string;

  beforeEach(function () {
    // Create a temp file for upload tests
    tmpDir = mkdtempSync(join(tmpdir(), "upload-img-test-"));
    tmpFile = join(tmpDir, "test.png");
    // Write a minimal PNG header — enough to be a real file
    writeFileSync(tmpFile, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

    // Set env keys
    process.env.PINATA_API_KEY = "test-api-key";
    process.env.PINATA_SECRET_KEY = "test-secret-key";
  });

  afterEach(function () {
    delete process.env.PINATA_API_KEY;
    delete process.env.PINATA_SECRET_KEY;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── S1.1: Happy path ──────────────────────────────────────────────

  it("S1.1: should return ipfs://<CID> on successful Pinata 200", async function () {
    globalThis.fetch = async (_url: RequestInfo | URL, _init?: RequestInit) => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ IpfsHash: "QmTestImageCID123" }),
      } as Response;
    };

    const cid = await uploadImage(tmpFile);
    expect(cid).to.equal("ipfs://QmTestImageCID123");
  });

  // ── S1.2: File not found ──────────────────────────────────────────

  it("S1.2: should throw when file does not exist", async function () {
    try {
      await uploadImage("/definitely/not/a/valid/path.png");
      expect.fail("Expected uploadImage to throw for missing file");
    } catch (e: unknown) {
      const err = e as Error;
      expect(err.message).to.include("File not found");
    }
  });

  // ── S1.3: Pinata 5xx ──────────────────────────────────────────────

  it("S1.3: should throw when Pinata returns 5xx", async function () {
    globalThis.fetch = async (_url: RequestInfo | URL, _init?: RequestInit) => {
      return {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "server error" }),
      } as Response;
    };

    try {
      await uploadImage(tmpFile);
      expect.fail("Expected uploadImage to throw on Pinata 5xx");
    } catch (e: unknown) {
      const err = e as Error;
      expect(err.message).to.include("500");
    }
  });

  // ── S1.4: Missing env keys ────────────────────────────────────────

  it("S1.4: should throw when PINATA_API_KEY is missing", async function () {
    delete process.env.PINATA_API_KEY;

    try {
      await uploadImage(tmpFile);
      expect.fail("Expected uploadImage to throw for missing env keys");
    } catch (e: unknown) {
      const err = e as Error;
      expect(err.message).to.include("PINATA_API_KEY");
    }
  });

  it("S1.4b: should throw when PINATA_SECRET_KEY is missing", async function () {
    delete process.env.PINATA_SECRET_KEY;

    try {
      await uploadImage(tmpFile);
      expect.fail("Expected uploadImage to throw for missing env keys");
    } catch (e: unknown) {
      const err = e as Error;
      expect(err.message).to.include("PINATA_SECRET_KEY");
    }
  });
});

// ── uploadMetadata tests ────────────────────────────────────────────

describe("uploadMetadata", function () {
  beforeEach(function () {
    process.env.PINATA_API_KEY = "test-api-key";
    process.env.PINATA_SECRET_KEY = "test-secret-key";
  });

  afterEach(function () {
    delete process.env.PINATA_API_KEY;
    delete process.env.PINATA_SECRET_KEY;
  });

  // ── S2.1: Full metadata upload ────────────────────────────────────

  it("S2.1: should return ipfs://<CID> on successful metadata upload with all fields", async function () {
    globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      // Verify headers include the Pinata API keys
      const headers = init?.headers as Record<string, string>;
      expect(headers["pinata_api_key"]).to.equal("test-api-key");
      expect(headers["pinata_secret_api_key"]).to.equal("test-secret-key");

      return {
        ok: true,
        status: 200,
        json: async () => ({ IpfsHash: "QmTestMetaCID456" }),
      } as Response;
    };

    const cid = await uploadMetadata({
      name: "Test Kudos",
      description: "A test kudos badge",
      image: "ipfs://QmImg789",
      attributes: [
        { trait_type: "Value", value: "500" },
        { trait_type: "Date", value: "2026-07-02" },
        { trait_type: "Employee", value: "Dev Tester" },
      ],
    });

    expect(cid).to.equal("ipfs://QmTestMetaCID456");
  });

  // ── S2.2: Empty image field ───────────────────────────────────────

  it("S2.2: should succeed when image is empty string", async function () {
    globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      // Verify image is included in the JSON body even when empty
      const body = JSON.parse(init?.body as string);
      expect(body.image).to.equal("");

      return {
        ok: true,
        status: 200,
        json: async () => ({ IpfsHash: "QmNoImgCID" }),
      } as Response;
    };

    const cid = await uploadMetadata({
      name: "Kudos No Image",
      description: "No image attached",
      image: "",
      attributes: [],
    });

    expect(cid).to.equal("ipfs://QmNoImgCID");
  });

  // ── S2.3: Empty name throws ───────────────────────────────────────

  it("S2.3: should throw when name is empty", async function () {
    try {
      await uploadMetadata({
        name: "",
        description: "Some description",
        image: "",
        attributes: [],
      });
      expect.fail("Expected uploadMetadata to throw for empty name");
    } catch (e: unknown) {
      const err = e as Error;
      expect(err.message).to.include("name");
    }
  });

  it("S2.3b: should throw when description is empty", async function () {
    try {
      await uploadMetadata({
        name: "Some Name",
        description: "",
        image: "",
        attributes: [],
      });
      expect.fail("Expected uploadMetadata to throw for empty description");
    } catch (e: unknown) {
      const err = e as Error;
      expect(err.message).to.include("description");
    }
  });

  // ── S2.4: Pinata 401 ──────────────────────────────────────────────

  it("S2.4: should throw when Pinata returns 401", async function () {
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "invalid API key" }),
      } as Response;
    };

    try {
      await uploadMetadata({
        name: "Test",
        description: "test",
        image: "",
        attributes: [],
      });
      expect.fail("Expected uploadMetadata to throw on 401");
    } catch (e: unknown) {
      const err = e as Error;
      expect(err.message).to.include("401");
    }
  });

  // ── S2.4b: Missing env keys ──────────────────────────────────────

  it("S2.4b: should throw when PINATA_API_KEY is missing", async function () {
    delete process.env.PINATA_API_KEY;

    try {
      await uploadMetadata({
        name: "Test",
        description: "test",
        image: "",
        attributes: [],
      });
      expect.fail("Expected uploadMetadata to throw for missing env keys");
    } catch (e: unknown) {
      const err = e as Error;
      expect(err.message).to.include("PINATA_API_KEY");
    }
  });
});

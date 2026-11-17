import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("MetadataBuilder", function () {
  async function deployFixture() {
    // Deploy the library first
    const metadataBuilder = await hre.viem.deployContract("MetadataBuilder");

    // Deploy the helper with linked library
    const helper = await hre.viem.deployContract("MetadataBuilderHelper", [], {
      libraries: {
        "contracts/MetadataBuilder.sol:MetadataBuilder": metadataBuilder.address,
      },
    });

    return { helper };
  }

  describe("buildTokenURI", function () {
    it("R6: should return data URI with valid Base64 JSON for complete metadata", async function () {
      const { helper } = await loadFixture(deployFixture);

      const title = "Employee of the Month";
      const description = "Awarded for outstanding performance";
      const value = "1000";
      const date = "2024-01-15";
      const employeeName = "John Doe";

      const result = await helper.read.buildTokenURI([
        title,
        description,
        value,
        date,
        employeeName,
      ]);

      // Assert data URI prefix
      expect(result).to.match(/^data:application\/json;base64,/);

      // Decode base64 content
      const base64Part = result.replace("data:application/json;base64,", "");
      const decoded = Buffer.from(base64Part, "base64").toString("utf-8");
      const json = JSON.parse(decoded);

      // Assert JSON structure with all five fields
      expect(json).to.have.property("name", title);
      expect(json).to.have.property("description", description);
      expect(json).to.have.property("image");

      // Assert attributes array
      expect(json).to.have.property("attributes");
      expect(json.attributes).to.be.an("array");
      expect(json.attributes).to.have.lengthOf(3);

      // Assert specific attribute values
      const valueAttr = json.attributes.find(
        (a: any) => a.trait_type === "Value"
      );
      expect(valueAttr).to.exist;
      expect(valueAttr!.value).to.equal(value);

      const dateAttr = json.attributes.find(
        (a: any) => a.trait_type === "Date"
      );
      expect(dateAttr).to.exist;
      expect(dateAttr!.value).to.equal(date);

      const employeeAttr = json.attributes.find(
        (a: any) => a.trait_type === "Employee"
      );
      expect(employeeAttr).to.exist;
      expect(employeeAttr!.value).to.equal(employeeName);
    });

    it("R7: should format attributes with correct trait_type and value pairs", async function () {
      const { helper } = await loadFixture(deployFixture);

      const result = await helper.read.buildTokenURI([
        "Test Title",
        "Test Description",
        "500",
        "2024-06-01",
        "Alice",
      ]);

      const base64Part = result.replace("data:application/json;base64,", "");
      const decoded = Buffer.from(base64Part, "base64").toString("utf-8");
      const json = JSON.parse(decoded);

      // Assert attribute structure per R7 spec
      const valueAttr = json.attributes.find(
        (a: any) => a.trait_type === "Value"
      );
      expect(valueAttr).to.exist;
      expect(valueAttr!.value).to.equal("500");

      const dateAttr = json.attributes.find(
        (a: any) => a.trait_type === "Date"
      );
      expect(dateAttr).to.exist;
      expect(dateAttr!.value).to.equal("2024-06-01");
    });

    it("R8: should handle empty description without reverting", async function () {
      const { helper } = await loadFixture(deployFixture);

      const result = await helper.read.buildTokenURI([
        "Title",
        "",
        "100",
        "2024-01-01",
        "Bob",
      ]);

      // Should not revert — valid data URI
      expect(result).to.match(/^data:application\/json;base64,/);

      const base64Part = result.replace("data:application/json;base64,", "");
      const decoded = Buffer.from(base64Part, "base64").toString("utf-8");
      const json = JSON.parse(decoded);

      expect(json.description).to.equal("");
      expect(json.name).to.equal("Title");
      expect(json.attributes).to.have.lengthOf(3);
    });

    it("R8: should handle all empty strings without reverting", async function () {
      const { helper } = await loadFixture(deployFixture);

      const result = await helper.read.buildTokenURI([
        "",
        "",
        "",
        "",
        "",
      ]);

      expect(result).to.match(/^data:application\/json;base64,/);

      const base64Part = result.replace("data:application/json;base64,", "");
      const decoded = Buffer.from(base64Part, "base64").toString("utf-8");
      const json = JSON.parse(decoded);

      expect(json.name).to.equal("");
      expect(json.description).to.equal("");
      expect(json.attributes).to.have.lengthOf(3);

      // All attribute values should be empty strings
      for (const attr of json.attributes) {
        expect(attr.value).to.equal("");
      }
    });
  });
});

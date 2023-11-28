import { fetchMaster } from "../../src";
import { savedAddress, savedAppName } from "../testValues";

test("if fetchMaster() works", async () => {
  const subAccount = await fetchMaster(savedAddress, savedAppName);

  console.log(subAccount);

  //   expect(subAccount).toHaveProperty("txId");
  //   expect(subAccount).toHaveProperty("jwk");
  //   expect(subAccount).toHaveProperty("address");
}, 10000);

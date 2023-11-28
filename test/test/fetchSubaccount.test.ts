import { fetchSubaccount } from "../../src";
import { savedAddress, savedAppName } from "../testValues";

test("if fetchSubaccount() works", async () => {
  const subAccount = await fetchSubaccount(savedAddress, savedAppName);

  console.log(subAccount);

  // expect(subAccount).toHaveProperty("jwk");
  // expect(subAccount).toHaveProperty("transaction");
}, 10000);

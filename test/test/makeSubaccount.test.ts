import { savedWallet } from "../testValues";
import { makeSubaccount } from "../../src";
import { savedAddress, savedAppName } from "../testValues";

test("if makeSubaccount() works", async () => {
  const subAccount = await makeSubaccount(
    savedAddress,
    savedAppName,
    savedWallet,
  );

  expect(subAccount).toHaveProperty("jwk");
  expect(subAccount).toHaveProperty("transaction");
}, 10000);

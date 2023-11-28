import { useSubaccount } from "../../src";
import { savedWallet, savedAppName } from "../testValues";

test("if useSubaccount() works", async () => {
  const subAccount = await useSubaccount(savedAppName, savedWallet);

  console.log(subAccount.address);

  expect(subAccount).toHaveProperty("txId");
  expect(subAccount).toHaveProperty("jwk");
  expect(subAccount).toHaveProperty("address");
}, 10000);

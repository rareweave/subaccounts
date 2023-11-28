import { decrypt } from "../../src";
import { savedWallet } from "../testValues";

test("if decrypt() works", async () => {
  const subAccount = await decrypt("Data", savedWallet);

  console.log(subAccount);

  //   expect(subAccount).toHaveProperty("txId");
  //   expect(subAccount).toHaveProperty("jwk");
  //   expect(subAccount).toHaveProperty("address");
}, 10000);

import { arweave } from "../utils/arweave";
import { fetchSubaccount } from "./fetchSubaccount";
import { post } from "../utils/post";
import { decrypt } from "./decrypt";
import { makeSubaccount } from "./makeSubaccount";
import { useSubaccount } from "../../types/Subaccount/useSubaccount";

export async function useSubaccount(
  app: string,
  wallet: any,
): Promise<useSubaccount> {
  let subaccount;
  let pubkey = wallet.n ? wallet.n : await wallet.getActivePublicKey();
  let existingSubaccount = await fetchSubaccount(
    await arweave.wallets.ownerToAddress(pubkey),
    app,
  );
  if (existingSubaccount) {
    let sadata = await fetch(
      "https://arweave.net/" + existingSubaccount.txId,
    ).then((res) => res.json());
    subaccount = {
      txId: existingSubaccount.txId,
      jwk: await decrypt(sadata, wallet),
      address: existingSubaccount.address,
    };
  } else {
    let newSubaccount = await makeSubaccount(
      await arweave.wallets.ownerToAddress(pubkey),
      app,
      wallet,
    );
    await post(newSubaccount.transaction, wallet);
    subaccount = {
      txId: newSubaccount.transaction.id,
      jwk: newSubaccount.jwk,
      address: await arweave.wallets.jwkToAddress(newSubaccount.jwk),
    };
  }
  return subaccount;
}

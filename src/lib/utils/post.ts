import Transaction from "arweave/node/lib/transaction";
import { arweave } from "./arweave";

export async function post(tx: Transaction, wallet: any): Promise<any> {
  if (typeof window === "undefined") {
    await arweave.transactions.sign(tx, wallet.p ? wallet : "use_wallet");
    let post = await arweave.transactions.post(tx);

    return post;
  } else {
    let dispatch = await wallet.dispatch(tx);

    return dispatch;
  }
}

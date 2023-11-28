import { JWKInterface } from "arweave/node/lib/wallet";
import Transaction from "arweave/node/lib/transaction";

export interface makeSubaccount {
  jwk: JWKInterface;
  transaction: Transaction;
}

import { JWKInterface } from "arweave/node/lib/wallet";

export interface useSubaccount {
  txId: string;
  jwk: JWKInterface;
  address: string;
}

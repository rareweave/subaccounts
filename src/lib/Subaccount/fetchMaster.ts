import { arweave } from "../utils/arweave";
import { fetchMaster } from "../../types/Subaccount/fetchMaster";

export async function fetchMaster(
  address: string,
  app: string,
): Promise<fetchMaster | null> {
  try {
    const response = await fetch("https://arweave.net/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query {
            transactions(
              tags: [
                {name: "Address", values: ["${address}"]}
                {name: "Protocol", values: ["Subaccounts-v1.1","Subaccounts-v1","Subaccounts"]}
                {name: "App", values: ["${app}"]}
              ]
              sort: HEIGHT_DESC, first: 1) {
              edges {
                node {
                  id
                  owner {
                    address
                    key
                  }
                  tags {
                    name
                    value
                  }
                }
              }
            }
          }`,
      }),
    });

    const search = await response.json();
    const data = search?.data?.transactions?.edges[0];

    if (!data) {
      return null;
    }
    let pubkey = data.node.tags.find(
      (t: { name: string; value: string }) => t.name == "Pubkey",
    )?.value;
    if (!pubkey || !(await arweave.wallets.ownerToAddress(pubkey))) {
      return null;
    }
    const body = await (
      await fetch(`https://arweave.net/${data.node.id}`)
    ).json();
    const isVerified = await arweave.crypto.verify(
      pubkey,
      new TextEncoder().encode(data.node.owner.address),
      arweave.utils.b64UrlToBuffer(body.signature),
    );

    return isVerified
      ? { address: data.node.owner.address, pubkey: data.node.owner.key }
      : null;
  } catch (error) {
    throw new Error(`${error}`);
  }
}

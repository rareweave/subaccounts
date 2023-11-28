import { fetchSubaccount } from "../../types/Subaccount/fetchSubaccount";

export async function fetchSubaccount(
  address: string,
  app: string,
): Promise<fetchSubaccount | null> {
  let subaccountTx = await fetch("https://arweave.net/graphql", {
    method: `POST`,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query {
                          transactions(sort:HEIGHT_DESC,owners:["${address}"], 
                          tags:[{ name: "Protocol", values: ["Subaccounts-v1.1"] },{name:"App",values:["${app}"]}], first:1) {
                              edges {
                                  node {
                                      id
                                      tags {
                                          name
                                          value
                              }
                          }
                      }
                  }
              }`,
    }),
  })
    .then((res) => res.json())
    .catch((e) => null);

  let subaccountTxMeta = subaccountTx?.data?.transactions?.edges[0];
  if (!subaccountTxMeta) {
    return null;
  } else {
    let subaccountTxId = subaccountTxMeta?.node?.id;
    let subaccountTxTags = subaccountTxMeta?.node?.tags;
    return {
      txId: subaccountTxId,
      address: subaccountTxTags.find(
        (tag: { name: string; value: string }) => tag.name == "Address",
      )?.value,
      pubkey: subaccountTxTags.find(
        (tag: { name: string; value: string }) => tag.name == "Pubkey",
      )?.value,
      app: subaccountTxTags.find(
        (tag: { name: string; value: string }) => tag.name == "App",
      )?.value,
    };
  }
}

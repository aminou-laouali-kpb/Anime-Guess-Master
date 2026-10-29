import { createServer, type Server } from "http";
import type { AddressInfo } from "net";
import { generateKeyPairSync, sign, type KeyObject } from "crypto";

// A stand-in for Google's verifier-keys.json, with keys generated for the
// test, and a signer that produces callbacks exactly like AdMob's.

export interface FakeAdmob {
  url: string;
  keyId: string;
  requests: number;
  /** Builds the query string AdMob would send, signed with the test key. */
  signedQuery(params: Record<string, string>, opts?: { keyId?: string; privateKey?: KeyObject }): string;
  close(): Promise<void>;
}

export async function startFakeAdmob(keyId = "1234567890"): Promise<FakeAdmob> {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const base64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");
  const state = { requests: 0 };
  const server: Server = createServer((_req, res) => {
    state.requests += 1;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ keys: [{ keyId: Number(keyId), pem, base64 }] }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/verifier-keys.json`,
    keyId,
    get requests() {
      return state.requests;
    },
    signedQuery(params, opts = {}) {
      // AdMob order: signed parameters first, then signature and key_id.
      const content = new URLSearchParams(params).toString();
      const signature = sign("sha256", Buffer.from(content), { key: opts.privateKey ?? privateKey, dsaEncoding: "der" });
      return `${content}&signature=${signature.toString("base64url")}&key_id=${opts.keyId ?? keyId}`;
    },
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

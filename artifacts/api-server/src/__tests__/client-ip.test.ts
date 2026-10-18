import { describe, expect, it } from "vitest";
import type { IncomingMessage } from "http";
import { clientIp } from "../lib/rate-limit";

const request = (xff?: string, remote = "10.0.0.2") =>
  ({
    headers: xff === undefined ? {} : { "x-forwarded-for": xff },
    socket: { remoteAddress: remote },
  }) as unknown as IncomingMessage;

describe("clientIp (X-Forwarded-For)", () => {
  it("uses the address the proxy appended", () => {
    expect(clientIp(request("203.0.113.7"))).toBe("203.0.113.7");
  });

  it("ignores entries forged by the client on the left", () => {
    expect(clientIp(request("1.2.3.4, 203.0.113.7"))).toBe("203.0.113.7");
    expect(clientIp(request("9.9.9.9, 8.8.8.8, 203.0.113.7"))).toBe("203.0.113.7");
  });

  it("skips private addresses added by internal hops", () => {
    expect(clientIp(request("1.2.3.4, 203.0.113.7, 10.1.2.3"))).toBe("203.0.113.7");
    expect(clientIp(request("10.9.9.9, 203.0.113.7"))).toBe("203.0.113.7");
  });

  it("handles IPv6", () => {
    expect(clientIp(request("2001:db8::5"))).toBe("2001:db8::5");
  });

  it("falls back to the socket address without the header", () => {
    expect(clientIp(request(undefined))).toBe("10.0.0.2");
    expect(clientIp(request(""))).toBe("10.0.0.2");
  });
});

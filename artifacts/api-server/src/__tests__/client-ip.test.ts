import { describe, expect, it } from "vitest";
import type { IncomingMessage } from "http";
import { clientIp, networkKey } from "../lib/rate-limit";

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

describe("networkKey (what per-address limits count)", () => {
  it("keeps IPv4 addresses exact", () => {
    expect(networkKey("203.0.113.7")).toBe("203.0.113.7");
    expect(networkKey("203.0.113.8")).not.toBe(networkKey("203.0.113.7"));
  });

  it("groups IPv6 addresses by their /64 prefix", () => {
    const key = networkKey("2001:db8:1:2:aaaa:bbbb:cccc:dddd");
    expect(key).toBe("2001:db8:1:2::/64");
    expect(networkKey("2001:db8:1:2::1")).toBe(key);
    expect(networkKey("2001:0DB8:0001:0002:ffff:0:0:1")).toBe(key);
    expect(networkKey("2001:db8:1:3::1")).not.toBe(key);
  });

  it("expands :: wherever it appears", () => {
    expect(networkKey("2001:db8::5")).toBe("2001:db8:0:0::/64");
    expect(networkKey("::1")).toBe("0:0:0:0::/64");
    expect(networkKey("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
    expect(networkKey("[2001:db8:1:2::9]")).toBe("2001:db8:1:2::/64");
  });

  it("treats IPv4-mapped IPv6 addresses as the IPv4 address they carry", () => {
    expect(networkKey("::ffff:1.2.3.4")).toBe("1.2.3.4");
    expect(networkKey("::FFFF:1.2.3.4")).toBe("1.2.3.4");
    expect(networkKey("::ffff:102:304")).toBe("1.2.3.4");
    expect(networkKey("0:0:0:0:0:ffff:1.2.3.4")).toBe("1.2.3.4");
  });

  it("leaves anything that isn't an IP alone", () => {
    expect(networkKey("unknown")).toBe("unknown");
    expect(networkKey("")).toBe("");
  });
});

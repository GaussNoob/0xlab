import { describe, expect, it } from "vitest";
import { buildNetworkTrace, formatPacketHex, NETWORK_PRESETS } from "./network-simulator";

describe("network educational simulator", () => {
  it("builds a complete TCP lifecycle with inspectable packet layers", () => {
    const trace = buildNetworkTrace({ ...NETWORK_PRESETS[0]!.config });
    const syn = trace.events.find((event) => event.phase === "SYN")?.packet;

    expect(trace.protocol).toBe("TCP");
    expect(trace.events.map((event) => event.phase)).toEqual(expect.arrayContaining(["SOCKET", "SYN", "SYN-ACK", "ACK", "DATA", "RESPONSE", "FIN", "CLOSE"]));
    expect(trace.events.at(-1)?.clientState).toBe("CLOSED");
    expect(syn?.flags).toEqual(["SYN"]);
    expect(syn?.layers.map((layer) => layer.protocol)).toEqual(["HTTP/1.1", "TCP", "IPv4", "Ethernet II"]);
    expect(syn?.checksumStatus).toBe("not-calculated");
  });

  it("uses UDP datagrams without inventing a TCP handshake for DNS", () => {
    const trace = buildNetworkTrace({ ...NETWORK_PRESETS.find((preset) => preset.id === "dns")!.config });
    const packets = trace.events.flatMap((event) => event.packet ? [event.packet] : []);

    expect(trace.protocol).toBe("UDP");
    expect(trace.events.some((event) => event.phase === "SYN")).toBe(false);
    expect(packets).toHaveLength(2);
    expect(packets.every((packet) => packet.layers[1]?.protocol === "UDP")).toBe(true);
  });

  it("segments a custom TCP payload according to the modeled MSS", () => {
    const preset = NETWORK_PRESETS.find((item) => item.id === "echo")!;
    const trace = buildNetworkTrace({ ...preset.config, mtu: 576, payload: "x".repeat(1_200) });
    const dataEvents = trace.events.filter((event) => event.phase.startsWith("DATA"));

    expect(trace.mss).toBe(536);
    expect(dataEvents).toHaveLength(3);
    expect(dataEvents.map((event) => event.packet?.payloadBytes)).toEqual([536, 536, 128]);
  });

  it("models ICMP without ports and changes the trace fingerprint after edits", () => {
    const preset = NETWORK_PRESETS.find((item) => item.id === "icmp")!;
    const first = buildNetworkTrace({ ...preset.config });
    const edited = buildNetworkTrace({ ...preset.config, payload: "changed payload" });
    const request = first.events.find((event) => event.phase === "ECHO REQUEST")?.packet;

    expect(first.protocol).toBe("ICMP");
    expect(request?.source).toBe(preset.config.clientIp);
    expect(request?.destination).toBe(preset.config.serverIp);
    expect(first.fingerprint).not.toBe(edited.fingerprint);
  });

  it("formats deterministic bytes as offset, hex and ASCII", () => {
    expect(formatPacketHex([0x48, 0x69, 0x00], 2)).toEqual([
      "0000  48 69  Hi",
      "0002  00     ."
    ]);
  });
});

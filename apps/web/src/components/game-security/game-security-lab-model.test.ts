import { describe, expect, it } from "vitest";
import {
  aimSample,
  buildPacket,
  checkAntiCheat,
  encodePlayer,
  integrityHash,
  PLAYER_OFFSETS,
  worldToScreen
} from "./game-security-lab-model";

const origin = { x: 0, y: 1.2, z: 0 };
const target = { x: 0, y: 1.2, z: 6 };

describe("game security lab educational models", () => {
  it("packs Player with documented offsets", () => {
    const bytes = encodePlayer({ position: { x: 1, y: 2, z: 3 }, health: 80, armor: 10 });
    const view = new DataView(bytes.buffer);
    expect(view.getFloat32(PLAYER_OFFSETS.x, true)).toBeCloseTo(1);
    expect(view.getInt32(PLAYER_OFFSETS.health, true)).toBe(80);
    expect(bytes.byteLength).toBe(20);
  });

  it("changes the full-struct integrity hash when position is poked", () => {
    const healthy = { position: origin, health: 100, armor: 0 };
    const teleported = { position: { x: 40, y: 1.2, z: 0 }, health: 100, armor: 0 };
    expect(integrityHash(healthy, "health-only")).toBe(integrityHash(teleported, "health-only"));
    expect(integrityHash(healthy, "full-struct")).not.toBe(integrityHash(teleported, "full-struct"));
  });

  it("projects a point in front of the camera and rejects points behind it", () => {
    const camera = { x: 0, y: 1.6, z: -4 };
    const front = worldToScreen(target, camera, 0, 320, 180);
    expect(front.visible).toBe(true);
    expect(front.clipW).toBeGreaterThan(0.12);
    const behind = worldToScreen({ x: 0, y: 1.2, z: -8 }, camera, 0, 320, 180);
    expect(behind.visible).toBe(false);
  });

  it("computes aim distance and blocks LoS when an obstacle sits on the ray", () => {
    const clear = aimSample(origin, target, 0);
    expect(clear.distance).toBeCloseTo(6);
    const blocked = aimSample(origin, target, 3);
    expect(blocked.los).toBe(false);
  });

  it("lets naive AC miss a teleport and strong AC catch it", () => {
    const prev = { health: 100, x: 0, y: 0, dt: 1 / 30, hadInput: true };
    const now = { health: 100, x: 40, y: 0, dt: 1 / 30, hadInput: true };
    expect(checkAntiCheat(prev, now, false).verdict).toBe("Ok");
    expect(checkAntiCheat(prev, now, true).verdict).toBe("SpeedHack");
  });

  it("rejects lab packets with impossible displacement or bad sequence", () => {
    const prev = { x: 0, y: 0, z: 0 };
    const honest = buildPacket(1, "MOVE", "x=0.4,z=0.1", 0, prev);
    expect(honest.accepted).toBe(true);
    const teleport = buildPacket(1, "MOVE", "x=99,z=0", 0, prev);
    expect(teleport.accepted).toBe(false);
    expect(teleport.reason).toMatch(/sanity/);
    const replay = buildPacket(0, "MOVE", "x=0.1,z=0", 0, prev);
    expect(replay.accepted).toBe(false);
    expect(replay.reason).toMatch(/sequence/);
  });
});

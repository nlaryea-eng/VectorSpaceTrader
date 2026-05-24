export type MissionId = string & { __brand: "MissionId" };

export function createMissionId(version: number, value: bigint): MissionId {
  const hex = value.toString(16).padStart(16, "0");
  return `m${version}:${hex}` as MissionId;
}

export function parseMissionId(id: string): { version: number; value: bigint } {
  const match = id.match(/^m(\d+):([0-9a-f]{16})$/i);
  if (!match) {
    throw new Error(`Invalid mission ID format: ${id}`);
  }
  return {
    version: parseInt(match[1], 10),
    value: BigInt(`0x${match[2]}`)
  };
}

export function isValidMissionId(id: string): id is MissionId {
  return /^m(\d+):([0-9a-f]{16})$/i.test(id);
}

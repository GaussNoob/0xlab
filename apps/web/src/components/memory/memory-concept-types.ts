export type MemoryRegion = "stack" | "heap" | "metadata";
export type BlockState = "active" | "changed" | "freed" | "danger" | "padding" | "unreachable";

export interface MemoryBlock {
  readonly id: string;
  readonly region: MemoryRegion;
  readonly label: string;
  readonly address: string;
  readonly size: string;
  readonly value: string;
  readonly state: BlockState;
}

export interface MemoryLink {
  readonly from: string;
  readonly to: string;
  readonly label: string;
  readonly state?: "valid" | "dangling";
}

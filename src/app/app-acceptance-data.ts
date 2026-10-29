import type { ToolcraftComponentAcceptance } from "./acceptance/types";
import { printAcceptance } from "../print/print-acceptance";
import { printReadiness, printSectionInventory, printTransferMode } from "../print/print-inventory";

export const appTransferMode = printTransferMode;

export const appProductReadiness = printReadiness;

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = printAcceptance;

// Product entries use the same explicit stable section IDs as appSchema.
export const appControlSectionInventory = printSectionInventory;

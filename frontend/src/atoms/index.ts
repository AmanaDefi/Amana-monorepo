import { atom } from "jotai";

export * from "./tokens";

export const valueStorageAtom = atom<bigint>(BigInt(0));
export const loadingProgressAtom = atom<number>(0);

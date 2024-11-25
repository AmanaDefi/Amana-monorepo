import { atom } from "jotai";
import { TokenByAddress } from "@/types/types";
export const tokensAtom = atom<{ [key: number]: TokenByAddress }>({})

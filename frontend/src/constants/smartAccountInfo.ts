export enum IconPaths {
  PASSKEY = "/passkey.png",
  EMAIL = "/email.png",
  SMART = "/smart.png",
}


export type SmartAccountInfo = {
  img: IconPaths;
  title: string;
  list: string[];
}

export const smartAccountInfo: SmartAccountInfo[] = [
  {
    img: IconPaths.PASSKEY,
    title: "PASSKEY LOGIN (Preferred)",
    list: [
      "One-tap access",
      "No passwords or seed phrases",
      "Works with Face ID / biometrics",
      "Safer than passwords",
    ],
  },
  {
    img: IconPaths.EMAIL,
    title: "ALSO SUPPORTED",
    list: [
      "Email",
      "Google",
      "Social logins",
      "Smart account is created automatically",
    ],
  },
  {
    img: IconPaths.SMART,
    title: 'WHY "SMART"?',
    list: [
      "Batch actions in one click",
      "Auto deposits & withdrawals",
      "Easy recovery",
      "Pay gas in any token — or none",
    ],
  },
];

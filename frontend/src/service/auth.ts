export const mockSendOtp = async (email: string) => {
  await new Promise((res) => setTimeout(res, 1000));
  if (email === "fail@test.com") throw new Error("Failed to send OTP");
  return true;
};

export const mockVerifyOtp = async (code: string) => {
  await new Promise((res) => setTimeout(res, 1000));
  if (code !== "123456") throw new Error("The wrong code");
  return {
    address: "0xMockUserAddress123",
  };
};

export const mockImportWallet = async (seedPhrase: string) => {
  await new Promise((res) => setTimeout(res, 1000));
  if (seedPhrase !== "correct seed phrase")
    throw new Error("Invalid seed phrase");
  return {
    address: "0xImportedUserAddress456",
  };
};

import { VaultData } from "@/types/types";

interface WithdrawalNoticeProps {
  vault: VaultData;
}

const WithdrawalNotice = ({ vault }: WithdrawalNoticeProps) => {
  const cooldownDays = vault.cooldownPeriod || 0;
  
  // Only show notice if there's a cooldown period
  if (cooldownDays === 0) {
    return null;
  }

  return (
    <div className="bg-transparent md:bg-[#161C27] py-0 md:py-[15px] px-0 md:px-[17px] text-[12px] rounded-lg mt-6">
      <p className="max-w-[347px] md:max-w-[359px] text-[#CFD1D4]">
        ⚠️  Notice: This vault uses a {cooldownDays}-day withdrawal request.<br/>
        After you submit
        an Unstake Request, you must wait {cooldownDays} days before you cam claim your
        funds.
      </p>
    </div>
  );
};

export default WithdrawalNotice;
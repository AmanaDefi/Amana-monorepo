const WithdrawalNotice = ({}) => {
  return (
    <div className="bg-transparent md:bg-[#161C27] py-0 md:py-[15px] px-0 md:px-[17px] text-[12px] rounded-lg mt-6">
      <p className="max-w-[349px] text-[#CFD1D4]">
        ⚠️ Notice: This vault uses a 7-day withdrawal request.After you submit an
        Unstake Request, you must wait 7 days before you cam claim your
        funds.
      </p>
    </div>
  );
};

export default WithdrawalNotice;
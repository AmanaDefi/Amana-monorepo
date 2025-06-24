import ErrorInputIcon from "@/components/svg/ErrorInputIcon";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";

const ConnectWallet = () => {
  const handleWalletInfoClick = () => {
    window.open("https://blog.thirdweb.com/web3-wallet/", "_blank");
  };

  return (
    <div className="flex flex-col font-gotham">
      <div className="flex flex-row gap-6 mb-[41px]">
        <AmanaLogo width={78} height={55} className="w-[78px] h-[55px]" />
        <h1 className="text-[34px] font-bold">AMANA</h1>
      </div>
      <div className="flex flex-col gap-6 mb-8">
        <span className="text-white text-[18px] font-bold">
          Connect your wallet
        </span>
        <p className="text-white text-[16px] w-[320px]">
          Connecting your wallet is like &ldquo;logging in&rdquo; to Web3.
          Select your wallet from the options to get started
        </p>
      </div>
      <button
        onClick={handleWalletInfoClick}
        className="text-[#3E73C4] text-[16px] underline font-normal flex items-center gap-1"
      >
        I DON&apos;T HAVE A WALLET
        <ErrorInputIcon width={16} height={17} className="fill-[#3E73C4]" />
      </button>
    </div>
  );
};

export default ConnectWallet;

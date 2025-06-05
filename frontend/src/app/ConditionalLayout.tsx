import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/header";
import { useMultiChain } from "@/providers/MultiChainProvider";

const ConditionalLayout = ({ children }: { children: React.ReactNode }) => {
  const { walletAddress } = useMultiChain();
  const isConnected = !!walletAddress;

  if (isConnected) {
    return (
      <div className="flex flex-col mx-auto w-full max-w-[1512px] pt-[60px] pb-[30px]">
        <Header />
        <div className="flex flex-1">
          <div className="flex-shrink-0">
            <Sidebar />
          </div>
          <div className="flex-1 ml-6">{children}</div>
        </div>
        <Footer isConnected={isConnected} />
      </div>
    );
  }
  return (
    <div className="flex flex-col flex-1 mx-auto w-full max-w-[1360px] py-[40px]">
      <Header />
      <div className="flex-1 ml-16">{children}</div>
      <Footer isConnected={isConnected} />
    </div>
  );
};
export default ConditionalLayout;

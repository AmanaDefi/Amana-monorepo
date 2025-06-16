import ProfileInfo from "./components/ProfileInfo";
import PortfolioTabs from "./components/Tabs";
import TopTokens from "./components/TopTokens";


const DashboardWrapper = () => {
  return (
    <div className="font-gotham">
      <div className="text-white text-[40px] font-bold mb-8">
        <h2>Dashboard</h2>
      </div>

      <div className="mb-[45px]">
        <ProfileInfo />
      </div>

      <div><TopTokens /></div>

      <div className="mt-[82px]">
        <PortfolioTabs />
      </div>
    </div>
  );
};

export default DashboardWrapper;

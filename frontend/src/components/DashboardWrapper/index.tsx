import ProfileInfo from "./components/ProfileInfo";
import PortfolioTabs from "./components/Tabs";


const DashboardWrapper = () => {
  return (
    <div className="font-gotham">
      <div className="text-white text-[40px] font-bold mb-8">
        <h2>Dashboard</h2>
      </div>

      <div className="mb-8">
        <ProfileInfo />
      </div>

      <div className="mt-8">
        <PortfolioTabs />
      </div>
    </div>
  );
};

export default DashboardWrapper;

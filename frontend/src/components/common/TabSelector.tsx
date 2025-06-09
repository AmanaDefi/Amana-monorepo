interface TabSelectorProps {
  activeTab: any;
  setActiveTab: Function;
  availableTabs: any[];
  className?: string;
}

export default function TabSelector({
  activeTab,
  setActiveTab,
  availableTabs,
  className,
}: TabSelectorProps): JSX.Element {
  return (
    <div className={`w-[384px] mx-auto flex flex-row justify-center bg-[#0C1015] rounded-lg p-1 ${className}`}>
      {availableTabs.map((tab) => (
        <button
          key={tab}
          className={`w-1/2 py-3 px-4 rounded-lg text-base font-normal text-center transition-all duration-200 border ${
            activeTab === tab
              ? "bg-[#1B46E0] text-white border-transparent shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]"
              : "bg-transparent text-white border-transparent hover:border-[#3E73C4]"
          }`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

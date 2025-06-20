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
    <div
      className={`max-w-[326px] md:max-w-[384px] mx-auto flex flex-row justify-center bg-[#0C1015] rounded-lg p-1 gap-1 md:gap-10 mb-6 md:mb-10 ${className}`}
    >
      {availableTabs.map((tab) => (
        <button
          key={tab}
          className={`w-1/2 py-3 px-4 max-h-10 rounded-lg text-base font-normal flex items-center justify-center transition-all duration-200 border ${
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

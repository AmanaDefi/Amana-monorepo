type ModalButtonProps = {
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
};

const ModalButton = ({
  onClick,
  label = "Smart Wallet",
  icon,
}: ModalButtonProps) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 border border-[#3E73C4] bg-[#161C27] 
               rounded-[8px] pl-4 pr-[25px] py-4 text-white text-[16px] 
               font-bold hover:bg-[#3E73C4]/10 transition w-[240px] h-[80px]"
  >
    <div className="flex justify-center items-center rounded-[8px] bg-[#14171F] border border-[#3E73C4] p-2">
      {icon}
    </div>
    <span className="text-[18px]">{label}</span>
  </button>
);
export default ModalButton;
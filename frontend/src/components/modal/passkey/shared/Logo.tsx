import AmanaLogo from "@public/logo/amanadefi/logo.svg";
interface LogoProps {}

const Logo = ({}: LogoProps) => {
  return (
    <div>
          <AmanaLogo width={78} height={55} className="w-[65px] h-[46px]" />
          <span className="font-[32px]">AMANA</span>
    </div>
  );
};
export default Logo;

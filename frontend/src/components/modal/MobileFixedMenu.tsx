import { menuItems } from "@/constants/sidebarMenu";
import React from "react";

interface LinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Link: React.FC<LinkProps> = ({ href, children, className, onClick }) => (
  <a href={href} className={className} onClick={onClick}>
    {children}
  </a>
);

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  type: "button" | "link";
  href: string;
}

const MobileBottomMenu: React.FC = () => {
  const [activeItem, setActiveItem] = React.useState<string>("earn");

  const handleItemClick = (itemId: string): void => {
    setActiveItem(itemId);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border border-[#3E3C59] font-gotham"
      style={{
        backgroundColor: "#14171F",
        borderRadius: "16px 16px 0 0",
        height: "90px",
      }}
    >
      <div className="flex items-center justify-around h-full px-4">
        {menuItems.map((item: MenuItem) => {
          const IconComponent = item.icon;
          const isActive = activeItem === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => handleItemClick(item.id)}
              className="flex flex-col items-center justify-center space-y-1 transition-colors duration-200 text-white"
            >
              <IconComponent
                className={`transition-transform duration-200 w-5 h-5 ${
                  isActive ? "scale-110 text-[#1B46E0]" : "scale-100"
                }`}
              />
              <span className="text-xs font-normal">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomMenu;

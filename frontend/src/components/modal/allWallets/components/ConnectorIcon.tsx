import React, { useState, useEffect } from "react";

import SmartWalletIcon from "@/components/svg/SmartWalletIcon";
import MetaMaskIcon from "@/components/svg/MetaMaskIcon";
import WalletConnectIcon from "@/components/svg/WalletConnectIcon";
import PhantomIcon from "@/components/svg/PhantomIcon";
import CoinbaseWalletIcon from "@/components/svg/CoinbaseWalletIcon";
import OKXWalletIcon from "@/components/svg/OKXWalletIcon";
import UniswapIcon from "@/components/svg/UniswapIcon";

interface ConnectorIconProps {
  connectorIcon?: string;
  connectorId: string;
  name: string;
}

export const ConnectorIcon = ({
  connectorIcon,
  connectorId,
  name,
}: ConnectorIconProps) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (connectorIcon) {
      setImageError(false);
    }
  }, [connectorIcon]);

  const handleImageError = () => {
    setImageError(true);
  };
  if (connectorIcon && !imageError) {
    return (
      <img
        src={connectorIcon}
        height={30}
        alt={name}
        onError={handleImageError}
      />
    );
  }

  switch (connectorId) {
    case "walletConnect": {
      return <WalletConnectIcon width={24} height={16} />;
    }
    case "io.metamask":
      return <MetaMaskIcon width={35} height={32} />;
    case "app.phantom":
      return <PhantomIcon width={24} height={20} />;
    case "com.coinbase.wallet":
      return <CoinbaseWalletIcon width={24} height={24} />;
    case "org.uniswap.app":
      return <UniswapIcon width={24} height={24} />;
    case "om.okex.wallet":
      return <OKXWalletIcon width={24} height={24} />;
    default:
      return <SmartWalletIcon width={24} height={24} />;
  }
};

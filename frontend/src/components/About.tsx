import React from "react";

const About: React.FC = ({}) => {
  return (
    <div className="mt-8 px-4 md:px-8 lg:px-16 text-gray-100">
      <h1 className="text-4xl font-bold text-center mb-8">
        Amana DeFi Yield Aggregator
      </h1>

      <p className="text-lg text-center mb-8">
        Simplifying Your DeFi Investments
      </p>

      <p className="mb-6">
        Amana is a next-generation decentralized finance (DeFi) yield aggregator designed to optimize and simplify the process of earning yield on your crypto assets. By leveraging advanced strategies and a multi-chain infrastructure, Amana ensures that your investments generate the highest possible returns, all while minimizing the complexity of managing assets across multiple DeFi platforms.
      </p>

      <h2 className="text-2xl font-semibold mb-4">How Amana Works:</h2>

      <h3 className="text-xl font-medium mb-2">Automated Yield Optimization</h3>
      <p className="mb-4">
        Amana continuously seeks out the best yield opportunities across various DeFi protocols and chains. When you deposit assets into one of Amana’s vaults, they are automatically allocated to strategies that generate the highest returns, whether it’s through lending, liquidity provision, or staking.
      </p>

      {/* <h3 className="text-xl font-medium mb-2">Modular Strategies</h3>
      <p className="mb-4">
        Amana employs a modular strategy framework, allowing for flexibility and scalability. Each vault is connected to a specific strategy or set of strategies. These strategies are managed by the protocol and are constantly updated to adapt to new yield opportunities. For instance, if a better yield becomes available on another platform, the strategy can switch assets to optimize returns.
      </p> */}

      {/* <h3 className="text-xl font-medium mb-2">ERC-4626 Standard Vaults</h3>
      <p className="mb-4">
        Amana utilizes the ERC-4626 tokenized vault standard, which streamlines the deposit and withdrawal process. When users deposit assets into an Amana vault, they receive yield-bearing tokens in return. These tokens represent a share of the vault’s assets and can be redeemed at any time, along with accrued interest or rewards.
      </p> */}

      {/* <h3 className="text-xl font-medium mb-2">Seamless Multi-Chain Access</h3>
      <p className="mb-4">
        Amana supports yield aggregation across multiple blockchains, giving users access to the best yield opportunities across Ethereum, Polygon, Base, and other chains. By using cross-chain protocols, Amana can seamlessly move assets between networks, ensuring that you always have access to the highest yields regardless of where they are.
      </p> */}

      {/* <h3 className="text-xl font-medium mb-2">Governance and Treasury Management</h3>
      <p className="mb-4">
        Amana is governed by its community of token holders through a decentralized governance framework. Governance participants can vote on protocol upgrades, new strategies, and reward distribution. The protocol also includes a Treasury contract that collects performance and management fees from the vaults, which can then be used to fund future development or distributed to the community through governance decisions.
      </p> */}

      {/* <h3 className="text-xl font-medium mb-2">Rewards and Incentives</h3>
      <p className="mb-4">
        Amana incentivizes its users by offering rewards in the form of native tokens. These rewards are distributed to users who stake their vault tokens or participate in governance. Additionally, the Rewards contract ensures fair and transparent distribution based on the user’s contribution to the protocol.
      </p> */}

      <h3 className="text-xl font-medium mb-2">Security and Audits</h3>
      <p className="mb-4">
        Amana prioritizes security by employing best practices in smart contract development, including regular audits and thorough testing. The platform is built with transparency in mind, allowing users to review and audit the protocol’s smart contracts at any time.
      </p>

      <h2 className="text-2xl font-semibold mb-4">How to Use Amana:</h2>

      <h3 className="text-xl font-medium mb-2">Fund your Smart Account</h3>
      <p className="mb-4">
        When you logged in for the first time, a new smart account was generated for you. You can see the wallet address and balance in the top right hand corner of the screen. This Smart
        Account is a special type of wallet that allows you to make 1-click, gas-free transactions. You can fund your Smart Account by depositing assets from your existing wallet or by purchasing tokens directly through Amana.
      </p>

      <h3 className="text-xl font-medium mb-2">Deposit Assets</h3>
      <p className="mb-4">
        Choose a vault based on your preferred asset (e.g., ETH, USDC) and deposit your tokens. You’ll receive yield-bearing tokens representing your share of the vault.
      </p>

      <h3 className="text-xl font-medium mb-2">Earn Yield</h3>
      <p className="mb-4">
        Your assets will be automatically allocated to the highest-yield strategies available. Amana manages everything in the background, allowing you to passively earn yield.
      </p>

      <h3 className="text-xl font-medium mb-2">Withdraw Anytime</h3>
      <p className="mb-4">
        Redeem your vault tokens at any time to withdraw your assets along with any earned yield.
      </p>

      {/* <p className="mt-8 text-lg">
        Amana makes it easy for anyone to participate in DeFi, automating the yield-earning process while providing transparency, flexibility, and security. Whether you're a novice investor or a DeFi veteran, Amana takes the complexity out of DeFi, allowing you to focus on what matters most—maximizing your returns.
      </p> */}
    </div>
  );
};

export default About;

"use client";

import React, { useState, useEffect } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client } from "../utils/client";
import VaultsContainer from "../containers/VaultsContainer";
import VaultsDetailContainer from "../containers/VaultsDetailContainer";
import BuyContainer from "../containers/BuyContainer";
import About from "../components/About";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { ZC_USDC_ETH_ADDRESS, ZC_TEST_ETH_BASESEPOLIA_ADDRESS } from "../../../constants";
import mixpanel from "mixpanel-browser";
import Footer from "../components/Footer";
import { Account } from "thirdweb/wallets";
import { ACCOUNT_ABSTRACTION_CONFIG } from "../constants/chainConfig";

const wallets = [
  inAppWallet({
    auth: {
      options: ["google", "email", "passkey"],
    },
    // smartAccount: ACCOUNT_ABSTRACTION_CONFIG,
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("com.trustwallet.app"),
  createWallet("com.ledger"),
  createWallet("global.safe"),
];

interface FeatureCardProps {
  title: React.ReactNode; // Change from string to React.ReactNode to allow JSX
  description: string;
}

interface AuthenticatedAppProps {
  account: Account;
  activeSection: string;
  setActiveSection: (value: string) => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description }) => (
  <div className="p-6 bg-white shadow-lg rounded-lg">
    <h3 className="text-xl font-bold text-gray-800">{title}</h3> {/* Changed to text-gray-800 */}
    <p className="mt-2 text-gray-600">{description}</p>
  </div>
);


export default function Page() {
  const account = useActiveAccount();
  const [activeSection, setActiveSection] = useState("vaults");

  useEffect(() => {
    mixpanel.init("1f01d05893463c7ba9d4ac7280821010", {
      debug: true,
      track_pageview: true,
      persistence: "localStorage",
    });

    mixpanel.track("Page Viewed", {
      page: "Landing Page",
      section: activeSection,
    });
  }, []);

  useEffect(() => {
    if (account) {
      mixpanel.identify(account.address);
      mixpanel.people.set({
        wallet_address: account.address,
      });
    }
  }, [account]);

  return (
    <main className="p-4 pb-10 min-h-screen flex flex-col container mx-auto relative overflow-hidden">
      {account ? (
        <>
          <AuthenticatedApp account={account} activeSection={activeSection} setActiveSection={setActiveSection} />
          {/* <Footer /> */}
        </>
      ) : (
        <UnauthenticatedLandingPage />
      )}
    </main>
  );
}

function AuthenticatedApp({ account, activeSection, setActiveSection }: AuthenticatedAppProps) {
  return (
    <div className="flex flex-row h-screen">
      {/* Sidebar */}
      <nav className="w-1/6 bg-gray-800 text-white p-6 flex flex-col justify-start h-full">
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tighter text-zinc-100">Amana</h1>
          </div>
          <ul className="space-y-4">
            <li
              className={`cursor-pointer ${activeSection === "vaults" ? "font-bold" : ""
                }`}
              onClick={() => setActiveSection("vaults")}
            >
              Vaults
            </li>
            <li
              className={`cursor-pointer ${activeSection === "buy" ? "font-bold" : ""
                }`}
              onClick={() => setActiveSection("buy")}
            >
              Fund Wallet
            </li>
            <li
              className={`cursor-pointer ${activeSection === "about" ? "font-bold" : ""
                }`}
              onClick={() => setActiveSection("about")}
            >
              About
            </li>
          </ul>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-between py-20 pl-6">
        <div className="flex-1">
          {activeSection === "vaults" && <VaultsContainer setActiveSection={setActiveSection} />}
          {activeSection === "vaultsDetail" && <VaultsDetailContainer setActiveSection={setActiveSection} />}
          {activeSection === "buy" && <BuyContainer />}
          {activeSection === "about" && <About />}
        </div>

        {/* Footer aligned with the main content */}
        <Footer />
      </div>

      {/* Connect Button at the top-right */}
      <div className="absolute top-5 right-5">
        <ConnectButton
          client={client}
          chains={SUPPORTED_CHAINS}
          wallets={wallets}
          connectModal={{ size: "compact" }}
          // accountAbstraction={ACCOUNT_ABSTRACTION_CONFIG}
          detailsButton={{
            displayBalanceToken: {
              [7001]: ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
            },
          }}
        />
      </div>
    </div>
  );
}

// Component for unauthenticated users - full landing page
function UnauthenticatedLandingPage() {
  return (
    <>
      <header className="flex justify-between items-center py-6">
        <div className="text-2xl font-bold">Amana</div>
        <nav className="flex space-x-4">
          <ConnectButton
            client={client}
            chains={SUPPORTED_CHAINS}
            wallets={wallets}
            connectButton={{ label: "Launch App" }}
            connectModal={{ size: "compact" }}
          // accountAbstraction={ACCOUNT_ABSTRACTION_CONFIG}
          />
        </nav>
      </header>

      <section className="py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold">Earn Yield Effortlessly Across Any Chain</h1>
        <p className="mt-4 text-lg text-zinc-400">
        Put your crypto assets to work with Amana, the most powerful, omnichain platform for on-chain yield. Earn passive income on your crypto, with easy, 1-click transactions—regardless of the blockchain you're on.
        </p>
      </section>

      <section className="py-20 text-center bg-zinc-100">
        <h2 className="text-xl md:text-3xl font-bold tracking-tight text-zinc-800">Amana by the Numbers</h2>
        <div className="flex justify-around mt-8">
          <div>
            <h3 className="text-2xl font-italic text-zinc-800">Coming soon</h3>
            <p className="text-lg text-zinc-600">Total Volume Locked</p>
          </div>
          <div>
            <h3 className="text-2xl font-italic text-zinc-800">Coming soon</h3>
            <p className="text-lg text-zinc-600">Total Yield Generated</p>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-800">Base</h3>
            <p className="text-lg text-zinc-600">Chains Connected</p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <h2 className="text-3xl font-bold text-center">Omnichain Yield, Made Simple</h2>
        <p className="text-lg text-center mt-4 text-zinc-400">
        With Amana, it doesn’t matter which chain you start from or where you want to invest. Using Zetachain's Universal EVM, we make yield opportunities accessible across all major blockchains, including Ethereum, Base, Polygon, BNB, Solana, Ton, and many more. One click is all it takes.        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mt-8">
          <FeatureCard title="Earn Across Any Chain" description="Access high APY yield opportunities across a range of chains without worrying about bridging, swapping, or complex steps." />
          <FeatureCard title="Gasless Transactions" description="Benefit from gasless, 1-click transactions made possible through smart accounts. No fees, no hassle—just simple, effective yield." />
          <FeatureCard title="Security & Transparency" description="Our platform is non-custodial and fully transparent, ensuring your assets remain under your control." />
          <FeatureCard title="Multiple sign-in options" description="Sign in with your email, SSO, or passkey - have non-custodial control without the hassle factor" />
        </div>
      </section>

      <section className="py-20">
        <h2 className="text-3xl font-bold text-center">Supported Chains and Protocols</h2>
        <p className="text-lg text-center mt-4 text-zinc-400">
          Amana integrates with the best yield-generating protocols across all major blockchains, making it the most versatile and powerful tool for putting your crypto to work.
        </p>
        <div className="flex justify-center mt-8">
          <img
            src="/Amana_chains.jpg"
            alt="Supported Chains and Protocols"
            className="w-full max-w-3xl"
          />
        </div>
      </section>


      <section className="py-20">
        <h2 className="text-3xl font-bold text-center">Sign In, Your Way</h2>
        <p className="text-lg text-center mt-4 text-zinc-400">
        Multiple sign-in options—use email, SSO, or passkey. Gain non-custodial control without the hassle of crypto wallet management.
        </p>
        <div className="flex justify-center mt-8">
          <img
            src="/signin_options.jpg"
            alt="Sign-in options"
            className="w-full max-w-3xl"
          />
        </div>
      </section>

      <section className="py-20">
        <h2 className="text-3xl font-bold text-center">Backed by</h2>
        <div className="flex justify-center items-center gap-8 mt-8">
          <img
            src="/thirdweb_logo.jpg"
            alt="Thirdweb"
            className="w-1/3 max-w-xs"
          />
          <img
            src="/ZetaChain.webp"
            alt="Zetachain"
            className="w-1/3 max-w-xs"
          />
        </div>
      </section>


      <Footer />
    </>
  );
}

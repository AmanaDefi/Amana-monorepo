import Button from "@/components/common/Button";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";
import InvestmentStarIcon from "@/components/svg/InvestmentStar";
import { formatTokenBalance } from "@/utils/utils";
import { motion } from "framer-motion";

interface YourInvestmentProps {
  depositAmount: string;
  vaultTokenSymbol: string;
  depositUSDValue: number;
}

const YourInvestment = ({
  depositAmount,
  vaultTokenSymbol,
  depositUSDValue,
}: YourInvestmentProps) => {
  const formattedDepositAmount = formatTokenBalance(
    depositAmount,
    vaultTokenSymbol,
  );

  return (
    <div className="bg-[#14171F] rounded-2xl py-[22px] px-[42px] lg:py-6 lg:px-[50px] border border-[#2A2D36] flex flex-row items-center justify-start lg:justify-between ">
      <div className="hidden md:block mr-6">
        <motion.div
          className="rounded-lg w-14 h-14 hidden md:flex items-center justify-center relative bg-[#0C1015]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 0 30px rgba(59, 130, 246, 0.4)",
          }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-blue-500/15 to-transparent rounded-lg"
            animate={{
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="absolute z-10"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
              y: [0, -2, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            whileHover={{ scale: 1.2, transition: { duration: 0.3 } }}
          >
            <InvestmentStarIcon width={31} height={31} />
          </motion.div>

          <motion.div
            className="absolute top-8 right-1.5 z-20"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 15, -10, 0],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            whileHover={{ scale: 1.3, rotate: 20 }}
          >
            <InvestmentStarIcon width={11} height={12} />
          </motion.div>

          <motion.div
            className="absolute bottom-2 left-8 z-20"
            animate={{
              scale: [1, 1.15, 1],
              rotate: [0, -8, 8, 0],
              x: [0, 1, -1, 0],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            whileHover={{ scale: 1.25, x: -2 }}
          >
            <InvestmentStarIcon width={9} height={9} />
          </motion.div>

          <motion.div
            className="absolute -top-1 -right-1.5 z-30"
            style={{ rotate: -33 }}
            animate={{
              scale: [1, 1.18, 1],
              rotate: [-33, -25, -40, -33],
            }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5,
            }}
            whileHover={{ scale: 1.3, rotate: -15 }}
          >
            <InvestmentStarIcon width={11} height={12} />
          </motion.div>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`absolute w-0.5 h-0.5 bg-blue-400 rounded-full opacity-60 ${i === 1 ? "z-5" : "z-20"}`}
              style={{
                top: `${25 + i * 18}%`,
                left: `${35 + i * 15}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>
      </div>

      <div className="w-full lg:max-w-[324px]">
        <div className="flex flex-col gap-2">
          <p className="text-lg font-bold">Your Investment</p>
          <p className="text-[24px] font-medium">
            ${formattedDepositAmount} {vaultTokenSymbol}
          </p>
          <p className="flex flex-row gap-1 text-[#3E73C4] items-center text-xs lg:text-base whitespace-nowrap">
            <ErrorInputIcon width={14} height={15} className="fill-[#1B46E0]" />
            Points Earned: 0 Aegis Points
          </p>
        </div>
        <Button
          variant="custom"
          disabled={true}
          className="!w-full !h-10 !mt-[23px] !max-w-[274px] !lg:max-w-[294px]"
        >
          Claim
        </Button>
      </div>
    </div>
  );
};

export default YourInvestment;

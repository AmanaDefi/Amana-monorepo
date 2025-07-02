import { Balance } from "@/types/types";

export const NumberFormatter = Intl.NumberFormat("en", {
  notation: "compact",
});

export const EMPTY_BALANCE: Balance = {
  value: BigInt(0),
  formatted: "0",
  formattedUSD: "0"
}

// // Helper function to get points information
// const getPointsInfo = (protocolName: string) => {
//   switch (protocolName) {
//     case 'Aegis':
//       return {
//         points: '15 pts/$/day',
//         nativeYield: 'Aegis native yield',
//         displayPoints: true
//       };
//     case 'YieldFi':
//       return {
//         points: '7 pts/$/day',
//         nativeYield: 'Aave native yield',
//         displayPoints: true
//       };
//     default:
//       return {
//         points: '',
//         nativeYield: '',
//         displayPoints: false
//       };
//   }
// };

// Helper function to get points information for vault protocols
export const getPointsInfo = (protocolName: string) => {
  switch (protocolName) {
    case 'Fluid':
      return {
        points: '15 pts/$/day',
        nativeYield: 'Fluid native yield',
        displayPoints: true
      };
    case 'ZeroLend':
      return {
        points: '12 pts/$/day',
        nativeYield: 'ZeroLend native yield',
        displayPoints: true
      };
    case 'Curve-Convex':
      return {
        points: '8 pts/$/day',
        nativeYield: 'Curve-Convex native yield',
        displayPoints: true
      };
    case 'Compound':
      return {
        points: '10 pts/$/day',
        nativeYield: 'Compound native yield',
        displayPoints: true
      };
    case 'Aave':
      return {
        points: '7 pts/$/day',
        nativeYield: 'Aave native yield',
        displayPoints: true
      };
    default:
      return {
        points: '',
        nativeYield: '',
        displayPoints: false
      };
  }
};
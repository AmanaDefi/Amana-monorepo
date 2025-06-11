import {Contract, ethers} from 'ethers';
import {isValidEvmAddress} from './isValidEvmAddress';

export function getContract(
  address: string,
  ABI: ethers.Interface | ethers.InterfaceAbi,
  provider: ethers.Signer | ethers.Provider
): Contract {
  if (!isValidEvmAddress(address)) {
    throw Error(`Invalid 'address' parameter '${address}'. `);
  }

  return new ethers.Contract(address, ABI, provider);
}

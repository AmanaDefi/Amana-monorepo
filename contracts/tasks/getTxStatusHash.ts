import { task } from "hardhat/config";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";

task("hash", "Compute keccak256 hash of a string and return bytes32")
  .addParam("input", "The input string to hash")
  .setAction(async (taskArgs, hre) => {
    const input = taskArgs.input;
    const hash = keccak256(toUtf8Bytes(input));
    console.log(`keccak256("${input}") = ${hash}`);
  });

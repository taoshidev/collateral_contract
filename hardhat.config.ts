import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import { config as dotenvConfig } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

dotenvConfig();

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    local: {
      url: "http://127.0.0.1:9944",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
    mainnet: {
      url: "https://lite.chain.opentensor.ai",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
    testnet: {
      url: "https://test.chain.opentensor.ai",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
  },
  solidity: "0.8.30",
};

export default config;

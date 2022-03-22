import { asyncForEach, impersonateAccount } from "../../test/testUtils"

import { DeployFunction } from "hardhat-deploy/types"
import { GenericERC20 } from "../../build/typechain/GenericERC20"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import dotenv from "dotenv"
import { ethers } from "hardhat"
import { isMainnet } from "../../utils/network"
import path from "path"

dotenv.config()

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { log } = deployments
  const { deployer } = await getNamedAccounts()

  // These addresses are for large holders of the given token (used in forked mainnet testing)
  const tokenToAccountsMap: Record<string, string[]> = {
    DAI: ["0xa5407eae9ba41422680e2e00537571bcc53efbfd"],
    USDC: ["0xa5407eae9ba41422680e2e00537571bcc53efbfd"],
    USDT: ["0xa5407eae9ba41422680e2e00537571bcc53efbfd"]
  }

  if (
    isMainnet(await getChainId()) &&
    process.env.FORK_MAINNET === "true" &&
    process.env.FUND_FORK_MAINNET === "true"
  ) {
    for (const [tokenName, holders] of Object.entries(tokenToAccountsMap)) {
      const contract = (await ethers.getContract(tokenName)) as GenericERC20

      await asyncForEach(holders, async (holder) => {
        const balance = await contract.balanceOf(holder)
        await ethers.provider.send("hardhat_setBalance", [
          holder,
          `0x${(1e18).toString(16)}`,
        ])
        await contract
          .connect(await impersonateAccount(holder))
          .transfer(deployer, await contract.balanceOf(holder))
        log(
          `Sent ${ethers.utils.formatUnits(
            balance,
            await contract.decimals(),
          )} ${tokenName} from ${holder} to ${deployer}`,
        )
      })
    }
  } else {
    log(`skipping ${path.basename(__filename)}`)
  }
}

export default func
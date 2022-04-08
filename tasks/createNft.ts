import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";

const contract_name = 'HFTMarketPlace'
const prefix = contract_name + '_'

task(prefix + "mint", "Create a new NFT")
    .addParam("address", "Contract address")
    .addParam("tokenURI", "tokenURI")
    .addParam("owner", "owner")
    .setAction(async (taskArgs, hre) => {
        const [acc1] = await hre.ethers.getSigners()
        const factory = await hre.ethers.getContractFactory(contract_name);
        const contract = await factory.attach(taskArgs.address)
        await contract.connect(acc1).createItem(taskArgs.tokenURI, taskArgs.owner)
    });

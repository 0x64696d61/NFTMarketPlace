import { ethers } from "hardhat";

const contract_name='HFTMarketPlace'
const usdcToken='0x3d225f9C3A34Af1342e1FaFaa2B5543128bb7Efd'

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const factory = await ethers.getContractFactory(contract_name);
    const contract = await factory.deploy(usdcToken);
    await contract.deployed();

    console.log("Contract deployed to:", contract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
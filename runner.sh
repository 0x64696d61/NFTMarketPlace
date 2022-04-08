#/bin/bash

addr=$(npx hardhat run scripts/deploy.ts --network localhost | grep -E 'Contract deployed' | awk '{print $4}')
echo $addr
npx hardhat myStakingHouse_stake --address $addr --amount 10 --network localhost
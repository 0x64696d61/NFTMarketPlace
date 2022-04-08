import {expect} from "chai";
import {ethers, network} from "hardhat";

const contractName = "HFTMarketPlace"

describe(contractName, function () {
    const tokenUrl = 'xxx.xx'
    const tokenId = 1
    const nftPrice = 50
    const bidAmount = nftPrice + 1
    const auctionFrozenTime = 3 * 24 * 3600

    let acc1: any
    let acc2: any
    let nftMarketPlace: any
    let contractNft: any
    let contractUsdc: any

    beforeEach(async function () {

        [acc1, acc2] = await ethers.getSigners()

        let factory = await ethers.getContractFactory("myUSDC", acc2)
        contractUsdc = await factory.deploy();

        factory = await ethers.getContractFactory(contractName, acc1)
        nftMarketPlace = await factory.deploy(contractUsdc.address);

        factory = await ethers.getContractFactory("myTokenERC721", acc1)
        contractNft = await factory.attach(nftMarketPlace.nftToken());

        await nftMarketPlace.createItem(tokenUrl, acc1.address)
        await contractUsdc.connect(acc2).approve(nftMarketPlace.address, (bidAmount * 2) + 1)
        await contractUsdc.connect(acc2).transfer(acc1.address, ((bidAmount * 2) + 1))
        await contractUsdc.connect(acc1).approve(nftMarketPlace.address, (bidAmount * 2) + 1)
        await contractNft.connect(acc1).approve(nftMarketPlace.address, tokenId)
    })

    it("Should be deployed", async function () {
        expect(nftMarketPlace.address).to.be.properAddress
    })

    describe("createItem method", function () {
        it("Should be possible create new NFT", async function () {
            expect(await contractNft.ownerOf(tokenId)).to.be.equal(acc1.address)
        })
        it("Should be possible set image url for NFT", async function () {
            expect(await contractNft.tokenURI(tokenId)).to.be.equal(tokenUrl)
        })
    })

    describe("listItem method", function () {
        it("Should be possible set NFT for sale", async function () {
            await nftMarketPlace.listItem(tokenId, nftPrice)

            let element = await nftMarketPlace.onSale(tokenId)
            expect(element.price).to.be.equal(nftPrice)
        })

    })

    describe("cancel method", function () {
        it("Should be possible remove from sale", async function () {
            await nftMarketPlace.listItem(tokenId, nftPrice)
            await nftMarketPlace.cancel(tokenId)
            let element = await nftMarketPlace.onSale(tokenId)

            await expect(element.owner).to.be.eq(ethers.constants.AddressZero)
        })
        it("Only owner can be cancel NFT from sale ", async function () {
            await expect(nftMarketPlace.connect(acc2).cancel(tokenId)).to.be.revertedWith("Permission denied")
        })
    })

    describe("buyItem method", function () {
        let usdcBalanceBefore: any

        beforeEach(async function () {
            usdcBalanceBefore = await contractUsdc.balanceOf(acc2.address)

            await nftMarketPlace.listItem(tokenId, nftPrice)
            await nftMarketPlace.connect(acc2).buyItem(tokenId)
        })

        it("NFT owner must be changed", async function () {
            expect(await contractNft.ownerOf(tokenId)).to.be.equal(acc2.address)
        })
        it("Payment must be deducted", async function () {
            expect(await contractUsdc.balanceOf(acc2.address)).to.be.equal(usdcBalanceBefore - nftPrice)
        })
        it("No have approve permission", async function () {
            expect(await contractNft.getApproved(tokenId)).to.be.equal(ethers.constants.AddressZero)
        })
    })

    describe("listItemOnAuction method", function () {
        it("Should be hold NFT on contract address", async function () {
            await nftMarketPlace.listItemOnAuction(tokenId, nftPrice)

            expect(await contractNft.ownerOf(tokenId)).to.be.equal(nftMarketPlace.address)
        })
    })

    describe("makeBid method", function () {
        let usdcBalanceBefore: any

        beforeEach(async function () {
            usdcBalanceBefore = await contractUsdc.balanceOf(acc2.address)
            await nftMarketPlace.listItemOnAuction(tokenId, nftPrice)
        })

        it("Should be possible set bid on Auction", async function () {
            await nftMarketPlace.connect(acc2).makeBid(tokenId, bidAmount)
            let element = await nftMarketPlace.onSale(tokenId)
            expect(element.price).to.be.equal(bidAmount)
        })

        it("Should be revert if bid less min price", async function () {
            await expect(nftMarketPlace.connect(acc2).makeBid(tokenId, nftPrice - 1)).to.be.revertedWith("Please set price more")
        })
        it("Balance of payer should be changed", async function () {
            await nftMarketPlace.connect(acc2).makeBid(tokenId, bidAmount)

            expect(await contractUsdc.balanceOf(acc2.address)).to.be.equal(usdcBalanceBefore - nftPrice - 1)
        })
        it("Contract should be hold usdc after bid", async function () {
            await nftMarketPlace.connect(acc2).makeBid(tokenId, bidAmount)

            await expect(await contractUsdc.balanceOf(nftMarketPlace.address)).to.be.equal(bidAmount)
        })
        it("Contract should be return the money to the previous bidder", async function () {
            await nftMarketPlace.connect(acc2).makeBid(tokenId, bidAmount)
            await nftMarketPlace.connect(acc1).makeBid(tokenId, bidAmount + 1)

            await expect(await contractUsdc.balanceOf(acc2.address)).to.be.equal(usdcBalanceBefore)
        })
    })

    describe("finishAuction method", function () {
        let usdcBalanceBefore: any

        beforeEach(async function () {
            usdcBalanceBefore = await contractUsdc.balanceOf(acc2.address)
            await nftMarketPlace.listItemOnAuction(tokenId, nftPrice)
            await nftMarketPlace.connect(acc2).makeBid(tokenId, bidAmount)
        })

        it("Should be revert if try finish auction before FrozenTime", async function () {
            expect(nftMarketPlace.connect(acc2).finishAuction(tokenId)).to.be.revertedWith("It's too soon. Try later")
        })
        it("Should be possible finish auction after FrozenTime", async function () {
            await network.provider.send("evm_increaseTime", [auctionFrozenTime])
            await nftMarketPlace.connect(acc2).finishAuction(tokenId)
            let element = await nftMarketPlace.onSale(tokenId)

            expect(element.startTime).to.be.eq(0)
        })
        it("If bidders was less then two bid must be returned", async function () {
            await network.provider.send("evm_increaseTime", [auctionFrozenTime])
            await nftMarketPlace.finishAuction(tokenId)

            expect(await contractUsdc.balanceOf(acc2.address)).to.be.eq(usdcBalanceBefore)
        })
        it("If bidders was less then two NFT must be returned", async function () {
            await network.provider.send("evm_increaseTime", [auctionFrozenTime])
            await nftMarketPlace.finishAuction(tokenId)

            expect(await contractNft.ownerOf(tokenId)).to.be.eq(acc1.address)
        })
        it("If bidders was more then two last bidder must get NFT", async function () {
            await nftMarketPlace.makeBid(tokenId, bidAmount + 1)
            await network.provider.send("evm_increaseTime", [auctionFrozenTime])
            await nftMarketPlace.finishAuction(tokenId)

            expect(await contractNft.ownerOf(tokenId)).to.be.eq(acc1.address)
        })

    })
});

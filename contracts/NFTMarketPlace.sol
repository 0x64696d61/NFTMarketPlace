// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./myTokenERC721.sol";
// import "hardhat/console.sol";

contract HFTMarketPlace is Ownable {
    myTokenERC721 public nftToken;
    IERC20 private _usdcToken;
    uint private auctionFrozenTime = 3 days;

    struct Item {
        uint price;
        uint startTime;
        address lastBidderAddress;
        address owner;
        uint bidsCounter;
    }

    mapping(uint => Item) public onSale;

    constructor(address usdcTokenAddress) {
        _usdcToken = IERC20(usdcTokenAddress);
        nftToken = new myTokenERC721();
    }

    function createItem(string memory tokenURI, address owner) external returns (uint256)
    {
        uint256 newItemId;

        newItemId = nftToken.mint(owner, tokenURI);
        return newItemId;
    }

    function listItem(uint tokenId, uint price) external
    {
        nftToken.transferFrom(msg.sender, address(this), tokenId);
        onSale[tokenId].owner = msg.sender;
        onSale[tokenId].price = price;
    }

    function cancel(uint tokenId) external
    {
        require(msg.sender == onSale[tokenId].owner, "Permission denied");

        delete (onSale[tokenId]);
        nftToken.transferFrom(address(this), msg.sender, tokenId);
    }

    function buyItem(uint tokenId) external
    {
        uint price = onSale[tokenId].price;
        delete (onSale[tokenId]);

        _usdcToken.transferFrom(msg.sender, nftToken.ownerOf(tokenId), price);
        nftToken.transferFrom(nftToken.ownerOf(tokenId), msg.sender, tokenId);
    }

    function listItemOnAuction(uint tokenId, uint minPrice) external
    {
        nftToken.transferFrom(msg.sender, address(this), tokenId);
        onSale[tokenId].owner = msg.sender;
        onSale[tokenId].price = minPrice;
        onSale[tokenId].startTime = block.timestamp;
    }


    function makeBid(uint tokenId, uint price) external
    {
        require(price > onSale[tokenId].price, "Please set price more");

        _usdcToken.transferFrom(msg.sender, address(this), price);
        if (onSale[tokenId].bidsCounter > 0)
            _usdcToken.transfer(onSale[tokenId].lastBidderAddress, onSale[tokenId].price);
        onSale[tokenId].lastBidderAddress = msg.sender;
        onSale[tokenId].price = price;
        onSale[tokenId].bidsCounter += 1;
    }

    function finishAuction(uint tokenId) external
    {
        require(block.timestamp >= onSale[tokenId].startTime + auctionFrozenTime, "It's too soon. Try later");

        if (onSale[tokenId].bidsCounter > 1)
            closeAuction(onSale[tokenId].lastBidderAddress, onSale[tokenId].owner, tokenId);
        else
            closeAuction(onSale[tokenId].owner, onSale[tokenId].lastBidderAddress, tokenId);
    }

    function closeAuction(address nftOwner, address usdcOwner, uint tokenId) private
    {
        uint price = onSale[tokenId].price;
        delete (onSale[tokenId]);

        nftToken.safeTransferFrom(address(this), nftOwner, tokenId);
        _usdcToken.transfer(usdcOwner, price);
    }

}
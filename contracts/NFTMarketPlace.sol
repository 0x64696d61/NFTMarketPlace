// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./myTokenERC721.sol";
// import "hardhat/console.sol";

contract HFTMarketPlace is Ownable {
    myTokenERC721 public nftToken;
    IERC20 private _usdcToken;
    uint private auctionFrozenTime = 3 days;

    struct Item {
        uint price;
        address owner;
    }
    struct AuctionItem {
        uint price;
        uint startTime;
        uint bidsCounter;
        address lastBidderAddress;
        address owner;
    }

    mapping(uint => Item) public onSale;
    mapping(uint => AuctionItem) public onAuction;

    event newItem(uint256 tokenId, uint256 price);
    event newBid(uint256 tokenId, uint256 price);
    event newAuction(uint256 tokenId, uint256 minPrice);
    event finishAuction(uint256 tokenId);

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
        emit newItem(tokenId, price);
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
        onAuction[tokenId].owner = msg.sender;
        onAuction[tokenId].price = minPrice;
        onAuction[tokenId].startTime = block.timestamp;
        emit newAuction(tokenId, minPrice);
    }


    function makeBid(uint tokenId, uint price) external
    {
        require(price > onAuction[tokenId].price, "Please set price more");

        _usdcToken.transferFrom(msg.sender, address(this), price);
        if (onAuction[tokenId].bidsCounter > 0)
            _usdcToken.transfer(onAuction[tokenId].lastBidderAddress, onAuction[tokenId].price);
        onAuction[tokenId].lastBidderAddress = msg.sender;
        onAuction[tokenId].price = price;
        onAuction[tokenId].bidsCounter += 1;
        emit newBid(tokenId, price);
    }

    function finishAuction(uint tokenId) external
    {
        require(block.timestamp >= onAuction[tokenId].startTime + auctionFrozenTime, "It's too soon. Try later");

        if (onAuction[tokenId].bidsCounter > 1)
            closeAuction(onAuction[tokenId].lastBidderAddress, onAuction[tokenId].owner, tokenId);
        else
            closeAuction(onAuction[tokenId].owner, onAuction[tokenId].lastBidderAddress, tokenId);
    }

    function closeAuction(address nftOwner, address usdcOwner, uint tokenId) private
    {
        uint price = onAuction[tokenId].price;
        delete (onAuction[tokenId]);

        nftToken.safeTransferFrom(address(this), nftOwner, tokenId);
        _usdcToken.transfer(usdcOwner, price);
        emit finishAuction(tokenId);
    }

}
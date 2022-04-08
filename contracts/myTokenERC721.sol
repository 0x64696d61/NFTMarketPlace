// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract myTokenERC721 is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter public tokenIds;

    constructor() ERC721("My first ERC721 NFT contract", "MFT") {}

    function mint(address owner, string memory tokenURI) external onlyOwner() returns (uint256)
    {
        tokenIds.increment();
        uint256 newItemId = tokenIds.current();

        _mint(owner, newItemId);
        _setTokenURI(newItemId, tokenURI);
        return newItemId;
    }
}
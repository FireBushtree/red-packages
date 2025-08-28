// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract RedPacket {
    struct RedPacketInfo {
        address creator;
        uint256 totalAmount;
        uint256 remainingAmount;
        uint256 remainingPackets;
        uint256 createdAt;
        mapping(address => bool) claimed;
        uint256[] amounts;
        address[] claimers;
    }

    mapping(uint256 => RedPacketInfo) public redPackets;
    uint256 public nextPacketId;

    event RedPacketCreated(uint256 indexed packetId, address indexed creator, uint256 totalAmount, uint256 packetCount);
    event RedPacketClaimed(uint256 indexed packetId, address indexed claimer, uint256 amount);

    function createRedPacket() external payable returns (uint256) {
        require(msg.value == 0.0001 ether, "Must send exactly 0.0001 ETH");

        uint256 packetId = nextPacketId++;
        RedPacketInfo storage packet = redPackets[packetId];

        packet.creator = msg.sender;
        packet.totalAmount = msg.value;
        packet.remainingAmount = msg.value;
        packet.remainingPackets = 5;
        packet.createdAt = block.timestamp;

        packet.amounts = _splitAmount(msg.value, 5);

        emit RedPacketCreated(packetId, msg.sender, msg.value, 5);
        return packetId;
    }

    function claimRedPacket(uint256 packetId) external {
        RedPacketInfo storage packet = redPackets[packetId];

        require(packet.totalAmount > 0, "Red packet does not exist");
        require(packet.remainingPackets > 0, "No packets remaining");
        require(!packet.claimed[msg.sender], "Already claimed");
        require(msg.sender != packet.creator, "Creator cannot claim own packet");

        packet.claimed[msg.sender] = true;

        uint256 claimIndex = 5 - packet.remainingPackets;
        uint256 amount = packet.amounts[claimIndex];

        packet.remainingAmount -= amount;
        packet.remainingPackets--;
        packet.claimers.push(msg.sender);

        payable(msg.sender).transfer(amount);

        emit RedPacketClaimed(packetId, msg.sender, amount);
    }

    function getRedPacketInfo(uint256 packetId) external view returns (
        address creator,
        uint256 totalAmount,
        uint256 remainingAmount,
        uint256 remainingPackets,
        uint256 createdAt,
        address[] memory claimers
    ) {
        RedPacketInfo storage packet = redPackets[packetId];
        return (
            packet.creator,
            packet.totalAmount,
            packet.remainingAmount,
            packet.remainingPackets,
            packet.createdAt,
            packet.claimers
        );
    }

    function hasClaimedRedPacket(uint256 packetId, address user) external view returns (bool) {
        return redPackets[packetId].claimed[user];
    }

    function getRedPacketAmounts(uint256 packetId) external view returns (uint256[] memory) {
        return redPackets[packetId].amounts;
    }

    function _splitAmount(uint256 totalAmount, uint256 packetCount) private view returns (uint256[] memory) {
        uint256[] memory amounts = new uint256[](packetCount);
        uint256 remaining = totalAmount;

        for (uint256 i = 0; i < packetCount - 1; i++) {
            uint256 maxAmount = (remaining * 2) / (packetCount - i);
            uint256 minAmount = 1;

            uint256 randomAmount = _random(maxAmount - minAmount + 1) + minAmount;
            if (randomAmount > remaining - (packetCount - i - 1)) {
                randomAmount = remaining - (packetCount - i - 1);
            }

            amounts[i] = randomAmount;
            remaining -= randomAmount;
        }

        amounts[packetCount - 1] = remaining;

        return amounts;
    }

    function _random(uint256 max) private view returns (uint256) {
        if (max == 0) return 0;
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            msg.sender,
            nextPacketId
        ))) % max;
    }
}
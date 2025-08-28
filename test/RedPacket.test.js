const RedPacket = artifacts.require("RedPacket");
const truffleAssert = require('truffle-assertions');

contract("RedPacket", (accounts) => {
    let redPacketInstance;
    const creator = accounts[0];
    const claimer1 = accounts[1];
    const claimer2 = accounts[2];
    const claimer3 = accounts[3];
    const claimer4 = accounts[4];
    const claimer5 = accounts[5];

    const REQUIRED_AMOUNT = web3.utils.toWei("0.0001", "ether");

    beforeEach(async () => {
        redPacketInstance = await RedPacket.new();
    });

    describe("Red Packet Creation", () => {
        it("should create a red packet with exactly 0.0001 ETH", async () => {
            const result = await redPacketInstance.createRedPacket({
                from: creator,
                value: REQUIRED_AMOUNT
            });

            truffleAssert.eventEmitted(result, 'RedPacketCreated', (ev) => {
                return ev.packetId.toString() === "0" &&
                       ev.creator === creator &&
                       ev.totalAmount.toString() === REQUIRED_AMOUNT;
            });

            const packetInfo = await redPacketInstance.getRedPacketInfo(0);
            assert.equal(packetInfo.creator, creator, "Creator should match");
            assert.equal(packetInfo.totalAmount.toString(), REQUIRED_AMOUNT, "Total amount should be 0.0001 ETH");
            assert.equal(packetInfo.remainingPackets.toString(), "5", "Should have 5 packets");
        });

        it("should reject creation with incorrect amount", async () => {
            await truffleAssert.reverts(
                redPacketInstance.createRedPacket({
                    from: creator,
                    value: web3.utils.toWei("0.0002", "ether")
                }),
                "Must send exactly 0.0001 ETH"
            );

            await truffleAssert.reverts(
                redPacketInstance.createRedPacket({
                    from: creator,
                    value: web3.utils.toWei("0.00005", "ether")
                }),
                "Must send exactly 0.0001 ETH"
            );
        });

        it("should split amount into 5 packets correctly", async () => {
            await redPacketInstance.createRedPacket({
                from: creator,
                value: REQUIRED_AMOUNT
            });

            const amounts = await redPacketInstance.getRedPacketAmounts(0);
            assert.equal(amounts.length, 5, "Should have 5 amounts");

            let totalSplit = web3.utils.toBN(0);
            for (let i = 0; i < amounts.length; i++) {
                totalSplit = totalSplit.add(web3.utils.toBN(amounts[i]));
                assert(web3.utils.toBN(amounts[i]).gt(web3.utils.toBN(0)), "Each amount should be greater than 0");
            }

            assert.equal(totalSplit.toString(), REQUIRED_AMOUNT, "Split amounts should equal total");
        });
    });

    describe("Red Packet Claiming", () => {
        beforeEach(async () => {
            await redPacketInstance.createRedPacket({
                from: creator,
                value: REQUIRED_AMOUNT
            });
        });

        it("should allow users to claim red packets", async () => {
            const result = await redPacketInstance.claimRedPacket(0, {
                from: claimer1
            });

            truffleAssert.eventEmitted(result, 'RedPacketClaimed', (ev) => {
                return ev.packetId.toString() === "0" &&
                       ev.claimer === claimer1 &&
                       web3.utils.toBN(ev.amount).gt(web3.utils.toBN(0));
            });

            const packetInfo = await redPacketInstance.getRedPacketInfo(0);
            assert.equal(packetInfo.remainingPackets.toString(), "4", "Should have 4 remaining packets");
            assert.equal(packetInfo.claimers.length, 1, "Should have 1 claimer");
            assert.equal(packetInfo.claimers[0], claimer1, "Claimer should be recorded");

            const hasClaimed = await redPacketInstance.hasClaimedRedPacket(0, claimer1);
            assert.equal(hasClaimed, true, "Should mark as claimed");
        });

        it("should prevent double claiming", async () => {
            await redPacketInstance.claimRedPacket(0, { from: claimer1 });

            await truffleAssert.reverts(
                redPacketInstance.claimRedPacket(0, { from: claimer1 }),
                "Already claimed"
            );
        });

        it("should prevent creator from claiming own packet", async () => {
            await truffleAssert.reverts(
                redPacketInstance.claimRedPacket(0, { from: creator }),
                "Creator cannot claim own packet"
            );
        });

        it("should allow all 5 packets to be claimed", async () => {
            const claimers = [claimer1, claimer2, claimer3, claimer4, claimer5];

            for (let i = 0; i < claimers.length; i++) {
                await redPacketInstance.claimRedPacket(0, { from: claimers[i] });

                const packetInfo = await redPacketInstance.getRedPacketInfo(0);
                assert.equal(packetInfo.remainingPackets.toString(), (4 - i).toString(),
                    `Should have ${4 - i} remaining packets after claim ${i + 1}`);
            }

            const finalPacketInfo = await redPacketInstance.getRedPacketInfo(0);
            assert.equal(finalPacketInfo.remainingPackets.toString(), "0", "Should have 0 remaining packets");
            assert.equal(finalPacketInfo.remainingAmount.toString(), "0", "Should have 0 remaining amount");
        });

        it("should prevent claiming when no packets remain", async () => {
            const claimers = [claimer1, claimer2, claimer3, claimer4, claimer5];

            for (let claimer of claimers) {
                await redPacketInstance.claimRedPacket(0, { from: claimer });
            }

            await truffleAssert.reverts(
                redPacketInstance.claimRedPacket(0, { from: accounts[6] }),
                "No packets remaining"
            );
        });
    });

    describe("Red Packet Information", () => {
        beforeEach(async () => {
            await redPacketInstance.createRedPacket({
                from: creator,
                value: REQUIRED_AMOUNT
            });
        });

        it("should return correct packet information", async () => {
            const packetInfo = await redPacketInstance.getRedPacketInfo(0);

            assert.equal(packetInfo.creator, creator, "Creator should match");
            assert.equal(packetInfo.totalAmount.toString(), REQUIRED_AMOUNT, "Total amount should match");
            assert.equal(packetInfo.remainingAmount.toString(), REQUIRED_AMOUNT, "Remaining amount should initially equal total");
            assert.equal(packetInfo.remainingPackets.toString(), "5", "Should start with 5 packets");
            assert(packetInfo.createdAt > 0, "Created timestamp should be set");
        });

        it("should check claim status correctly", async () => {
            assert.equal(await redPacketInstance.hasClaimedRedPacket(0, claimer1), false,
                "Should not have claimed initially");

            await redPacketInstance.claimRedPacket(0, { from: claimer1 });

            assert.equal(await redPacketInstance.hasClaimedRedPacket(0, claimer1), true,
                "Should have claimed after claiming");
            assert.equal(await redPacketInstance.hasClaimedRedPacket(0, claimer2), false,
                "Other user should not have claimed");
        });
    });

    describe("Multiple Red Packets", () => {
        it("should handle multiple red packets independently", async () => {
            await redPacketInstance.createRedPacket({
                from: creator,
                value: REQUIRED_AMOUNT
            });

            await redPacketInstance.createRedPacket({
                from: claimer1,
                value: REQUIRED_AMOUNT
            });

            await redPacketInstance.claimRedPacket(0, { from: claimer1 });
            await redPacketInstance.claimRedPacket(1, { from: creator });

            const packet0Info = await redPacketInstance.getRedPacketInfo(0);
            const packet1Info = await redPacketInstance.getRedPacketInfo(1);

            assert.equal(packet0Info.creator, creator, "First packet creator should be creator");
            assert.equal(packet1Info.creator, claimer1, "Second packet creator should be claimer1");
            assert.equal(packet0Info.remainingPackets.toString(), "4", "First packet should have 4 remaining");
            assert.equal(packet1Info.remainingPackets.toString(), "4", "Second packet should have 4 remaining");
        });
    });

    describe("Edge Cases", () => {
        it("should handle non-existent packet queries gracefully", async () => {
            const packetInfo = await redPacketInstance.getRedPacketInfo(999);
            assert.equal(packetInfo.creator, "0x0000000000000000000000000000000000000000",
                "Non-existent packet should have zero address creator");
        });

        it("should reject claims on non-existent packets", async () => {
            await truffleAssert.reverts(
                redPacketInstance.claimRedPacket(999, { from: claimer1 }),
                "Red packet does not exist"
            );
        });
    });
});
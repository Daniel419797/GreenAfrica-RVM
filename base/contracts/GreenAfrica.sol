// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Non-transferable Green Points accounting and audited recycling receipts.
/// @dev No user funds or personal data are custody-held by this contract.
contract GreenAfrica {
    error NotOwner();
    error NotOperator();
    error InvalidInput();
    error AlreadyRegistered();
    error NotRegistered();
    error StationInactive();
    error DuplicateSession();
    error DuplicateRedemption();
    error DuplicateAdjustment();
    error InsufficientPoints();
    error UnauthorizedOwner();

    struct Recycler {
        uint64 points;
        uint64 totalPet;
        bool registered;
    }

    address public owner;
    address public pendingOwner;
    mapping(address => bool) public operators;
    mapping(bytes32 => bool) private registeredRvms;
    mapping(bytes32 => bool) private activeRvms;
    mapping(bytes32 => Recycler) private recyclers;
    mapping(bytes32 => bool) public processedSessions;
    mapping(bytes32 => bool) public processedRedemptions;
    mapping(bytes32 => bool) public processedAdjustments;

    event OwnershipTransferStarted(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OperatorSet(address indexed operator, bool enabled);
    event RvmRegistered(bytes32 indexed rvmId);
    event RvmStatusChanged(bytes32 indexed rvmId, bool active);
    event RecyclerRegistered(bytes32 indexed recyclerId);
    event DepositRecorded(bytes32 indexed recyclerId, bytes32 indexed rvmId, bytes32 indexed sessionId, uint64 petCount, uint64 pointsAwarded, bytes32 receiptHash);
    event PointsRedeemed(bytes32 indexed recyclerId, bytes32 indexed redemptionId, uint64 points, bytes32 destinationHash);
    event PointsAdjusted(bytes32 indexed recyclerId, bytes32 indexed adjustmentId, uint64 amount, bool increased, bytes32 reasonHash);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOperator() {
        if (!operators[msg.sender]) revert NotOperator();
        _;
    }

    constructor() {
        owner = msg.sender;
        operators[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit OperatorSet(msg.sender, true);
    }

    function startOwnershipTransfer(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidInput();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert UnauthorizedOwner();
        address previousOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, msg.sender);
    }

    function setOperator(address operator, bool enabled) external onlyOwner {
        if (operator == address(0)) revert InvalidInput();
        operators[operator] = enabled;
        emit OperatorSet(operator, enabled);
    }

    function registerRvm(bytes32 rvmId) external onlyOwner {
        if (rvmId == bytes32(0)) revert InvalidInput();
        if (registeredRvms[rvmId]) revert AlreadyRegistered();
        registeredRvms[rvmId] = true;
        activeRvms[rvmId] = true;
        emit RvmRegistered(rvmId);
        emit RvmStatusChanged(rvmId, true);
    }

    function setRvmActive(bytes32 rvmId, bool active) external onlyOwner {
        if (!registeredRvms[rvmId]) revert NotRegistered();
        activeRvms[rvmId] = active;
        emit RvmStatusChanged(rvmId, active);
    }

    function isRvmActive(bytes32 rvmId) external view returns (bool) {
        return registeredRvms[rvmId] && activeRvms[rvmId];
    }

    function registerRecycler(bytes32 recyclerId) external onlyOperator {
        if (recyclerId == bytes32(0)) revert InvalidInput();
        if (recyclers[recyclerId].registered) revert AlreadyRegistered();
        recyclers[recyclerId].registered = true;
        emit RecyclerRegistered(recyclerId);
    }

    function isRecyclerRegistered(bytes32 recyclerId) external view returns (bool) {
        return recyclers[recyclerId].registered;
    }

    function getRecycler(bytes32 recyclerId) external view returns (uint64 points, uint64 totalPet) {
        Recycler storage recycler = recyclers[recyclerId];
        if (!recycler.registered) revert NotRegistered();
        return (recycler.points, recycler.totalPet);
    }

    function isSessionRecorded(bytes32 sessionId) external view returns (bool) {
        return processedSessions[sessionId];
    }

    function recordDeposit(
        bytes32 recyclerId,
        bytes32 rvmId,
        uint64 petCount,
        uint64 pointsAwarded,
        bytes32 sessionId,
        bytes32 receiptHash
    ) external onlyOperator {
        if (sessionId == bytes32(0) || receiptHash == bytes32(0) || petCount == 0 || pointsAwarded == 0) revert InvalidInput();
        if (!registeredRvms[rvmId] || !activeRvms[rvmId]) revert StationInactive();
        Recycler storage recycler = recyclers[recyclerId];
        if (!recycler.registered) revert NotRegistered();
        if (processedSessions[sessionId]) revert DuplicateSession();
        processedSessions[sessionId] = true;
        recycler.totalPet += petCount;
        recycler.points += pointsAwarded;
        emit DepositRecorded(recyclerId, rvmId, sessionId, petCount, pointsAwarded, receiptHash);
    }

    function redeemPoints(
        bytes32 recyclerId,
        uint64 pointsToRedeem,
        bytes32 redemptionId,
        bytes32 destinationHash
    ) external onlyOperator {
        if (pointsToRedeem == 0 || redemptionId == bytes32(0) || destinationHash == bytes32(0)) revert InvalidInput();
        Recycler storage recycler = recyclers[recyclerId];
        if (!recycler.registered) revert NotRegistered();
        if (processedRedemptions[redemptionId]) revert DuplicateRedemption();
        if (recycler.points < pointsToRedeem) revert InsufficientPoints();
        processedRedemptions[redemptionId] = true;
        recycler.points -= pointsToRedeem;
        emit PointsRedeemed(recyclerId, redemptionId, pointsToRedeem, destinationHash);
    }

    /// @notice Audited manual refund/adjustment. Only the governance owner can call.
    /// @dev A unique adjustmentId is mandatory to prevent replay.
    function adjustPoints(
        bytes32 recyclerId,
        uint64 amount,
        bool add,
        bytes32 adjustmentId,
        bytes32 reasonHash
    ) external onlyOwner {
        if (amount == 0 || adjustmentId == bytes32(0) || reasonHash == bytes32(0)) revert InvalidInput();
        Recycler storage recycler = recyclers[recyclerId];
        if (!recycler.registered) revert NotRegistered();
        if (processedAdjustments[adjustmentId]) revert DuplicateAdjustment();
        processedAdjustments[adjustmentId] = true;
        if (add) recycler.points += amount;
        else {
            if (recycler.points < amount) revert InsufficientPoints();
            recycler.points -= amount;
        }
        emit PointsAdjusted(recyclerId, adjustmentId, amount, add, reasonHash);
    }
}

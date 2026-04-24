// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IArcNSPriceOracle.sol";
import "../interfaces/IArcNSRegistry.sol";
import "./ArcNSBaseRegistrar.sol";
import "../resolver/ArcNSResolver.sol";

/// @title ArcNSRegistrarController
/// @notice Handles commit/reveal registration and renewal with USDC payments
/// @dev Mirrors ENS ETHRegistrarController but uses ERC20 USDC instead of ETH
contract ArcNSRegistrarController is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant MIN_REGISTRATION_DURATION = 28 days;
    uint256 public constant MAX_REGISTRATION_DURATION = 10 * 365 days; // 10 years cap
    uint256 public constant MIN_COMMITMENT_AGE        = 60;      // seconds
    uint256 public constant MAX_COMMITMENT_AGE        = 24 hours;
    uint256 public constant MIN_NAME_LENGTH           = 3;
    uint256 public constant MAX_RESOLVER_DATA_ITEMS   = 10;      // DoS guard

    // ─── State ────────────────────────────────────────────────────────────────

    ArcNSBaseRegistrar  public immutable base;
    IArcNSPriceOracle   public           priceOracle;
    IERC20              public immutable usdc;
    IArcNSRegistry      public immutable registry;
    ArcNSResolver       public           resolver;

    mapping(bytes32 => uint256) public commitments;

    address public treasury;

    // ─── Events ───────────────────────────────────────────────────────────────

    event NameRegistered(
        string  name,
        bytes32 indexed label,
        address indexed owner,
        uint256 cost,
        uint256 expires
    );
    event NameRenewed(
        string  name,
        bytes32 indexed label,
        uint256 cost,
        uint256 expires
    );
    event NewPriceOracle(address indexed oracle);
    event CommitmentMade(bytes32 indexed commitment);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        ArcNSBaseRegistrar  _base,
        IArcNSPriceOracle   _priceOracle,
        IERC20              _usdc,
        IArcNSRegistry      _registry,
        ArcNSResolver       _resolver,
        address             _treasury
    ) Ownable(msg.sender) {
        base        = _base;
        priceOracle = _priceOracle;
        usdc        = _usdc;
        registry    = _registry;
        resolver    = _resolver;
        treasury    = _treasury;
    }

    // ─── Commit / Reveal ──────────────────────────────────────────────────────

    /// @notice Step 1: Submit commitment hash to prevent front-running
    function commit(bytes32 commitment) external {
        require(commitments[commitment] + MAX_COMMITMENT_AGE < block.timestamp, "Controller: commitment exists");
        commitments[commitment] = block.timestamp;
        emit CommitmentMade(commitment);
    }

    /// @notice Generate commitment hash — caller must pass their own address as `caller`
    /// @dev Binds commitment to: label, owner, duration, secret, resolverAddr, data,
    ///      reverseRecord, and caller (msg.sender).
    function makeCommitment(
        string   memory name_,
        address         owner_,
        uint256         duration,
        bytes32         secret,
        address         resolverAddr,
        bytes[] memory  data,
        bool            reverseRecord,
        address         caller
    ) public pure returns (bytes32) {
        require(bytes(name_).length >= 1, "Controller: name too short");
        require(owner_ != address(0),     "Controller: invalid owner");
        require(duration > 0,             "Controller: invalid duration");
        bytes32 label = keccak256(bytes(name_));
        return keccak256(abi.encode(
            label, owner_, duration, secret, resolverAddr, data, reverseRecord, caller
        ));
    }

    /// @notice Convenience overload — uses msg.sender as caller (for on-chain calls)
    function makeCommitment(
        string   memory name_,
        address         owner_,
        uint256         duration,
        bytes32         secret,
        address         resolverAddr,
        bytes[] memory  data,
        bool            reverseRecord
    ) public view returns (bytes32) {
        return makeCommitment(name_, owner_, duration, secret, resolverAddr, data, reverseRecord, msg.sender);
    }

    /// @notice Step 2: Register after commitment matures
    /// @dev Caller must have approved `usdc` spend >= rentPrice(name, duration).base
    function register(
        string   calldata name_,
        address           owner_,
        uint256           duration,
        bytes32           secret,
        address           resolverAddr,
        bytes[] calldata  data,
        bool              reverseRecord
    ) external nonReentrant {
        // Validate commitment — recompute hash binding msg.sender
        bytes32 commitment = makeCommitment(name_, owner_, duration, secret, resolverAddr, data, reverseRecord, msg.sender);
        _validateCommitment(commitment);

        // Validate name
        require(_validName(name_), "Controller: invalid name");
        require(duration >= MIN_REGISTRATION_DURATION, "Controller: duration too short");
        require(duration <= MAX_REGISTRATION_DURATION, "Controller: duration too long");

        // Calculate and collect payment
        IArcNSPriceOracle.Price memory p = rentPrice(name_, duration);
        uint256 cost = p.base + p.premium;
        usdc.safeTransferFrom(msg.sender, treasury, cost);

        // Register in base registrar (sets owner + resolver atomically)
        bytes32 label = keccak256(bytes(name_));
        uint256 tokenId = uint256(label);
        bytes32 nodehash = keccak256(abi.encodePacked(base.baseNode(), label));
        uint256 expires;

        if (resolverAddr != address(0)) {
            expires = base.registerWithResolver(tokenId, owner_, duration, resolverAddr);
            // Execute resolver data calls
            if (data.length > 0) {
                _setRecords(resolverAddr, nodehash, data);
            }
        } else {
            expires = base.register(tokenId, owner_, duration);
        }

        // Set reverse record if requested
        if (reverseRecord) {
            _setReverseRecord(name_, resolverAddr, owner_);
        }

        emit NameRegistered(name_, label, owner_, cost, expires);
    }

    /// @notice Renew an existing name
    function renew(string calldata name_, uint256 duration) external nonReentrant {
        require(duration >= MIN_REGISTRATION_DURATION, "Controller: duration too short");
        require(duration <= MAX_REGISTRATION_DURATION, "Controller: duration too long");
        IArcNSPriceOracle.Price memory p = rentPrice(name_, duration);
        uint256 cost = p.base + p.premium;
        usdc.safeTransferFrom(msg.sender, treasury, cost);

        bytes32 label   = keccak256(bytes(name_));
        uint256 tokenId = uint256(label);
        uint256 expires = base.renew(tokenId, duration);

        emit NameRenewed(name_, label, cost, expires);
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    function rentPrice(string memory name_, uint256 duration)
        public view returns (IArcNSPriceOracle.Price memory)
    {
        bytes32 label   = keccak256(bytes(name_));
        uint256 tokenId = uint256(label);
        return priceOracle.price(name_, base.nameExpires(tokenId), duration);
    }

    function available(string memory name_) public view returns (bool) {
        bytes32 label   = keccak256(bytes(name_));
        uint256 tokenId = uint256(label);
        return _validName(name_) && base.available(tokenId);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setPriceOracle(IArcNSPriceOracle _oracle) external onlyOwner {
        priceOracle = _oracle;
        emit NewPriceOracle(address(_oracle));
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function setResolver(ArcNSResolver _resolver) external onlyOwner {
        resolver = _resolver;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _validateCommitment(bytes32 commitment) internal {
        require(commitments[commitment] != 0,                                                    "Controller: commitment not found");
        uint256 commitTs = commitments[commitment];
        require(block.timestamp >= commitTs + MIN_COMMITMENT_AGE,                               "Controller: commitment too young");
        require(block.timestamp <= commitTs + MAX_COMMITMENT_AGE,                               "Controller: commitment expired");
        delete commitments[commitment];
    }

    function _validName(string memory name_) internal pure returns (bool) {
        bytes memory b = bytes(name_);
        if (b.length < MIN_NAME_LENGTH) return false;
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool valid = (c >= 0x61 && c <= 0x7A) || // a-z
                         (c >= 0x30 && c <= 0x39) || // 0-9
                         (c == 0x2D);                // hyphen
            if (!valid) return false;
        }
        // No leading/trailing hyphen
        if (b[0] == 0x2D || b[b.length - 1] == 0x2D) return false;
        return true;
    }

    // Allowed resolver selectors for data[] calls in register()
    // setAddr(bytes32,address), setAddr(bytes32,uint256,bytes),
    // setText(bytes32,string,string), setContenthash(bytes32,bytes)
    bytes4 private constant SEL_SET_ADDR_EVM   = bytes4(keccak256("setAddr(bytes32,address)"));
    bytes4 private constant SEL_SET_ADDR_COIN  = bytes4(keccak256("setAddr(bytes32,uint256,bytes)"));
    bytes4 private constant SEL_SET_TEXT       = bytes4(keccak256("setText(bytes32,string,string)"));
    bytes4 private constant SEL_SET_CONTENTHASH = bytes4(keccak256("setContenthash(bytes32,bytes)"));

    function _setRecords(address resolverAddr, bytes32 node, bytes[] calldata data) internal {
        require(data.length <= MAX_RESOLVER_DATA_ITEMS, "Controller: too many data items");
        for (uint256 i = 0; i < data.length; i++) {
            require(data[i].length >= 36, "Controller: data item too short");
            // Whitelist: only allow known resolver write selectors
            bytes4 sel = bytes4(data[i][:4]);
            require(
                sel == SEL_SET_ADDR_EVM   ||
                sel == SEL_SET_ADDR_COIN  ||
                sel == SEL_SET_TEXT       ||
                sel == SEL_SET_CONTENTHASH,
                "Controller: disallowed selector"
            );
            // Inject node into each call (first 36 bytes: selector + node)
            bytes memory call_ = abi.encodePacked(data[i][:4], node, data[i][36:]);
            (bool success,) = resolverAddr.call(call_);
            require(success, "Controller: resolver call failed");
        }
    }

    function _setReverseRecord(string memory name_, address resolverAddr, address owner_) internal {
        // Delegate to resolver's reverse record setter
        if (resolverAddr != address(0)) {
            ArcNSResolver(resolverAddr).setNameForAddr(
                owner_,
                owner_,
                resolverAddr,
                string(abi.encodePacked(name_, ".", base.tld()))
            );
        }
    }
}

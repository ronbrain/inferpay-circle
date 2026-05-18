// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice On-chain registry of AI model providers and their USDC pricing on Arc.
///
/// Providers register with a price per unit (tokens / image / call).
/// The AgentPaymaster and InferenceStream reference this for routing decisions.
contract ModelRegistry {
    struct Provider {
        address wallet;        // receives payments
        string  modelId;       // e.g. "claude-sonnet-4-6"
        string  category;      // "text" | "image" | "search"
        uint256 pricePerUnit;  // USDC (6 dec) per 1000 tokens / image / call
        bool    active;
    }

    address public owner;
    uint256 public nextId;

    mapping(uint256 => Provider) public providers;
    mapping(string => uint256)   public modelIndex; // modelId → provider id

    event ProviderRegistered(uint256 indexed id, string modelId, address wallet, uint256 pricePerUnit);
    event ProviderUpdated(uint256 indexed id, uint256 newPrice, bool active);

    error NotOwner();
    error ModelExists();
    error NotFound();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        _seed();
    }

    function register(
        address wallet,
        string calldata modelId,
        string calldata category,
        uint256 pricePerUnit
    ) external onlyOwner returns (uint256 id) {
        if (modelIndex[modelId] != 0) revert ModelExists();
        id = ++nextId;
        providers[id] = Provider(wallet, modelId, category, pricePerUnit, true);
        modelIndex[modelId] = id;
        emit ProviderRegistered(id, modelId, wallet, pricePerUnit);
    }

    function setPrice(uint256 id, uint256 price) external onlyOwner {
        if (providers[id].wallet == address(0)) revert NotFound();
        providers[id].pricePerUnit = price;
        emit ProviderUpdated(id, price, providers[id].active);
    }

    function setActive(uint256 id, bool active) external onlyOwner {
        if (providers[id].wallet == address(0)) revert NotFound();
        providers[id].active = active;
        emit ProviderUpdated(id, providers[id].pricePerUnit, active);
    }

    function getByModel(string calldata modelId) external view returns (Provider memory) {
        uint256 id = modelIndex[modelId];
        if (id == 0) revert NotFound();
        return providers[id];
    }

    function listActive() external view returns (Provider[] memory list) {
        uint256 count = 0;
        for (uint256 i = 1; i <= nextId; i++) if (providers[i].active) count++;
        list = new Provider[](count);
        uint256 j = 0;
        for (uint256 i = 1; i <= nextId; i++) if (providers[i].active) list[j++] = providers[i];
    }

    // Seed the five providers from the architecture diagram
    function _seed() internal {
        address self = address(this); // placeholder wallets — update post-deploy
        _reg(self, "claude-sonnet-4-6", "text",   124);   // 0.000124 USDC/1k tok
        _reg(self, "gpt-5",             "text",   180);
        _reg(self, "llama-3.3-70b",     "text",    61);
        _reg(self, "sdxl-turbo",        "image",  950);   // 0.000950 USDC/image
        _reg(self, "tavily-search",     "search", 200);
    }

    function _reg(address w, string memory m, string memory c, uint256 p) internal {
        uint256 id = ++nextId;
        providers[id] = Provider(w, m, c, p, true);
        modelIndex[m] = id;
        emit ProviderRegistered(id, m, w, p);
    }
}

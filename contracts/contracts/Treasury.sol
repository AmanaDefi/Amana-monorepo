// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Treasury {
    address public governance;
    event GovernanceChanged(
        address indexed oldGovernance,
        address indexed newGovernance
    );

    constructor(address _governance) {
        require(_governance != address(0), "Governance: zero address");
        governance = _governance;
    }

    modifier onlyGovernance() {
        require(msg.sender == governance, "Not authorized");
        _;
    }

    function setGovernance(address _governance) external onlyGovernance {
        require(_governance != address(0), "Governance: zero address");

        address oldGovernance = governance;
        governance = _governance;

        emit GovernanceChanged(oldGovernance, _governance);
    }

    // Ether deposit function
    function depositEther() external payable {}

    // ERC-20 token deposit function (requires prior approval from sender)
    function depositERC20(address _token, uint256 _amount) external {
        bool success = IERC20(_token).transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        require(success, "Token transfer failed");
    }

    // Ether withdrawal function
    function withdrawEther(
        uint256 _amount,
        address _to
    ) external onlyGovernance {
        require(_to != address(0), "Withdraw: zero address");
        require(address(this).balance >= _amount, "Insufficient Ether balance");
        payable(_to).transfer(_amount);
    }

    // ERC-20 token withdrawal function
    function withdrawERC20(
        address _token,
        uint256 _amount,
        address _to
    ) external onlyGovernance {
        require(
            IERC20(_token).balanceOf(address(this)) >= _amount,
            "Insufficient token balance"
        );
        bool success = IERC20(_token).transfer(_to, _amount);
        require(success, "Token transfer failed");
    }
}

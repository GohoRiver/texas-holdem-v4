window.PokerWallet = (function(){
  /* 平台收款地址（手续费 2% 会转到这里） */
  const PLATFORM_ADDRESS = '0x1219C18ADc187c918d0216EB7B983f5068EEb19A';
  /* BEM 代币合约地址 */
  const BEM_ADDRESS = '0x5ce033b2bfca3af30b3e8c8457deaf776a8b695a';
  /* 你部署的德州扑克智能合约地址（主网） */
  const CONTRACT_ADDRESS = '0x19fAB85122f24586218c101366ef081ca91cc2c3';
  /* 充值手续费 2% */
  const FEE_RATE = 0.02;
  /* BSC 主网 chainId */
  const BSC_CHAIN_ID = '0x38';
  /* 1 chip = 0.0001 BEM */
  const CHIP_TO_BEM = 0.0001;

  /* BEM 代币的 ABI */
  const BEM_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
  ];

  /* 德州扑克合约的 ABI（从你编译产物中复制） */
  const CONTRACT_ABI = [
    {
      "inputs": [{ "internalType": "address", "name": "_bem", "type": "address" }],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
        { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
      ],
      "name": "Deposited",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
        { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
      ],
      "name": "Withdrawn",
      "type": "event"
    },
    {
      "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
      "name": "balances",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "bemToken",
      "outputs": [{ "internalType": "contract IERC20", "name": "", "type": "address" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }],
      "name": "deposit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "_player", "type": "address" }],
      "name": "getBalance",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }],
      "name": "withdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

  let provider = null;
  let signer = null;
  let userAddress = null;
  let bemBalance = 0;
  let contractBalance = 0;
  let decimals = 18;

  function getEth(){
    return window.binancew3w?.ethereum || window.ethereum || null;
  }

  /* 连接钱包 */
  async function connect(){
    const eth = getEth();
    if(!eth){
      alert('请安装币安 Web3 钱包或 MetaMask');
      return null;
    }
    try{
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if(!accounts || !accounts.length) return null;
      userAddress = accounts[0];

      /* 切换到 BNB Chain 主网 */
      try{
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BSC_CHAIN_ID }]
        });
      }catch(sw){
        if(sw.code === 4902){
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BSC_CHAIN_ID,
              chainName: 'BNB Smart Chain',
              nativeCurrency: { name:'BNB', symbol:'BNB', decimals:18 },
              rpcUrls: ['https://bsc-dataseed.binance.org/'],
              blockExplorerUrls: ['https://bscscan.com/']
            }]
          });
        } else {
          throw sw;
        }
      }

      provider = new ethers.BrowserProvider(eth);
      signer = await provider.getSigner();

      /* 读余额 */
      await refreshBemBalance();
      await refreshContractBalance();
      updateUI();

      /* 监听账户变化 */
      eth.on && eth.on('accountsChanged', function(accs){
        if(accs && accs.length){
          userAddress = accs[0];
          refreshBemBalance()
            .then(refreshContractBalance)
            .then(updateUI);
        } else {
          userAddress = null;
          bemBalance = 0;
          contractBalance = 0;
          updateUI();
        }
      });

      return { address: userAddress, signer, bemBalance };
    }catch(err){
      console.error('connect error', err);
      return null;
    }
  }

  /* 读取钱包里的 BEM 余额 */
  async function refreshBemBalance(){
    if(!provider || !userAddress) return 0;
    try{
      const contract = new ethers.Contract(BEM_ADDRESS, BEM_ABI, provider);
      const raw = await contract.balanceOf(userAddress);
      try{
        decimals = Number(await contract.decimals());
      }catch(e){ decimals = 18; }
      bemBalance = parseFloat(ethers.formatUnits(raw, decimals));
    }catch(e){
      console.warn('read BEM failed', e);
      bemBalance = 0;
    }
    return bemBalance;
  }

  /* 读取合约里的 BEM 余额（玩家存在合约里的） */
  async function refreshContractBalance(){
    if(!provider || !userAddress) return 0;
    try{
      const game = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const raw = await game.getBalance(userAddress);
      contractBalance = parseFloat(ethers.formatUnits(raw, decimals));
    }catch(e){
      console.warn('read contract balance failed', e);
      contractBalance = 0;
    }
    return contractBalance;
  }

  /* 更新 UI */
  function updateUI(){
    const btn = document.getElementById('connectWalletBtn');
    const btn2 = document.getElementById('realConnectBtn');
    const label = userAddress
      ? (userAddress.slice(0,6) + '...' + userAddress.slice(-4))
      : null;

    if(btn){
      if(label){
        btn.textContent = label;
        btn.classList.add('connected');
      } else {
        btn.textContent = window.PokerI18n.t('connectWallet');
        btn.classList.remove('connected');
      }
    }
    if(btn2){
      if(label){
        btn2.textContent = label;
        btn2.classList.add('connected');
      } else {
        btn2.textContent = window.PokerI18n.t('connectWallet');
        btn2.classList.remove('connected');
      }
    }

    const bem = document.getElementById('walletBemBalance');
    if(bem) bem.textContent = bemBalance.toFixed(4);

    const addr = document.getElementById('walletAddress');
    if(addr){
      addr.textContent = userAddress
        ? (userAddress.slice(0,6) + '...' + userAddress.slice(-4))
        : window.PokerI18n.t('notConnected');
    }

    const pill = document.getElementById('statusPill');
    if(pill && userAddress){
      pill.innerHTML = '<span class="dot" style="background:#22c55e;box-shadow:0 0 6px #22c55e;"></span>' + bemBalance.toFixed(2) + ' BEM';
    }
  }

  /* =========================================================
     充值：用户 approve 合约 → 转手续费到平台 → 调用合约 deposit
     ========================================================= */
  async function depositBem(amountBem){
    if(!signer || !userAddress){
      throw new Error('not-connected');
    }
    const amount = Number(amountBem);
    if(!amount || amount < 1){
      throw new Error('min-amount');
    }
    if(amount > bemBalance){
      throw new Error('insufficient');
    }

    /* 计算手续费与净额 */
    const feeAmount = amount * FEE_RATE;
    const netAmount = amount - feeAmount;
    const netChips = Math.floor(netAmount / CHIP_TO_BEM);

    const bemContract = new ethers.Contract(BEM_ADDRESS, BEM_ABI, signer);
    const gameContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    /* 第 1 步：approve 合约使用净额 */
    const approveTx = await bemContract.approve(
      CONTRACT_ADDRESS,
      ethers.parseUnits(netAmount.toString(), decimals)
    );
    await approveTx.wait();

    /* 第 2 步：把 2% 手续费转给平台 */
    if(feeAmount > 0){
      const feeTx = await bemContract.transfer(
        PLATFORM_ADDRESS,
        ethers.parseUnits(feeAmount.toString(), decimals)
      );
      await feeTx.wait();
    }

    /* 第 3 步：调用合约的 deposit，把 98% 存进合约 */
    const depositTx = await gameContract.deposit(
      ethers.parseUnits(netAmount.toString(), decimals)
    );
    await depositTx.wait();

    /* 刷新余额 */
    await refreshBemBalance();
    await refreshContractBalance();
    updateUI();

    return {
      netChips: netChips,
      netBem: netAmount,
      feeBem: feeAmount,
      txHash: depositTx.hash
    };
  }

  /* =========================================================
     提现：调用合约的 withdraw 把 BEM 提回钱包
     ========================================================= */
  async function withdrawBem(amountBem){
    if(!signer || !userAddress){
      throw new Error('not-connected');
    }
    const amount = Number(amountBem);
    if(!amount || amount <= 0){
      throw new Error('min-amount');
    }

    const gameContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    const tx = await gameContract.withdraw(
      ethers.parseUnits(amount.toString(), decimals)
    );
    await tx.wait();

    await refreshBemBalance();
    await refreshContractBalance();
    updateUI();

    return { txHash: tx.hash, amount: amount };
  }

  function getBemBalance(){ return bemBalance; }
  function getContractBalance(){ return contractBalance; }
  function getAddress(){ return userAddress; }
  function isConnected(){ return !!userAddress; }
  function getPlatformAddress(){ return PLATFORM_ADDRESS; }
  function getContractAddress(){ return CONTRACT_ADDRESS; }
  function getFeeRate(){ return FEE_RATE; }

  return {
    connect,
    depositBem,
    withdrawBem,
    refreshBemBalance,
    refreshContractBalance,
    updateUI,
    getBemBalance,
    getContractBalance,
    getAddress,
    isConnected,
    getPlatformAddress,
    getContractAddress,
    getFeeRate
  };
})();
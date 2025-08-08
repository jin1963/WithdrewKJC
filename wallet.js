let web3, account;

function hasWeb3() {
  return typeof window.ethereum !== 'undefined' || typeof window.web3 !== 'undefined';
}

async function connectWallet() {
  try {
    if (!hasWeb3()) { alert('กรุณาติดตั้ง MetaMask'); return; }
    if (window.ethereum) {
      web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method:'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method:'eth_chainId' });
      if (chainId !== CONFIG.chainIdHex) {
        await window.ethereum.request({
          method:'wallet_switchEthereumChain',
          params:[{ chainId: CONFIG.chainIdHex }]
        });
      }
    } else {
      web3 = new Web3(window.web3.currentProvider);
    }
    const accounts = await web3.eth.getAccounts();
    account = accounts[0];
    document.getElementById('status').textContent = `✅ ${account}`;

    if (window.ethereum && window.ethereum.on) {
      window.ethereum.on('accountsChanged', ()=>location.reload());
      window.ethereum.on('chainChanged',   ()=>location.reload());
    }

    if (typeof fetchAndRenderUser === 'function') fetchAndRenderUser();
  } catch (e) {
    console.error(e);
    alert('เชื่อมต่อไม่สำเร็จ');
  }
}

document.getElementById('btnConnect').onclick = connectWallet;

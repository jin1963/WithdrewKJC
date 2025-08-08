const MAX_UINT = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

function ctrAuto()  { return new web3.eth.Contract(AUTO_STAKER_ABI, CONFIG.autoStaker); }
function ctrERC20(a){ return new web3.eth.Contract(ERC20_MINI_ABI, a); }
function ctrRouter(){ 
  const ABI=[{"constant":true,"inputs":[{"name":"amountIn","type":"uint256"},{"name":"path","type":"address[]"}],"name":"getAmountsOut","outputs":[{"name":"","type":"uint256[]"}],"payable":false,"stateMutability":"view","type":"function"}];
  return new web3.eth.Contract(ABI, CONFIG.router);
}

function toWei(x){ return Web3.utils.toWei(String(x), 'ether'); }
function fmtWei(bnStr, prec=6){
  const s=Web3.utils.fromWei(bnStr,'ether'); const [i,d='']=s.split('.');
  return d?`${i}.${d.slice(0,prec)}`:i;
}

async function setReferrer(){
  try{
    if(!account) return alert('เชื่อมกระเป๋าก่อน');
    const ref = document.getElementById('refAddress').value.trim();
    if(!Web3.utils.isAddress(ref)) return alert('Referrer ไม่ถูกต้อง');
    await ctrAuto().methods.setReferrer(ref).send({from:account});
    alert('ตั้งค่า Referrer สำเร็จ'); fetchAndRenderUser();
  }catch(e){ console.error(e); alert('ตั้งค่าไม่สำเร็จ'); }
}

async function quoteKJC(){
  try{
    if(!account) return alert('เชื่อมกระเป๋าก่อน');
    const v = document.getElementById('usdtAmount').value.trim();
    if(!v||Number(v)<=0) return alert('กรอกจำนวน USDT');
    const half = toWei(Number(v)/2);
    const out = await ctrRouter().methods.getAmountsOut(half, [CONFIG.usdt, CONFIG.kjc]).call();
    document.getElementById('quoteBox').textContent = `ประมาณการ KJC ≈ ${fmtWei(out[1])} (จาก USDT ${Number(v)/2})`;
  }catch(e){ console.error(e); document.getElementById('quoteBox').textContent='-'; }
}

async function buyAndStake(){
  try{
    if(!account) return alert('เชื่อมกระเป๋าก่อน');
    const v = document.getElementById('usdtAmount').value.trim();
    if(!v||Number(v)<=0) return alert('กรอกจำนวน USDT');
    const amount = toWei(v);

    const usdt = ctrERC20(CONFIG.usdt);
    const allowance = await usdt.methods.allowance(account, CONFIG.autoStaker).call();
    if(Web3.utils.toBN(allowance).lt(Web3.utils.toBN(amount))){
      await usdt.methods.approve(CONFIG.autoStaker, MAX_UINT).send({from:account});
    }

    await ctrAuto().methods.buyAndStake(amount, 0).send({from:account});
    alert('สำเร็จ: ซื้อ → Add LP → Stake');
    fetchAndRenderUser();
  }catch(e){ console.error(e); alert(e?.message || 'ทำรายการไม่สำเร็จ'); }
}

async function fetchAndRenderUser(){
  try{
    if(!account) return;
    const auto=ctrAuto();
    const len = Number(await auto.methods.stakesLength(account).call());
    let text = `จำนวนโพสิชัน: ${len}\n`;
    for(let i=0;i<len;i++){
      const s=await auto.methods.stakeInfo(account,i).call();
      const next=await auto.methods.nextClaimTime(account,i).call();
      const unl =await auto.methods.unlockTime(account,i).call();
      const canW=await auto.methods.canWithdrawIndex(account,i).call();
      text += `#${i} | LP=${fmtWei(s.amount)} | start=${new Date(Number(s.startTime)*1000).toLocaleString()} | `
           +  `last=${new Date(Number(s.lastClaim)*1000).toLocaleString()} | `
           +  `next=${next>0?new Date(Number(next)*1000).toLocaleString():'-'} | `
           +  `unlock=${unl>0?new Date(Number(unl)*1000).toLocaleString():'-'} | `
           +  `canWithdraw=${canW}\n`;
    }
    document.getElementById('stakesBox').textContent=text;

    const ref = await auto.methods.claimableReferralReward(account).call();
    document.getElementById('uiRefRewards').textContent = `${fmtWei(ref)} KJC`;
  }catch(e){ console.error(e); }
}

async function claimStakingReward(){
  try{ await ctrAuto().methods.claimStakingReward().send({from:account}); alert('เคลมสำเร็จ'); fetchAndRenderUser(); }
  catch(e){ console.error(e); alert('ยังไม่ถึงรอบ หรือ KJC ในสัญญาไม่พอ'); }
}
async function claimReferralReward(){
  try{ await ctrAuto().methods.claimReferralReward().send({from:account}); alert('เคลม Referral สำเร็จ'); fetchAndRenderUser(); }
  catch(e){ console.error(e); alert('เคลม Referral ไม่สำเร็จ'); }
}
async function withdrawByIndex(){
  try{
    const idx=document.getElementById('idx').value.trim();
    if(idx==='') return alert('ใส่ index ก่อน');
    await ctrAuto().methods.withdrawByIndex(idx).send({from:account});
    alert('ถอนโพสิชันสำเร็จ'); fetchAndRenderUser();
  }catch(e){ console.error(e); alert('ถอนไม่สำเร็จ (อาจยังไม่ปลดล็อก)'); }
}
async function withdrawAll(){
  try{ await ctrAuto().methods.withdrawAllUnlocked().send({from:account}); alert('ถอนที่ปลดล็อกทั้งหมดสำเร็จ'); fetchAndRenderUser(); }
  catch(e){ console.error(e); alert('ถอนไม่สำเร็จ'); }
}

// bind UI
document.getElementById('btnSetRef').onclick = setReferrer;
document.getElementById('btnQuote').onclick = quoteKJC;
document.getElementById('btnBuyStake').onclick = buyAndStake;
document.getElementById('btnRefresh').onclick = fetchAndRenderUser;
document.getElementById('btnClaimStake').onclick = claimStakingReward;
document.getElementById('btnClaimRef').onclick = claimReferralReward;
document.getElementById('btnWithdrawByIndex').onclick = withdrawByIndex;
document.getElementById('btnWithdrawAll').onclick = withdrawAll;

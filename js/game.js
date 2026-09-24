(function(){
'use strict';

const G = {
  players: [], deck: [], community: [], pot: 0, currentBet: 0,
  lastRaiseAmount: 20, stage: 'preflop', dealerIndex: 0, currentPlayerIndex: 0,
  smallBlind: 1, bigBlind: 2, tableMode: 'nano', tableLabel: 'Nano',
  gameMode: 'ai',
  handNumber: 0, totalPlayers: 6,
  aiSeats: 6,
  gameOver: false, busy: false, soundOn: true,
  playerHandStartChips: 0, sessionBuyIn: 0, sessionHands: 0,
  raiseMin: 0, raiseMax: 0, seatPositions: [],
  _renderedCards: new WeakSet(), turnTimer: null, turnTimeLeft: 30,
  online: {
    active: false,
    isHost: false,
    roomId: '',
    mySeat: 0,
    started: false,
    broadcastTimer: null
  }
};

const STAGE_KEYS = {
  preflop:"stagePreflop", flop:"stageFlop", turn:"stageTurn",
  river:"stageRiver", showdown:"stageShowdown"
};

const LEVELS = [
  { key:"nano",  name:"Nano",  sb:1,     bb:2,     buyMin:100,    buyMax:500 },
  { key:"micro", name:"Micro", sb:100,   bb:200,   buyMin:4000,   buyMax:20000 },
  { key:"low",   name:"Low",   sb:500,   bb:1000,  buyMin:20000,  buyMax:100000 },
  { key:"mid",   name:"Mid",   sb:2500,  bb:5000,  buyMin:100000, buyMax:500000 },
  { key:"high",  name:"High",  sb:10000, bb:20000, buyMin:400000, buyMax:2000000 }
];

const ONLINE_MAX_SEATS = 7;
const ONLINE_MIN_SEATS = 2;
const CHIP_TO_BEM = 0.0001;

function $(id){ return document.getElementById(id); }
function t(k,v){ return window.PokerI18n.t(k,v); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function fmtNum(n){ return (Math.floor(n)||0).toLocaleString('en-US'); }
function toBem(chips){ return (chips * CHIP_TO_BEM).toFixed(4); }
function isEn(){ return PokerI18n.getLang() === 'en'; }

function log(msg, cls){
  const el = $("logArea"); if(!el) return;
  const div = document.createElement("div");
  div.className = "log-line" + (cls ? " " + cls : "");
  div.textContent = msg;
  el.appendChild(div); el.scrollTop = el.scrollHeight;
  updateHandInfo();
}
function clearLog(){ const e = $("logArea"); if(e) e.innerHTML = ""; }

function showScreen(name){
  ["lobbyScreen","rulesScreen","myNumbersScreen","gameScreen"].forEach(function(id){
    const el = $(id); if(el) el.classList.add("hidden");
  });
  const target = $(name + "Screen");
  if(target) target.classList.remove("hidden");
  document.querySelectorAll(".nav-link").forEach(function(a){
    a.classList.toggle("active", a.getAttribute("data-nav") === name);
  });
  if(name === "lobby") refreshBalanceUI();
  if(name === "myNumbers") renderNumbers();
}

function refreshBalanceUI(){
  const r = PokerStorage.getRealChips();
  const pts = PokerStorage.getPoints();
  const ai = PokerStorage.getAiChips();
  const rEl = $("realBalance"); if(rEl) rEl.textContent = fmtNum(r);
  const pEl = $("pointsBalance"); if(pEl) pEl.textContent = fmtNum(pts);
  const aiEl = $("aiTotalChips"); if(aiEl) aiEl.textContent = fmtNum(ai);
  const aiWon = $("aiTotalWon");
  if(aiWon){
    const s = PokerStorage.getStats();
    aiWon.textContent = (s.netGain >= 0 ? "+" : "") + fmtNum(s.netGain);
    aiWon.style.color = s.netGain >= 0 ? 'var(--green)' : 'var(--red)';
  }
  const streakEl = $("pointsStreak");
  if(streakEl){
    const st = PokerStorage.getPointsStreak();
    streakEl.textContent = isEn()
      ? (st > 0 ? "Day " + st : "Day 1")
      : (st > 0 ? "第 " + st + " 天" : "第 1 天");
  }
  if(window.PokerWallet && PokerWallet.isConnected()) PokerWallet.updateUI();
}

function renderNumbers(){
  const s = PokerStorage.getStats();
  const th = $("numTotalHands"); if(th) th.textContent = s.hands;
  const twr = $("numWinRate");
  if(twr) twr.textContent = s.hands > 0 ? Math.round(s.wins / s.hands * 100) + "%" : "0%";
  const tb = $("numBiggest"); if(tb) tb.textContent = fmtNum(s.biggestPot);
  const tn = $("numNet");
  if(tn){
    tn.textContent = (s.netGain >= 0 ? "+" : "") + fmtNum(s.netGain);
    tn.classList.toggle('positive', s.netGain >= 0);
    tn.classList.toggle('negative', s.netGain < 0);
  }
  const sessions = s.sessions || [];
  let totalBuyIn = 0, totalCashout = 0;
  sessions.forEach(function(r){
    totalBuyIn += (r.buyIn || 0);
    totalCashout += (r.buyIn || 0) + (r.pnl || 0);
  });
  const tt = $("numTables"); if(tt) tt.textContent = sessions.length;
  const tbi = $("numTotalBuyIn"); if(tbi) tbi.textContent = fmtNum(totalBuyIn);
  const tco = $("numTotalCashout"); if(tco) tco.textContent = fmtNum(totalCashout);

  const wa = $("numbersWallet");
  if(wa){
    if(window.PokerWallet && PokerWallet.isConnected()){
      const a = PokerWallet.getAddress();
      wa.textContent = a.slice(0,6) + '...' + a.slice(-4);
    } else {
      wa.textContent = isEn() ? "Not connected" : "未连接";
    }
  }

  const body = $("sessionsBody");
  if(!body) return;
  body.innerHTML = "";
  if(sessions.length === 0){
    const empty = document.createElement("div");
    empty.className = "session-empty";
    empty.textContent = isEn() ? "No sessions yet" : "还没坐过桌";
    body.appendChild(empty);
    return;
  }
  sessions.forEach(function(rec){
    const row = document.createElement("div");
    row.className = "session-row";
    const pnlCls = rec.pnl >= 0 ? "pos" : "neg";
    const pnlText = (rec.pnl >= 0 ? "+" : "") + fmtNum(rec.pnl);
    const cashout = (rec.buyIn || 0) + (rec.pnl || 0);
    const modeTag = rec.mode === 'real' ? (isEn() ? ' · Chain' : ' · 链上')
                    : (rec.mode === 'points' ? (isEn() ? ' · Points' : ' · 积分') : ' · AI');
    row.innerHTML =
      '<span>' + rec.table + modeTag + '</span>' +
      '<span>' + rec.blinds + '</span>' +
      '<span>' + fmtNum(rec.buyIn) + '</span>' +
      '<span>' + fmtNum(cashout) + '</span>' +
      '<span class="' + pnlCls + '">' + pnlText + '</span>' +
      '<span>' + (rec.hands || 0) + '</span>' +
      '<span>' + (rec.pnl > 0 ? '✓' : '—') + '</span>' +
      '<span>' + (isEn() ? 'Left' : '已离桌') + '</span>';
    body.appendChild(row);
  });
}

/* ========== 大厅 ========== */
function renderLobby(){
  renderTableGrid("aiTableGrid", "ai");
  renderTableGrid("pointsTableGrid", "points");
  renderTableGrid("realTableGrid", "real");
  refreshBalanceUI();
}

function renderTableGrid(containerId, mode){
  const grid = $(containerId);
  if(!grid) return;
  grid.innerHTML = "";

  LEVELS.forEach(function(lv){
    const card = document.createElement("div");
    card.className = "table-card";

    let totalSeats = mode === 'ai' ? G.aiSeats : ONLINE_MAX_SEATS;
    let seatDots = "";
    for(let i = 0; i < totalSeats; i++){
      const angle = -90 + (360 / totalSeats) * i;
      const rad = angle * Math.PI / 180;
      const x = 50 + 40 * Math.cos(rad);
      const y = 50 + 40 * Math.sin(rad);
      const isEmpty = mode === 'ai' ? (i >= totalSeats - 1) : true;
      seatDots += '<div class="dot-seat' + (isEmpty ? ' empty' : '') + '" style="left:' + x + '%;top:' + y + '%;transform:translate(-50%,-50%);"></div>';
    }

    const preview =
      '<div class="table-card-preview">' +
        '<div class="seats">' + seatDots + '</div>' +
        '<div class="card-row">' +
          '<div class="mini-blank"></div><div class="mini-blank"></div>' +
          '<div class="mini-blank"></div><div class="mini-blank"></div>' +
          '<div class="mini-blank"></div>' +
        '</div>' +
      '</div>';

    const nameText = lv.name + (isEn() ? ' Table' : ' 桌');
    const blindsLabel = isEn() ? ('Blinds ' + lv.sb + '/' + lv.bb) : ('盲注 ' + lv.sb + '/' + lv.bb);
    const buyInLabel = isEn() ? 'Buy-in' : '买入';
    const buyInText = fmtNum(lv.buyMin) + '–' + fmtNum(lv.buyMax);
    const rightText = mode === 'real' ? ('≈ ' + toBem(lv.buyMin) + ' BEM') : (mode === 'points' ? (isEn() ? 'Points' : '积分') : (isEn() ? 'Free' : '免费'));

    let topRight = '';
    if(mode !== 'ai'){
      const count = window.PokerMQTT ? PokerMQTT.getRooms().filter(function(r){
        return r.level === lv.key && r.mode === mode;
      }).length : 0;
      if(count > 0){
        topRight = '<span class="room-count-badge"><span class="pulse"></span>' + count + (isEn() ? ' tables' : ' 桌') + '</span>';
      } else {
        topRight = '<span class="room-count-badge zero">' + (isEn() ? 'No tables' : '暂无房间') + '</span>';
      }
    }

    let actionsHtml;
    if(mode === 'ai'){
      actionsHtml = '<button class="btn-seat">' + (isEn() ? 'Take a seat' : '立即入座') + '</button>';
    } else {
      actionsHtml =
        '<button class="btn-create">' + (isEn() ? 'Create room' : '创建房间') + '</button>' +
        '<button class="btn-join">' + (isEn() ? 'Join room' : '加入房间') + '</button>';
    }

    card.innerHTML =
      '<div class="table-card-head">' +
        '<div class="table-card-avatar">' + lv.name.charAt(0) + '</div>' +
        '<div class="table-card-title">' +
          '<div class="table-card-name">' + nameText + '</div>' +
          '<div class="table-card-blinds">' + blindsLabel + '</div>' +
        '</div>' + topRight +
      '</div>' + preview +
      '<div class="table-card-meta">' +
        '<span>' + buyInLabel + ' <strong>' + buyInText + '</strong></span>' +
        '<span>' + rightText + '</span>' +
      '</div>' +
      '<div class="table-card-actions">' + actionsHtml + '</div>';

    if(mode === 'ai'){
      card.querySelector(".btn-seat").onclick = function(){ openAiLevel(lv); };
    } else {
      card.querySelector(".btn-create").onclick = function(){ createRoom(lv, mode); };
      card.querySelector(".btn-join").onclick = function(){ joinRoomByCode(lv, mode); };
    }
    grid.appendChild(card);
  });

  if(mode !== 'ai') renderRoomList(mode);
}

function renderRoomList(mode){
  const listEl = $(mode === 'points' ? 'pointsRoomList' : 'realRoomList');
  if(!listEl) return;
  listEl.innerHTML = "";
  const rooms = window.PokerMQTT ? PokerMQTT.getRooms().filter(function(r){ return r.mode === mode; }) : [];
  if(rooms.length === 0) return;

  rooms.forEach(function(r){
    const item = document.createElement("div");
    item.className = "room-item";
    const initial = (r.hostName || 'P').charAt(0).toUpperCase();
    item.innerHTML =
      '<div class="room-item-avatar">' + initial + '</div>' +
      '<div class="room-item-info">' +
        '<div class="room-item-name">' + r.hostName + (isEn() ? "'s room" : " 的房间") + '</div>' +
        '<div class="room-item-meta">' + r.roomId + ' · ' + r.playerCount + '/' + r.maxPlayers + '</div>' +
      '</div>' +
      '<button class="room-item-join">' + (isEn() ? 'Join' : '加入') + '</button>';
    item.querySelector(".room-item-join").onclick = function(){
      const lv = LEVELS.find(function(l){ return l.key === r.level; }) || LEVELS[0];
      doJoinRoom(lv, mode, r.roomId);
    };
    listEl.appendChild(item);
  });
}

/* ========== AI 场 ========== */
function openAiLevel(lv){
  G.gameMode = 'ai';
  let ai = PokerStorage.getAiChips();
  if(ai < lv.buyMin){ PokerStorage.addAiChips(10000); ai = PokerStorage.getAiChips(); }
  const buyIn = Math.min(lv.buyMax, ai);
  PokerStorage.setAiChips(ai - buyIn);
  G.sessionBuyIn = buyIn;
  G.totalPlayers = G.aiSeats;
  G.tableMode = lv.key;
  G.tableLabel = lv.name;
  G.smallBlind = lv.sb;
  G.bigBlind = lv.bb;
  G.lastRaiseAmount = lv.bb;
  G.sessionHands = 0;
  G.online.active = false;

  const human = PokerAvatars.HUMAN;
  G.players = [{
    id:0, name:PokerStorage.getNickname() || human.name, emoji:human.emoji, bg:human.bg,
    isHuman:true, chips:G.sessionBuyIn,
    holeCards:[], folded:false, allIn:false, currentBet:0,
    totalContributed:0, needsToAct:false,
    position:"", positionKey:"", lastAction:"", styleKey:null,
    revealCards:false, _highlight:null, preflopOrder:0, postflopOrder:0
  }];

  const profiles = PokerAvatars.pickProfiles(G.totalPlayers - 1);
  const styleKeys = Object.keys(PokerAI.STYLES);
  const shuffled = styleKeys.slice().sort(function(){ return Math.random() - 0.5; });
  for(let i = 1; i < G.totalPlayers; i++){
    const aiBuy = Math.floor(lv.buyMin + Math.random() * (lv.buyMax - lv.buyMin));
    G.players.push({
      id:i, name:profiles[i-1].name, emoji:profiles[i-1].emoji, bg:profiles[i-1].bg,
      isHuman:false, chips:aiBuy,
      holeCards:[], folded:false, allIn:false, currentBet:0,
      totalContributed:0, needsToAct:false,
      position:"", positionKey:"", lastAction:"", styleKey:shuffled[(i-1) % shuffled.length],
      revealCards:false, _highlight:null, preflopOrder:0, postflopOrder:0
    });
  }

  G.seatPositions = computeSeatPositions(G.players.length);
  G.dealerIndex = Math.floor(Math.random() * G.players.length);
  G.handNumber = 0;
  G.gameOver = false;

  $("lobbyScreen").classList.add("hidden");
  $("gameScreen").classList.remove("hidden");
  $("onlineLobby").classList.add("hidden");
  if($("gameLevelLabel")) $("gameLevelLabel").textContent = lv.name + " " + lv.sb + "/" + lv.bb + " · " + G.players.length + (isEn() ? "P" : "人");
  if($("gameModeLabel")){ $("gameModeLabel").textContent = isEn() ? "AI" : "AI 练习"; $("gameModeLabel").classList.remove('real'); }
  if($("gameWalletPill")) $("gameWalletPill").innerHTML = '<span class="dot"></span><span>' + (isEn() ? "AI practice" : "AI 练习模式") + '</span>';

  startNewHandAi();
}

/* ========== 联机创建/加入 ========== */
function checkOnlinePreconditions(lv, mode){
  if(mode === 'real'){
    if(!window.PokerWallet || !PokerWallet.isConnected()){
      alert(isEn() ? "Connect wallet first" : "请先连接钱包");
      $("walletOverlay").classList.remove("hidden");
      return false;
    }
    if(PokerStorage.getRealChips() < lv.buyMin){
      alert(isEn() ? "Not enough chips. Deposit BEM first." : "对战场筹码不足，请先充值 BEM");
      return false;
    }
  } else {
    if(PokerStorage.getPoints() < lv.buyMin){
      alert(isEn() ? "Not enough points." : "积分不足，请先领取每日积分");
      return false;
    }
  }
  return true;
}

function generateRoomId(lv, mode){
  const rand = Math.random().toString(36).slice(2, 7);
  return lv.key + '-' + (mode === 'real' ? 'ch' : 'pt') + '-' + rand;
}

function createRoom(lv, mode){
  if(!checkOnlinePreconditions(lv, mode)) return;
  const roomId = generateRoomId(lv, mode);
  const nickname = PokerStorage.getNickname() || (isEn() ? "Player" : "玩家");

  PokerMQTT.setRoomInfo(lv.key, mode);
  PokerMQTT.createRoom(roomId, {
    level: lv.key, mode: mode, hostName: nickname
  }).then(function(){
    enterOnlineRoom(lv, mode, roomId, true);
  }).catch(function(err){
    console.error(err);
    alert(isEn() ? "MQTT connection failed" : "MQTT 连接失败");
  });
}

function joinRoomByCode(lv, mode){
  if(!checkOnlinePreconditions(lv, mode)) return;
  const overlay = $("joinRoomOverlay");
  overlay.classList.remove("hidden");
  const input = $("joinRoomInput");
  input.value = '';
  $("joinRoomConfirmBtn").onclick = function(){
    const code = input.value.trim();
    if(!code){ alert(isEn() ? "Enter a room code" : "请输入房间号"); return; }
    overlay.classList.add("hidden");
    doJoinRoom(lv, mode, code);
  };
  $("joinRoomCancelBtn").onclick = function(){ overlay.classList.add("hidden"); };
  setTimeout(function(){ input.focus(); }, 100);
}

function doJoinRoom(lv, mode, roomId){
  PokerMQTT.setRoomInfo(lv.key, mode);
  PokerMQTT.joinRoom(roomId).then(function(){
    enterOnlineRoom(lv, mode, roomId, false);
  }).catch(function(err){
    console.error(err);
    alert(isEn() ? "MQTT connection failed" : "MQTT 连接失败");
  });
}

function enterOnlineRoom(lv, mode, roomId, isHost){
  G.gameMode = mode;
  G.tableMode = lv.key;
  G.tableLabel = lv.name;
  G.smallBlind = lv.sb;
  G.bigBlind = lv.bb;
  G.lastRaiseAmount = lv.bb;
  G.gameOver = false;
  G.sessionBuyIn = 10000;
  G.sessionHands = 0;
  G.online = {
    active: true,
    isHost: isHost,
    roomId: roomId,
    mySeat: 0,
    started: false,
    broadcastTimer: null
  };

  $("lobbyScreen").classList.add("hidden");
  $("gameScreen").classList.remove("hidden");
  $("onlineLobby").classList.remove("hidden");

  if($("gameLevelLabel")) $("gameLevelLabel").textContent = lv.name + " " + lv.sb + "/" + lv.bb + " · " + (isEn() ? "Online" : "联机");
  if($("gameModeLabel")){
    if(mode === 'real'){ $("gameModeLabel").textContent = isEn() ? "On-chain" : "链上"; $("gameModeLabel").classList.add('real'); }
    else { $("gameModeLabel").textContent = isEn() ? "Points" : "积分"; $("gameModeLabel").classList.remove('real'); }
  }
  if($("gameWalletPill")) $("gameWalletPill").innerHTML = '<span class="dot" style="background:#a855f7;"></span><span>' + (isEn() ? "Waiting" : "等待中") + '</span>';

  if($("onlineLobbyCode")) $("onlineLobbyCode").textContent = roomId;

  clearLog();
  log((isEn() ? "Room: " : "房间号：") + roomId, "hl");
  log(isEn() ? "Waiting for players..." : "等待其他玩家加入...", "hl");
  updateOnlineLobbyUI();

  const copyBtn = $("copyRoomBtn");
  if(copyBtn) copyBtn.onclick = function(){
    try {
      navigator.clipboard.writeText(roomId);
      copyBtn.textContent = isEn() ? "Copied!" : "已复制";
      setTimeout(function(){ copyBtn.textContent = isEn() ? "Copy" : "复制"; }, 1500);
    } catch(e){ alert(roomId); }
  };

  const readyBtn = $("onlineReadyBtn");
  if(readyBtn) readyBtn.onclick = function(){
    const isReady = PokerMQTT.toggleReady();
    readyBtn.textContent = isReady ? (isEn() ? "Cancel ready" : "取消准备") : (isEn() ? "Ready" : "准备好了");
    updateOnlineLobbyUI();
  };

  const leaveBtn = $("onlineLeaveBtn");
  if(leaveBtn) leaveBtn.onclick = function(){ backToLobby(); };

  /* 客户端立即发 sync_request 请求房主同步 */
  if(!isHost){
    setInterval(function(){
      if(!G.online.active || G.online.isHost) return;
      PokerMQTT.sendRoomMessage({
        type: 'sync_request',
        peerId: PokerMQTT.getMyId()
      });
    }, 1500);
  }
}

function updateOnlineLobbyUI(){
  const players = window.PokerMQTT ? PokerMQTT.getRoomPlayers() : {};
  const ids = Object.keys(players);
  const countEl = $("onlineLobbyCount"); if(countEl) countEl.textContent = ids.length + " / " + ONLINE_MAX_SEATS;
  const listEl = $("onlineLobbyList"); if(!listEl) return;
  listEl.innerHTML = "";
  ids.forEach(function(pid){
    const p = players[pid];
    const row = document.createElement("div");
    row.className = "online-lobby-item";
    const initial = (p.name || 'P').charAt(0).toUpperCase();
    const status = p.ready
      ? '<span class="online-ready">✓ ' + (isEn() ? "Ready" : "已准备") + '</span>'
      : '<span class="online-notready">' + (isEn() ? "Not ready" : "未准备") + '</span>';
    row.innerHTML =
      '<span class="online-player-name">' +
        '<span class="online-avatar">' + initial + '</span> ' +
        (p.isSelf ? "👤 " : "") + p.name + (p.isSelf ? (isEn() ? " (you)" : " (你)") : "") +
      '</span>' + status;
    listEl.appendChild(row);
  });
}

/* ========== 房主：开始游戏 ========== */
function hostStartGame(playerOrder, playersInfo){
  if(!G.online.isHost) return;
  if(G.online.started) return;

  const myId = PokerMQTT.getMyId();
  G.players = playerOrder.map(function(pid, idx){
    const info = playersInfo.find(function(p){ return p.peerId === pid; }) || { name: 'Player' };
    const isSelf = pid === myId;
    return {
      id: idx, peerId: pid,
      name: info.name,
      emoji: isSelf ? PokerAvatars.HUMAN.emoji : '🎮',
      bg: isSelf ? PokerAvatars.HUMAN.bg : 'linear-gradient(135deg,#a855f7,#6d28d9)',
      isHuman: isSelf,
      chips: 10000,
      holeCards: [], folded:false, allIn:false, currentBet:0,
      totalContributed:0, needsToAct:false,
      position:"", positionKey:"", lastAction:"", styleKey:null,
      revealCards:false, _highlight:null, preflopOrder:0, postflopOrder:0
    };
  });
  G.online.mySeat = playerOrder.indexOf(myId);
  G.totalPlayers = G.players.length;
  G.seatPositions = computeSeatPositions(G.players.length);
  G.dealerIndex = Math.floor(Math.random() * G.players.length);
  G.handNumber = 0;
  G.gameOver = false;
  G.online.started = true;

  $("onlineLobby").classList.add("hidden");
  if($("gameWalletPill")) $("gameWalletPill").innerHTML = '<span class="dot" style="background:#a855f7;"></span><span>' + G.players.length + (isEn() ? " players" : " 人联机") + '</span>';

  startNewHandHost();

  /* 房主每 500ms 广播一次状态 */
  if(G.online.broadcastTimer) clearInterval(G.online.broadcastTimer);
  G.online.broadcastTimer = setInterval(function(){
    if(!G.online.active || !G.online.isHost) return;
    broadcastFullState();
  }, 500);
}

/* ========== 房主发一手 ========== */
async function startNewHandHost(){
  G.handNumber++;
  G.sessionHands++;
  G.pot = 0; G.community = [];
  G.currentBet = 0; G.lastRaiseAmount = G.bigBlind;
  G.stage = "preflop"; G.busy = false;
  G.deck = PokerDeck.create();
  PokerDeck.shuffle(G.deck);
  G._renderedCards = new WeakSet();
  stopTurnTimer();

  G.players.forEach(function(p){
    p.folded = p.chips <= 0;
    p.allIn = false;
    p.currentBet = 0;
    p.totalContributed = 0;
    p.needsToAct = false;
    p.lastAction = "";
    p.holeCards = [];
    p.revealCards = false;
    p._highlight = null;
    p._score = null;
  });

  assignPositions();
  computeActionOrders();

  const n = G.players.length;
  for(let r = 0; r < 2; r++){
    for(let i = 1; i <= n; i++){
      const idx = (G.dealerIndex + i) % n;
      const p = G.players[idx];
      if(!p.folded) p.holeCards.push(G.deck.pop());
    }
  }

  clearLog();
  log(t("handNum", { n:G.handNumber }) + " · " + t("dealerIs", { name:G.players[G.dealerIndex].name }), "hl");
  log(t("blindsAre", { sb:G.smallBlind, bb:G.bigBlind }), "hl");

  const gh = $("gameHandLabel");
  if(gh) gh.textContent = t("handShortLabel", { n:G.handNumber });

  render();
  await playDealAnimation();
  postBlinds();
  render();

  /* 翻前初始化 */
  startPreflopHost();

  broadcastFullState();
  runHostTurn();
}

function startPreflopHost(){
  const n = G.players.length;
  G.players.forEach(function(p){ p.needsToAct = !p.folded && !p.allIn && p.chips > 0; });
  /* 2 人桌：庄家(BTN/SB)先行动；多桌：UTG 先动 */
  let idx = n === 2 ? G.dealerIndex : (G.dealerIndex + 3) % n;
  let tries = 0;
  while((G.players[idx].folded || G.players[idx].allIn) && tries < n){ idx = (idx + 1) % n; tries++; }
  G.currentPlayerIndex = idx;
  render();
}

/* ========== 房主回合控制 ========== */
function runHostTurn(){
  if(G.gameOver) return;
  if(countActive() <= 1){ endHandHost(); return; }

  const notAllIn = G.players.filter(function(p){ return !p.folded && !p.allIn; });
  if(notAllIn.length === 0){ advanceStageHost(); return; }
  if(notAllIn.length === 1 && notAllIn.every(function(p){ return !p.needsToAct; })){ advanceStageHost(); return; }

  if(!findNextToAct()){ advanceStageHost(); return; }

  const p = G.players[G.currentPlayerIndex];
  render();
  broadcastFullState();

  if(p.isHuman){
    showHumanControls();
    startTurnTimer(p);
  } else {
    stopTurnTimer();
    if(G._hostTimeout) clearTimeout(G._hostTimeout);
    G._hostTimeout = setTimeout(function(){
      const cur = G.players[G.currentPlayerIndex];
      if(cur === p && !p.folded && !p.allIn && p.needsToAct){
        log(p.name + (isEn() ? " timed out, auto-fold" : " 超时自动弃牌"), "action");
        executeAction(p, { type: 'fold' });
        render();
        broadcastFullState();
        runHostTurn();
      }
    }, 30000);
  }
}

function advanceStageHost(){
  stopTurnTimer();
  if(countActive() <= 1){ endHandHost(); return; }
  G.players.forEach(function(p){ p.currentBet = 0; p.lastAction = ""; });
  G.currentBet = 0; G.lastRaiseAmount = G.bigBlind;

  if(G.stage === "preflop"){
    G.stage = "flop";
    G.community.push(G.deck.pop(), G.deck.pop(), G.deck.pop());
    log(t("flopIs",{cards:G.community.map(function(c){return c.display;}).join("  ")}), "hl");
  } else if(G.stage === "flop"){
    G.stage = "turn";
    G.community.push(G.deck.pop());
    log(t("turnIs",{card:G.community[G.community.length-1].display}), "hl");
  } else if(G.stage === "turn"){
    G.stage = "river";
    G.community.push(G.deck.pop());
    log(t("riverIs",{card:G.community[G.community.length-1].display}), "hl");
  } else if(G.stage === "river"){
    showdownHost();
    return;
  }

  PokerAudio.play('deal');
  G.players.forEach(function(p){
    p.currentBet = 0; p.lastAction = "";
    p.needsToAct = !p.folded && !p.allIn && p.chips > 0;
  });
  G.currentBet = 0; G.lastRaiseAmount = G.bigBlind;
  const n = G.players.length;
  let idx = (G.dealerIndex + 1) % n;
  let tries = 0;
  while((G.players[idx].folded || G.players[idx].allIn) && tries < n){ idx = (idx + 1) % n; tries++; }
  G.currentPlayerIndex = idx;

  render();
  broadcastFullState();
  runHostTurn();
}

function showdownHost(){
  stopTurnTimer();
  G.stage = "showdown";
  G.busy = true;
  log(t("showdownHeader"), "hl");
  PokerAudio.play('showdown');
  const cont = G.players.filter(function(p){ return !p.folded; });
  cont.forEach(function(p){ p.revealCards = false; p._highlight = null; });
  render();
  broadcastFullState();
  let idx = 0;
  function next(){
    if(idx >= cont.length){ setTimeout(function(){ resolveHost(cont); }, 800); return; }
    const p = cont[idx];
    p.revealCards = true;
    render();
    broadcastFullState();
    PokerAudio.play('deal');
    log(t("reveals",{name:p.name,cards:p.holeCards.map(function(c){return c.display;}).join("  ")}), "showdown");
    idx++;
    setTimeout(next, 650);
  }
  next();
}

function resolveHost(cont){
  cont.forEach(function(p){
    const r = PokerEval.bestHand(p.holeCards.concat(G.community));
    p._score = r.score; p._bestCards = r.cards;
    log(t("handResult",{
      name:p.name,
      cards:p.holeCards.map(function(c){return c.display;}).join(" "),
      hand:PokerEval.nameOf(r.score)
    }), "showdown");
  });
  const pots = calculateSidePots();
  const n = pots.length;
  pots.forEach(function(pot, i){
    if(!pot.eligible.length) return;
    let best = null, ws = [];
    pot.eligible.forEach(function(p){
      if(best === null || PokerEval.compare(p._score, best) > 0){ best = p._score; ws = [p]; }
      else if(PokerEval.compare(p._score, best) === 0) ws.push(p);
    });
    const each = Math.floor(pot.amount / ws.length);
    const rem = pot.amount - each * ws.length;
    ws.forEach(function(w, k){ w.chips += each + (k === 0 ? rem : 0); });
    const lbl = n === 1 ? t("pot") : (i === 0 ? t("mainPot") : t("sidePot") + " " + i);
    log(t("winsPotSide",{
      name:ws.map(function(x){return x.name;}).join(", "),
      potLabel:lbl, amt:fmtNum(pot.amount), hand:PokerEval.nameOf(best)
    }), "win");
    if(!ws[0]._highlight && ws[0]._bestCards) ws[0]._highlight = new Set(ws[0]._bestCards);
  });
  const totalPot = pots.reduce(function(s,p){ return s + p.amount; }, 0);
  G.pot = 0; G.busy = false;
  PokerAudio.play('win');
  render();
  broadcastFullState();
  endHandHost(totalPot);
}

function endHandHost(totalPot){
  const me = G.players[G.online.mySeat];
  if(me) PokerStorage.recordHand(me.chips - G.playerHandStartChips, totalPot || 0);
  render();

  const btn = $("nextHandBtn");
  if(btn){
    btn.textContent = "▶ " + t("nextHand");
    btn.classList.remove("hidden");
    btn.disabled = false;
    btn.onclick = function(){
      btn.classList.add("hidden");
      do { G.dealerIndex = (G.dealerIndex + 1) % G.players.length; }
      while(G.players[G.dealerIndex].chips <= 0 && G.players.length > 1);
      startNewHandHost();
    };
  }
}

/* ========== 房主广播完整状态 ========== */
function broadcastFullState(){
  if(!G.online.isHost) return;
  const state = {
    players: G.players.map(function(p){
      return {
        id: p.id, peerId: p.peerId, name: p.name,
        chips: p.chips, folded: p.folded, allIn: p.allIn,
        currentBet: p.currentBet,
        holeCards: p.holeCards,
        lastAction: p.lastAction,
        position: p.position, positionKey: p.positionKey,
        revealCards: p.revealCards,
        preflopOrder: p.preflopOrder, postflopOrder: p.postflopOrder,
        _highlight: p._highlight ? Array.from(p._highlight) : null
      };
    }),
    pot: G.pot, currentBet: G.currentBet, stage: G.stage,
    dealerIndex: G.dealerIndex, currentPlayerIndex: G.currentPlayerIndex,
    community: G.community, handNumber: G.handNumber,
    smallBlind: G.smallBlind, bigBlind: G.bigBlind,
    gameOver: G.gameOver
  };
  PokerMQTT.sendRoomMessage({ type: 'full_state', state: state });
}

/* ========== 客户端：渲染房主推来的状态 ========== */
function applyFullState(state){
  if(!state || !state.players) return;

  /* 首次收到状态，初始化 players */
  const myId = PokerMQTT.getMyId();
  if(!G.players.length || G.players.length !== state.players.length){
    G.players = state.players.map(function(p){
      const isSelf = p.peerId === myId;
      return {
        id: p.id, peerId: p.peerId, name: p.name,
        emoji: isSelf ? PokerAvatars.HUMAN.emoji : '🎮',
        bg: isSelf ? PokerAvatars.HUMAN.bg : 'linear-gradient(135deg,#a855f7,#6d28d9)',
        isHuman: isSelf,
        chips: p.chips,
        holeCards: [], folded:false, allIn:false, currentBet:0,
        totalContributed:0, needsToAct:false,
        position:"", positionKey:"", lastAction:"", styleKey:null,
        revealCards:false, _highlight:null, preflopOrder:0, postflopOrder:0
      };
    });
    G.online.mySeat = state.players.findIndex(function(p){ return p.peerId === myId; });
    G.totalPlayers = G.players.length;
    G.seatPositions = computeSeatPositions(G.players.length);
    G.online.started = true;
    $("onlineLobby").classList.add("hidden");
    if($("gameWalletPill")) $("gameWalletPill").innerHTML = '<span class="dot" style="background:#a855f7;"></span><span>' + G.players.length + (isEn() ? " players" : " 人联机") + '</span>';
  }

  /* 更新玩家状态 */
  state.players.forEach(function(sp, i){
    if(!G.players[i]) return;
    const p = G.players[i];
    p.chips = sp.chips;
    p.folded = sp.folded;
    p.allIn = sp.allIn;
    p.currentBet = sp.currentBet;
    p.holeCards = sp.holeCards || [];
    p.lastAction = sp.lastAction;
    p.position = sp.position;
    p.positionKey = sp.positionKey;
    p.revealCards = sp.revealCards;
    p.preflopOrder = sp.preflopOrder;
    p.postflopOrder = sp.postflopOrder;
    if(sp._highlight) p._highlight = new Set(sp._highlight);
    else p._highlight = null;
  });

  G.pot = state.pot;
  G.currentBet = state.currentBet;
  G.stage = state.stage;
  G.dealerIndex = state.dealerIndex;
  G.currentPlayerIndex = state.currentPlayerIndex;
  G.community = state.community || [];
  G.handNumber = state.handNumber;
  G.smallBlind = state.smallBlind;
  G.bigBlind = state.bigBlind;
  G.gameOver = state.gameOver || false;

  const gh = $("gameHandLabel");
  if(gh) gh.textContent = t("handShortLabel", { n:G.handNumber });

  render();

  /* 是我的回合就显示按钮 */
  if(G.currentPlayerIndex === G.online.mySeat && !G.gameOver && G.stage !== 'showdown'){
    const me = G.players[G.online.mySeat];
    if(me && !me.folded && !me.allIn){
      showHumanControls();
    } else {
      const box = $("humanActions");
      if(box) box.innerHTML = "";
      const panel = $("raisePanel");
      if(panel) panel.classList.add("hidden");
    }
  } else {
    const box = $("humanActions");
    if(box) box.innerHTML = "";
    const panel = $("raisePanel");
    if(panel) panel.classList.add("hidden");
    stopTurnTimer();
  }
}

/* ========== MQTT 消息处理 ========== */
function handleMQTTRoomMessage(msg){
  if(!msg || !msg.type) return;

  if(G.online.isHost){
    /* 房主处理 */
    switch(msg.type){
      case 'host_start_game':
        hostStartGame(msg.playerOrder, msg.players);
        break;

      case 'player_action':
        const player = G.players.find(function(p){ return p.peerId === msg.playerId; });
        if(!player) return;
        if(G.players[G.currentPlayerIndex] !== player) return;
        if(G._hostTimeout) clearTimeout(G._hostTimeout);
        executeAction(player, msg.action);
        render();
        broadcastFullState();
        runHostTurn();
        break;

      case 'sync_request':
        /* 客户端请求同步，立即广播 */
        broadcastFullState();
        break;
    }
    return;
  }

  /* 客户端处理 */
  switch(msg.type){
    case 'player_list':
      updateOnlineLobbyUI();
      break;

    case 'full_state':
      applyFullState(msg.state);
      break;
  }
}

/* ========== 座位 ========== */
function computeSeatPositions(n){
  const pos = [{ x:50, y:50 + 40 }];
  const ai = n - 1;
  if(ai === 0) return pos;
  const R = 40;
  const right = Math.ceil(ai / 2);
  const left = ai - right;
  if(right === 1){ pos.push({ x:50 + R, y:50 }); }
  else {
    for(let i = 0; i < right; i++){
      const tt = i / (right - 1);
      const d = -60 + tt * 120;
      const r = d * Math.PI / 180;
      pos.push({ x:50 + R*Math.cos(r), y:50 + R*Math.sin(r) });
    }
  }
  if(left === 1){ pos.push({ x:50 - R, y:50 }); }
  else if(left > 1){
    for(let i = 0; i < left; i++){
      const tt = i / (left - 1);
      const d = 120 + tt * 120;
      const r = d * Math.PI / 180;
      pos.push({ x:50 + R*Math.cos(r), y:50 + R*Math.sin(r) });
    }
  }
  return pos;
}

function computeActionOrders(){
  const n = G.players.length; if(!n) return;
  let start = (n === 2) ? G.dealerIndex : (G.dealerIndex + 3) % n;
  for(let i = 0; i < n; i++) G.players[(start+i)%n].preflopOrder = i + 1;
  if(n === 2){
    G.players[(G.dealerIndex+1)%n].postflopOrder = 1;
    G.players[G.dealerIndex].postflopOrder = 2;
  } else {
    const s = (G.dealerIndex + 1) % n;
    for(let i = 0; i < n; i++) G.players[(s+i)%n].postflopOrder = i + 1;
  }
}

/* ========== AI 单机（保持原逻辑） ========== */
function flyCard(from, to, delay){
  return new Promise(function(res){
    setTimeout(function(){
      if(!from || !to){ res(); return; }
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const el = document.createElement('div');
      el.className = 'flying-card';
      el.style.left = (a.left + a.width/2 - 12) + 'px';
      el.style.top = (a.top + a.height/2 - 17) + 'px';
      document.body.appendChild(el);
      void el.offsetWidth;
      const dx = (b.left + b.width/2) - (a.left + a.width/2);
      const dy = (b.top + b.height/2) - (a.top + a.height/2);
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.65)';
      el.style.opacity = '0';
      setTimeout(function(){ el.remove(); res(); }, 520);
    }, delay || 0);
  });
}
async function playDealAnimation(){
  const dealer = $("dealerSeat");
  const deck = $("shuffleDeck");
  if(!dealer) return;
  if(deck){
    deck.classList.add("shuffling");
    PokerAudio.play('deal');
    await sleep(560);
    deck.classList.remove("shuffling");
  }
  const proms = [];
  let idx = 0;
  for(let r = 0; r < 2; r++){
    for(let i = 0; i < G.players.length; i++){
      const p = G.players[i];
      if(p.folded) continue;
      const tgt = document.querySelector('.seat[data-pid="' + p.id + '"]');
      if(tgt) proms.push(flyCard(dealer, tgt, idx * 60));
      idx++;
    }
  }
  await Promise.all(proms);
  await sleep(100);
}

async function startNewHandAi(){
  G.handNumber++;
  G.sessionHands++;
  G.pot = 0; G.community = [];
  G.currentBet = 0; G.lastRaiseAmount = G.bigBlind;
  G.stage = "preflop"; G.busy = false;
  G.deck = PokerDeck.create();
  PokerDeck.shuffle(G.deck);
  G._renderedCards = new WeakSet();
  stopTurnTimer();

  G.players.forEach(function(p){
    p.folded = p.chips <= 0; p.allIn = false; p.currentBet = 0;
    p.totalContributed = 0; p.needsToAct = false; p.lastAction = "";
    p.holeCards = []; p.revealCards = false; p._highlight = null; p._score = null;
  });

  G.playerHandStartChips = G.players[0].chips;
  assignPositions();
  computeActionOrders();

  const n = G.players.length;
  for(let r = 0; r < 2; r++){
    for(let i = 1; i <= n; i++){
      const idx = (G.dealerIndex + i) % n;
      const p = G.players[idx];
      if(!p.folded) p.holeCards.push(G.deck.pop());
    }
  }

  clearLog();
  log(t("handNum", { n:G.handNumber }) + " · " + t("dealerIs", { name:G.players[G.dealerIndex].name }), "hl");
  log(t("blindsAre", { sb:G.smallBlind, bb:G.bigBlind }), "hl");

  const gh = $("gameHandLabel");
  if(gh) gh.textContent = t("handShortLabel", { n:G.handNumber });

  render();
  await playDealAnimation();
  postBlinds();
  render();
  startPreflopAi();
}

function startPreflopAi(){
  const n = G.players.length;
  G.players.forEach(function(p){ p.needsToAct = !p.folded && !p.allIn && p.chips > 0; });
  let idx = n === 2 ? G.dealerIndex : (G.dealerIndex + 3) % n;
  let tries = 0;
  while((G.players[idx].folded || G.players[idx].allIn) && tries < n){ idx = (idx + 1) % n; tries++; }
  G.currentPlayerIndex = idx;
  render();
  runTurnAi();
}

function assignPositions(){
  const n = G.players.length;
  const names = {
    2:["posBTNSB","posBB"], 3:["posBTN","posSB","posBB"],
    4:["posBTN","posSB","posBB","posUTG"],
    5:["posBTN","posSB","posBB","posUTG","posCO"],
    6:["posBTN","posSB","posBB","posUTG","posHJ","posCO"],
    7:["posBTN","posSB","posBB","posUTG","posUTG1","posHJ","posCO"]
  }[n] || ["posBTN","posSB","posBB","posUTG","posUTG1","posHJ","posCO"];
  for(let i = 0; i < n; i++){
    const idx = (G.dealerIndex + i) % n;
    G.players[idx].positionKey = names[i];
    G.players[idx].position = t(names[i]);
  }
}

function postBlinds(){
  const n = G.players.length;
  const sbIdx = n === 2 ? G.dealerIndex : (G.dealerIndex + 1) % n;
  const bbIdx = n === 2 ? (G.dealerIndex + 1) % n : (G.dealerIndex + 2) % n;
  const sbP = G.players[sbIdx], bbP = G.players[bbIdx];
  const sb = Math.min(G.smallBlind, sbP.chips);
  sbP.chips -= sb; sbP.currentBet = sb; sbP.totalContributed += sb; G.pot += sb;
  if(sbP.chips === 0) sbP.allIn = true;
  const bb = Math.min(G.bigBlind, bbP.chips);
  bbP.chips -= bb; bbP.currentBet = bb; bbP.totalContributed += bb; G.pot += bb;
  if(bbP.chips === 0) bbP.allIn = true;
  G.currentBet = bb; G.lastRaiseAmount = G.bigBlind;
  log(t("sbBet", { name:sbP.name, amt:sb, name2:bbP.name, amt2:bb }), "action");
}

function countActive(){ return G.players.filter(function(p){ return !p.folded; }).length; }
function findNextToAct(){
  const n = G.players.length;
  for(let k = 0; k < n; k++){
    const idx = (G.currentPlayerIndex + k) % n;
    const p = G.players[idx];
    if(!p.folded && !p.allIn && p.needsToAct && p.chips > 0){
      G.currentPlayerIndex = idx; return true;
    }
  }
  return false;
}

function myIndex(){
  if(G.online.active) return G.online.mySeat;
  return 0;
}

function runTurnAi(){
  if(G.gameOver || G.busy) return;
  if(countActive() <= 1){ endHandAi(); return; }
  const notAllIn = G.players.filter(function(p){ return !p.folded && !p.allIn; });
  if(notAllIn.length === 0){ advanceStageAi(); return; }
  if(!findNextToAct()){ advanceStageAi(); return; }
  const p = G.players[G.currentPlayerIndex];
  render();
  if(p.isHuman){
    showHumanControls();
    PokerAudio.play('turn');
    startTurnTimer(p);
  } else {
    stopTurnTimer();
    G.busy = true;
    const ms = 800 + Math.random() * 2200;
    setTimeout(function(){
      G.busy = false;
      if(G.gameOver) return;
      const action = PokerAI.decide(p, G);
      executeAction(p, action);
      render(); runTurnAi();
    }, ms);
  }
}

function advanceStageAi(){
  stopTurnTimer();
  if(countActive() <= 1){ endHandAi(); return; }
  G.players.forEach(function(p){ p.currentBet = 0; p.lastAction = ""; });
  G.currentBet = 0; G.lastRaiseAmount = G.bigBlind;
  if(G.stage === "preflop"){
    G.stage = "flop";
    G.community.push(G.deck.pop(), G.deck.pop(), G.deck.pop());
    log(t("flopIs",{cards:G.community.map(function(c){return c.display;}).join("  ")}), "hl");
  } else if(G.stage === "flop"){
    G.stage = "turn";
    G.community.push(G.deck.pop());
    log(t("turnIs",{card:G.community[G.community.length-1].display}), "hl");
  } else if(G.stage === "turn"){
    G.stage = "river";
    G.community.push(G.deck.pop());
    log(t("riverIs",{card:G.community[G.community.length-1].display}), "hl");
  } else if(G.stage === "river"){ showdownAi(); return; }
  PokerAudio.play('deal');
  G.players.forEach(function(p){
    p.currentBet = 0; p.lastAction = "";
    p.needsToAct = !p.folded && !p.allIn && p.chips > 0;
  });
  G.currentBet = 0; G.lastRaiseAmount = G.bigBlind;
  const n = G.players.length;
  let idx = (G.dealerIndex + 1) % n;
  let tries = 0;
  while((G.players[idx].folded || G.players[idx].allIn) && tries < n){ idx = (idx + 1) % n; tries++; }
  G.currentPlayerIndex = idx;
  render();
  runTurnAi();
}

function executeAction(player, action){
  if(player.folded || player.allIn) return;
  if(action.type === "fold"){
    player.folded = true; player.needsToAct = false;
    player.lastAction = t("actionFold");
    log(t("playerFolds", { name:player.name }), "action");
    PokerAudio.play('fold'); return;
  }
  if(action.type === "check"){
    player.needsToAct = false;
    player.lastAction = t("actionCheck");
    log(t("playerChecks", { name:player.name }), "action");
    PokerAudio.play('check'); return;
  }
  if(action.type === "call"){
    const toCall = Math.min(player.chips, G.currentBet - player.currentBet);
    player.chips -= toCall; player.currentBet += toCall; player.totalContributed += toCall;
    G.pot += toCall;
    if(player.chips === 0) player.allIn = true;
    player.needsToAct = false;
    player.lastAction = toCall === 0 ? t("actionCheck") : (t("actionCall") + " " + fmtNum(toCall));
    log(toCall === 0 ? t("playerChecks",{name:player.name}) : t("playerCalls",{name:player.name,amt:fmtNum(toCall)}), "action");
    PokerAudio.play(toCall === 0 ? 'check' : 'call'); return;
  }
  if(action.type === "raise"){
    const oldBet = G.currentBet;
    const max = player.chips + player.currentBet;
    let target;
    if(action.target != null){ target = Math.min(action.target, max); }
    else if(G.currentBet === 0){ target = Math.max(G.bigBlind, Math.floor(G.pot * 0.5)); }
    else {
      const minT = G.currentBet + Math.max(G.lastRaiseAmount, G.bigBlind);
      const potT = G.currentBet + Math.floor(G.pot * 0.6);
      target = Math.min(max, Math.max(minT, potT));
    }
    if(target <= G.currentBet){
      const toCall = Math.min(player.chips, G.currentBet - player.currentBet);
      player.chips -= toCall; player.currentBet += toCall; player.totalContributed += toCall;
      G.pot += toCall;
      if(player.chips === 0) player.allIn = true;
      player.needsToAct = false;
      player.lastAction = t("actionCall") + " " + fmtNum(toCall);
      log(t("playerCalls",{name:player.name,amt:fmtNum(toCall)}), "action");
      PokerAudio.play('call'); return;
    }
    const delta = target - player.currentBet;
    if(delta <= 0 || delta > player.chips) return;
    player.chips -= delta;
    player.currentBet = target;
    player.totalContributed += delta;
    G.pot += delta;
    if(player.chips === 0) player.allIn = true;
    if(target - oldBet > G.lastRaiseAmount) G.lastRaiseAmount = target - oldBet;
    if(target > G.currentBet) G.currentBet = target;
    player.needsToAct = false;
    player.lastAction = (oldBet === 0 ? t("actionBet") : t("actionRaiseTo")) + " " + fmtNum(target);
    log(oldBet === 0 ? t("playerBets",{name:player.name,amt:fmtNum(target)}) : t("playerRaises",{name:player.name,amt:fmtNum(target)}), "action");
    PokerAudio.play('raise');
    G.players.forEach(function(p){
      if(p !== player && !p.folded && !p.allIn && p.chips > 0) p.needsToAct = true;
    });
  }
}

function endHandAi(){
  stopTurnTimer();
  const w = G.players.filter(function(p){ return !p.folded; })[0];
  if(!w) return;
  const pot = G.pot;
  w.chips += pot;
  log(t("winsPot",{name:w.name,pot:fmtNum(pot)}), "win");
  PokerAudio.play('win');
  G.pot = 0; G.stage = "showdown";
  const me = G.players[0];
  PokerStorage.recordHand(me.chips - G.playerHandStartChips, pot);
  render();
  if(me.chips <= 0){ setTimeout(showRebuy, 800); return; }
  const btn = $("nextHandBtn");
  if(btn){
    btn.textContent = "▶ " + t("nextHand");
    btn.classList.remove("hidden");
    btn.disabled = false;
    btn.onclick = function(){
      btn.classList.add("hidden");
      do { G.dealerIndex = (G.dealerIndex + 1) % G.players.length; }
      while(G.players[G.dealerIndex].chips <= 0 && G.players.length > 1);
      startNewHandAi();
    };
  }
}

function calculateSidePots(){
  const c = G.players
    .filter(function(p){ return (p.totalContributed||0) > 0; })
    .map(function(p){ return { player:p, amount:p.totalContributed, folded:p.folded }; });
  const pots = [];
  let guard = 0;
  while(c.some(function(x){ return x.amount > 0; }) && guard < 20){
    guard++;
    const a = c.filter(function(x){ return x.amount > 0; });
    if(!a.length) break;
    const minA = Math.min.apply(null, a.map(function(x){ return x.amount; }));
    let amt = 0; const el = [];
    a.forEach(function(x){
      amt += minA; x.amount -= minA;
      if(!x.folded) el.push(x.player);
    });
    pots.push({ amount:amt, eligible:el });
  }
  return pots;
}

function showdownAi(){
  stopTurnTimer();
  G.stage = "showdown";
  G.busy = true;
  log(t("showdownHeader"), "hl");
  PokerAudio.play('showdown');
  const cont = G.players.filter(function(p){ return !p.folded; });
  cont.forEach(function(p){ p.revealCards = false; p._highlight = null; });
  render();
  let idx = 0;
  function next(){
    if(idx >= cont.length){ setTimeout(function(){ resolveAi(cont); }, 800); return; }
    const p = cont[idx];
    p.revealCards = true;
    render();
    PokerAudio.play('deal');
    log(t("reveals",{name:p.name,cards:p.holeCards.map(function(c){return c.display;}).join("  ")}), "showdown");
    idx++;
    setTimeout(next, 650);
  }
  next();
}

function resolveAi(cont){
  cont.forEach(function(p){
    const r = PokerEval.bestHand(p.holeCards.concat(G.community));
    p._score = r.score; p._bestCards = r.cards;
    log(t("handResult",{name:p.name,cards:p.holeCards.map(function(c){return c.display;}).join(" "),hand:PokerEval.nameOf(r.score)}), "showdown");
  });
  const pots = calculateSidePots();
  const n = pots.length;
  pots.forEach(function(pot, i){
    if(!pot.eligible.length) return;
    let best = null, ws = [];
    pot.eligible.forEach(function(p){
      if(best === null || PokerEval.compare(p._score, best) > 0){ best = p._score; ws = [p]; }
      else if(PokerEval.compare(p._score, best) === 0) ws.push(p);
    });
    const each = Math.floor(pot.amount / ws.length);
    const rem = pot.amount - each * ws.length;
    ws.forEach(function(w, k){ w.chips += each + (k === 0 ? rem : 0); });
    const lbl = n === 1 ? t("pot") : (i === 0 ? t("mainPot") : t("sidePot") + " " + i);
    log(t("winsPotSide",{name:ws.map(function(x){return x.name;}).join(", "),potLabel:lbl,amt:fmtNum(pot.amount),hand:PokerEval.nameOf(best)}), "win");
    if(!ws[0]._highlight && ws[0]._bestCards) ws[0]._highlight = new Set(ws[0]._bestCards);
  });
  const totalPot = pots.reduce(function(s,p){ return s + p.amount; }, 0);
  G.pot = 0; G.busy = false;
  PokerAudio.play('win');
  const me = G.players[0];
  PokerStorage.recordHand(me.chips - G.playerHandStartChips, totalPot);
  render();
  if(me.chips <= 0){ setTimeout(showRebuy, 800); return; }
  const btn = $("nextHandBtn");
  if(btn){
    btn.textContent = "▶ " + t("nextHand");
    btn.classList.remove("hidden");
    btn.disabled = false;
    btn.onclick = function(){
      btn.classList.add("hidden");
      do { G.dealerIndex = (G.dealerIndex + 1) % G.players.length; }
      while(G.players[G.dealerIndex].chips <= 0 && G.players.length > 1);
      startNewHandAi();
    };
  }
}

function showRebuy(){
  stopTurnTimer();
  const lv = LEVELS.find(function(l){ return l.key === G.tableMode; }) || LEVELS[0];
  const amount = lv.buyMin;
  $("rebuyOverlay").classList.remove("hidden");
  $("rebuyMsg").textContent = isEn()
    ? "Out of chips. Rebuy amount: " + fmtNum(amount)
    : "你的筹码用完了。补码额度 " + fmtNum(amount);
  $("rebuyGameBtn").onclick = function(){
    $("rebuyOverlay").classList.add("hidden");
    const me = G.players[myIndex()];
    if(G.gameMode === 'ai'){
      let ai = PokerStorage.getAiChips();
      if(ai < amount){ PokerStorage.addAiChips(amount - ai + 5000); ai = PokerStorage.getAiChips(); }
      PokerStorage.setAiChips(ai - amount);
    }
    me.chips = amount;
    G.sessionBuyIn += amount;
    PokerAudio.play('chip');
    do { G.dealerIndex = (G.dealerIndex + 1) % G.players.length; }
    while(G.players[G.dealerIndex].chips <= 0 && G.players.length > 1);
    if(G.gameMode === 'ai') startNewHandAi(); else startNewHandHost();
  };
  $("leaveGameBtn").onclick = function(){
    $("rebuyOverlay").classList.add("hidden");
    backToLobby();
  };
}

function backToLobby(){
  stopTurnTimer();
  if(G._hostTimeout) clearTimeout(G._hostTimeout);
  if(G.online.broadcastTimer){ clearInterval(G.online.broadcastTimer); G.online.broadcastTimer = null; }
  if(G.online.active){ PokerMQTT.leaveRoom(); G.online.active = false; }

  const me = G.players[myIndex()];
  if(me){
    const pnl = me.chips - G.sessionBuyIn;
    if(G.gameMode === 'ai') PokerStorage.addAiChips(me.chips);
    else if(G.gameMode === 'points') PokerStorage.addPoints(me.chips);
    else if(G.gameMode === 'real') PokerStorage.addRealChips(me.chips);
    PokerStorage.addSession({
      table: G.tableLabel, blinds: G.smallBlind + "/" + G.bigBlind,
      buyIn: G.sessionBuyIn, pnl: pnl, hands: G.sessionHands,
      status: 'left', mode: G.gameMode
    });
  }
  G.gameOver = true;
  $("gameScreen").classList.add("hidden");
  $("lobbyScreen").classList.remove("hidden");
  $("onlineLobby").classList.add("hidden");
  $("nextHandBtn").classList.add("hidden");
  $("humanActions").innerHTML = "";
  $("raisePanel").classList.add("hidden");
  $("handCardsLarge").innerHTML = "";
  showScreen("lobby");
  setTimeout(function(){
    renderTableGrid("pointsTableGrid", "points");
    renderTableGrid("realTableGrid", "real");
  }, 500);
}

/* ========== 渲染 ========== */
function renderCardEl(card, mini, hl){
  const d = document.createElement("div");
  const isNew = !G._renderedCards.has(card);
  if(isNew) G._renderedCards.add(card);
  const cls = "face " + (card.red ? "red" : "black") + (hl ? " highlight" : "") + (isNew ? " card-new" : "");
  if(mini){
    d.className = "mini-card " + cls;
    d.innerHTML = '<div class="v">' + card.rank + '</div><div class="s">' + card.suit + '</div>';
  } else {
    d.className = "card " + (card.red ? "red" : "black") + (hl ? " highlight" : "") + (isNew ? " card-new" : "");
    d.innerHTML = '<div class="v">' + card.rank + '</div><div class="s">' + card.suit + '</div>';
  }
  return d;
}
function renderCardBackMini(){ const d = document.createElement("div"); d.className = "mini-card"; return d; }
function posCls(k){
  if(!k) return "";
  if(k === "posBTNSB" || k === "posBTN") return "btn";
  if(k === "posSB") return "sb";
  if(k === "posBB") return "bb";
  return "";
}

function render(){
  if(!G.players.length) return;
  const container = $("seatsLayer");
  if(!container) return;
  container.innerHTML = "";

  for(let i = 0; i < G.players.length; i++){
    const p = G.players[i];
    const style = p.isHuman ? null : PokerAI.STYLES[p.styleKey];
    const seat = document.createElement("div");
    seat.className = "seat";
    seat.setAttribute("data-pid", p.id);
    const pos = G.seatPositions[i] || { x:50, y:50 };
    seat.style.left = pos.x + "%";
    seat.style.top = pos.y + "%";
    if(p.folded) seat.classList.add("folded");
    if(p.revealCards) seat.classList.add("reveal");
    if(G.currentPlayerIndex === i && !G.gameOver && !p.folded && G.stage !== "showdown") seat.classList.add("active");

    let betInfo = "";
    if(p.currentBet > 0) betInfo = t("actionBet") + " " + fmtNum(p.currentBet);
    if(p.lastAction) betInfo += (betInfo ? " · " : "") + p.lastAction;

    const posHtml = p.position ? '<span class="pos-badge ' + posCls(p.positionKey) + '">' + p.position + '</span>' : '';
    let styleHtml = '';
    if(G.online.active){
      styleHtml = '<span class="seat-style">P2P</span>';
    } else if(style){
      styleHtml = '<span class="seat-style">' + t(style.name) + '</span>';
    } else {
      styleHtml = '<span class="seat-style">' + t("handShort") + '</span>';
    }

    let avatarHtml;
    if(G.online.active){
      const initial = (p.name || 'P').charAt(0).toUpperCase();
      avatarHtml = '<div class="avatar-wrap" style="background:' + p.bg + '">' + initial + '</div>';
    } else {
      avatarHtml = '<div class="avatar-wrap" style="background:' + p.bg + '">' + p.emoji + '</div>';
    }

    seat.innerHTML =
      '<div class="seat-head">' + avatarHtml +
        '<div class="seat-meta">' +
          '<div class="seat-name">' + p.name + '</div>' +
          '<div>' + posHtml + styleHtml + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="seat-chips">' + fmtNum(p.chips) + ' ' + t("chips") + '</div>' +
      '<div class="seat-bet">' + betInfo + '</div>' +
      '<div class="seat-cards"></div>';

    const cards = seat.querySelector(".seat-cards");
    if(p.folded || p.holeCards.length < 2){
      const a = renderCardBackMini(); a.style.opacity = ".3";
      const b = renderCardBackMini(); b.style.opacity = ".3";
      cards.appendChild(a); cards.appendChild(b);
    } else if(p.revealCards || i === myIndex()){
      p.holeCards.forEach(function(c){
        cards.appendChild(renderCardEl(c, true, p._highlight && p._highlight.has(c)));
      });
    } else {
      cards.appendChild(renderCardBackMini());
      cards.appendChild(renderCardBackMini());
    }
    container.appendChild(seat);
  }

  const bc = $("boardCards");
  if(bc){
    bc.innerHTML = "";
    const hlSet = new Set();
    G.players.forEach(function(p){ if(p._highlight) p._highlight.forEach(function(c){ hlSet.add(c); }); });
    G.community.forEach(function(c){ bc.appendChild(renderCardEl(c, false, hlSet.has(c))); });
  }

  renderHumanHand();

  const pots = calculateSidePots();
  const pm = $("potMain"), psw = $("potSideWrap"), ps = $("potSide");
  if(pm){
    if(!pots.length){ pm.textContent = fmtNum(G.pot); if(psw) psw.classList.add("hidden"); }
    else {
      pm.textContent = fmtNum(pots[0].amount);
      if(pots.length > 1){
        const s = pots.slice(1).reduce(function(a, p){ return a + p.amount; }, 0);
        if(ps) ps.textContent = fmtNum(s);
        if(psw) psw.classList.remove("hidden");
      } else if(psw) psw.classList.add("hidden");
    }
  }
  const sl = $("stageLabel");
  if(sl) sl.textContent = t(STAGE_KEYS[G.stage] || "stagePreflop");
  updateHandInfo();
}

function renderHumanHand(){
  const me = G.players[myIndex()];
  if(!me) return;
  const c = $("handCardsLarge");
  if(!c) return;
  c.innerHTML = "";
  const bem = $("handBem");
  if(bem) bem.textContent = G.gameMode === 'real' ? "≈ " + toBem(me.chips) + " BEM" : fmtNum(me.chips) + (isEn() ? " chips" : " 筹码");
  if(!me || me.folded || me.holeCards.length < 2){
    const a = document.createElement("div"); a.className = "card"; a.style.opacity = ".2";
    const b = document.createElement("div"); b.className = "card"; b.style.opacity = ".2";
    c.appendChild(a); c.appendChild(b);
    return;
  }
  me.holeCards.forEach(function(card){
    const d = document.createElement("div");
    d.className = "card " + (card.red ? "red" : "black") + (me._highlight && me._highlight.has(card) ? " highlight" : "");
    d.innerHTML = '<div class="v">' + card.rank + '</div><div class="s">' + card.suit + '</div>';
    c.appendChild(d);
  });
}

function updateHandInfo(){
  const el = $("handInfo");
  if(!el) return;
  if(!G.players.length){ el.innerHTML = ""; return; }
  const me = G.players[myIndex()];
  if(!me) return;
  const toCall = Math.max(0, G.currentBet - (me.currentBet || 0));
  el.innerHTML =
    '<div class="row"><span>' + t("infoHand") + '</span><strong>#' + G.handNumber + '</strong></div>' +
    '<div class="row"><span>' + t("infoStage") + '</span><strong>' + t(STAGE_KEYS[G.stage] || "stagePreflop") + '</strong></div>' +
    '<div class="row"><span>' + t("infoPot") + '</span><strong>' + fmtNum(G.pot) + '</strong></div>' +
    '<div class="row"><span>' + t("infoYourBet") + '</span><strong>' + fmtNum(me.currentBet || 0) + '</strong></div>' +
    '<div class="row"><span>' + t("infoToCall") + '</span><strong>' + fmtNum(toCall) + '</strong></div>';
}

function showHumanControls(){
  const me = G.players[myIndex()];
  if(!me) return;
  const box = $("humanActions");
  const panel = $("raisePanel");
  if(!box || !panel) return;
  box.innerHTML = ""; panel.classList.add("hidden");
  if(me.folded || me.allIn || me.chips <= 0) return;
  if(G.currentPlayerIndex !== myIndex()) return;

  const toCall = Math.max(0, G.currentBet - me.currentBet);
  const canCheck = toCall === 0;

  const foldBtn = document.createElement("button");
  foldBtn.className = "danger";
  foldBtn.textContent = t("actionFold");
  foldBtn.onclick = function(){ doHumanAction({ type:"fold" }); };
  box.appendChild(foldBtn);

  const callBtn = document.createElement("button");
  callBtn.textContent = canCheck ? t("actionCheck") : (t("actionCall") + " " + fmtNum(Math.min(me.chips, toCall)));
  callBtn.onclick = function(){ doHumanAction({ type:"call" }); };
  box.appendChild(callBtn);

  if(me.chips > toCall){
    const raiseBtn = document.createElement("button");
    raiseBtn.textContent = canCheck ? t("actionBetMenu") : t("actionRaise");
    raiseBtn.onclick = openRaisePanel;
    box.appendChild(raiseBtn);
  }
}

function openRaisePanel(){
  const me = G.players[myIndex()];
  const panel = $("raisePanel");
  const oldBet = G.currentBet;
  const max = me.chips + me.currentBet;
  let minT = oldBet === 0 ? G.bigBlind * 2 : oldBet * 2;
  const std = oldBet === 0 ? G.bigBlind : (oldBet + Math.max(G.lastRaiseAmount, G.bigBlind));
  if(std > minT) minT = std;
  if(minT > max) minT = max;
  if(max <= oldBet) return;
  G.raiseMin = minT; G.raiseMax = max;
  const sl = $("raiseSlider"); if(sl) sl.value = 0;
  const a = $("raiseMinLabel"), b = $("raiseMaxLabel");
  if(a) a.textContent = fmtNum(minT);
  if(b) b.textContent = fmtNum(max);
  updateRaiseAmount();
  panel.classList.remove("hidden");
}

function updateRaiseAmount(){
  const sl = $("raiseSlider"), d = $("raiseAmountValue");
  if(!sl || !d) return;
  const pct = parseInt(sl.value, 10) / 1000;
  d.textContent = fmtNum(Math.round(G.raiseMin + (G.raiseMax - G.raiseMin) * pct));
}

function applyRaisePreset(preset){
  const me = G.players[myIndex()];
  const oldBet = G.currentBet;
  const max = G.raiseMax;
  const toCall = Math.max(0, oldBet - me.currentBet);
  let target;
  if(preset === 'allin') target = max;
  else {
    const potAfter = G.pot + toCall;
    let amt;
    if(preset === 'half') amt = Math.floor(potAfter * 0.5);
    else if(preset === 'threeQuarter') amt = Math.floor(potAfter * 0.75);
    else amt = potAfter;
    target = oldBet === 0 ? Math.max(G.bigBlind, amt) : (oldBet + amt);
  }
  if(target < G.raiseMin) target = G.raiseMin;
  if(target > max) target = max;
  const range = max - G.raiseMin;
  const pct = range <= 0 ? 0 : (target - G.raiseMin) / range;
  const sl = $("raiseSlider"); if(sl) sl.value = Math.round(pct * 1000);
  updateRaiseAmount();
}

function doHumanAction(action){
  const me = G.players[myIndex()];
  if(!me || me.folded || me.allIn) return;
  if(G.currentPlayerIndex !== myIndex()) return;
  stopTurnTimer();
  $("humanActions").innerHTML = "";
  $("raisePanel").classList.add("hidden");

  /* 联机：客户端发动作给房主；房主本地执行 */
  if(G.online.active && !G.online.isHost){
    PokerMQTT.sendRoomMessage({
      type: 'player_action',
      playerId: PokerMQTT.getMyId(),
      action: action
    });
    return;
  }

  /* 房主或 AI */
  executeAction(me, action);
  render();
  if(G.online.active && G.online.isHost){
    broadcastFullState();
    runHostTurn();
  } else {
    runTurnAi();
  }
}

function startTurnTimer(player){
  stopTurnTimer();
  if(!player || !player.isHuman) return;
  G.turnTimeLeft = 30;
  updateTimerUI();
  const tt = $("turnTimer"); if(tt) tt.classList.remove("hidden");
  G.turnTimer = setInterval(function(){
    G.turnTimeLeft -= 0.1;
    if(G.turnTimeLeft <= 0){
      stopTurnTimer();
      const me = G.players[myIndex()];
      if(me && !me.folded && !me.allIn){
        log(t("timeoutFold", { name:me.name }), "action");
        doHumanAction({ type:"fold" });
      }
      return;
    }
    updateTimerUI();
  }, 100);
}
function stopTurnTimer(){
  if(G.turnTimer){ clearInterval(G.turnTimer); G.turnTimer = null; }
  const tt = $("turnTimer"); if(tt) tt.classList.add("hidden");
}
function updateTimerUI(){
  const f = $("timerFill"), t2 = $("timerText");
  if(!f || !t2) return;
  const pct = Math.max(0, G.turnTimeLeft / 30) * 100;
  f.style.width = pct + "%";
  t2.textContent = Math.ceil(Math.max(0, G.turnTimeLeft)) + "s";
  if(G.turnTimeLeft <= 5){ f.classList.add("warn"); t2.classList.add("warn"); }
  else { f.classList.remove("warn"); t2.classList.remove("warn"); }
}

/* ========== 初始化 ========== */
document.addEventListener("DOMContentLoaded", function(){
  const saved = (function(){
    try { return localStorage.getItem('neon_holdem_lang') || 'zh'; }
    catch(e){ return 'zh'; }
  })();
  PokerI18n.setLang(saved);
  const ls = $("langSelect"); if(ls) ls.value = saved;

  if(ls) ls.addEventListener("change", function(){
    PokerI18n.setLang(this.value);
    try { localStorage.setItem('neon_holdem_lang', this.value); } catch(e){}
    PokerI18n.apply(document);
    renderLobby();
    renderNumbers();
    if(G.players.length && !$("gameScreen").classList.contains("hidden")){
      render();
    }
  });

  document.querySelectorAll(".nav-link").forEach(function(a){
    a.addEventListener("click", function(){ showScreen(a.getAttribute("data-nav")); });
  });

  document.querySelectorAll(".mode-tab").forEach(function(tab){
    tab.addEventListener("click", function(){
      document.querySelectorAll(".mode-tab").forEach(function(x){ x.classList.remove("active"); });
      tab.classList.add("active");
      const mode = tab.getAttribute("data-mode");
      ["aiSection","pointsSection","realSection"].forEach(function(id){
        const el = $(id); if(el) el.classList.add("hidden");
      });
      if(mode === "ai") $("aiSection").classList.remove("hidden");
      else if(mode === "points") $("pointsSection").classList.remove("hidden");
      else {
        $("realSection").classList.remove("hidden");
        if(window.PokerWallet) PokerWallet.updateUI();
      }
    });
  });

  document.querySelectorAll(".seats-btn").forEach(function(btn){
    btn.addEventListener("click", function(){
      document.querySelectorAll(".seats-btn").forEach(function(x){ x.classList.remove("active"); });
      btn.classList.add("active");
      G.aiSeats = parseInt(btn.getAttribute("data-seats"), 10);
      renderTableGrid("aiTableGrid", "ai");
    });
  });

  if(window.PokerMQTT){
    PokerMQTT.init().then(function(){
      PokerMQTT.setLobbyCallback(function(){
        renderTableGrid("pointsTableGrid", "points");
        renderTableGrid("realTableGrid", "real");
      });
      PokerMQTT.setRoomMessageCallback(handleMQTTRoomMessage);
      PokerMQTT.setRoomPlayersCallback(function(){
        updateOnlineLobbyUI();
        if(G.online.isHost && !G.online.started){
          const players = PokerMQTT.getRoomPlayers();
          const ids = Object.keys(players);
          if(ids.length >= 2 && ids.every(function(pid){ return players[pid].ready; })){
            /* 房主会收到 host_start_game 消息，交给 handleMQTTRoomMessage 处理 */
          }
        }
      });
      renderLobby();
    }).catch(function(err){
      console.warn('MQTT init failed', err);
      renderLobby();
    });
  } else {
    renderLobby();
  }

  const qs = $("quickAiBtn");
  if(qs) qs.onclick = function(){ openAiLevel(LEVELS[0]); };

  const aiRb = $("aiRebuyBtn");
  if(aiRb) aiRb.onclick = function(){
    const amt = parseInt($("aiRebuyAmount").value, 10);
    PokerStorage.addAiChips(amt);
    refreshBalanceUI();
  };

  const cp = $("claimPointsBtn");
  if(cp) cp.onclick = function(){
    const res = PokerStorage.claimDailyPoints();
    if(res.ok){
      alert(isEn() ? ("Claimed! +" + res.amount.toLocaleString()) : ("领取成功！+" + res.amount.toLocaleString()));
      refreshBalanceUI();
    } else {
      alert(isEn() ? "Already claimed today." : "今天已经领过了");
    }
  };

  const sn = $("saveNicknameBtn");
  if(sn) sn.onclick = function(){
    const v = $("nicknameInput").value.trim();
    if(!v){ alert(isEn() ? "Enter a nickname" : "请输入昵称"); return; }
    PokerStorage.setNickname(v);
    alert(isEn() ? ("Saved: " + v) : ("已保存：" + v));
  };

  const cw = $("connectWalletBtn");
  const rc = $("realConnectBtn");
  const doConnect = async function(){
    try {
      const res = await PokerWallet.connect();
      if(res){ $("walletOverlay").classList.add("hidden"); refreshBalanceUI(); }
      else { alert(isEn() ? "Connect failed" : "连接失败"); }
    } catch(e){ console.error(e); alert(isEn() ? "Connect failed" : "连接失败"); }
  };
  if(cw) cw.onclick = doConnect;
  if(rc) rc.onclick = doConnect;

  const db = $("depositBtn");
  if(db) db.onclick = async function(){
    if(!PokerWallet.isConnected()){ alert(isEn() ? "Connect wallet first" : "请先连接钱包"); return; }
    const amt = parseFloat($("depositAmount").value);
    if(!amt || amt <= 0){ alert(isEn() ? "Enter an amount" : "请输入充值数量"); return; }
    if(amt < 1){ alert(isEn() ? "Minimum 1 BEM" : "最低充值 1 BEM"); return; }
    try {
      const res = await PokerWallet.depositBem(amt);
      if(res && res.netChips > 0){
        PokerStorage.setRealChips(PokerStorage.getRealChips() + res.netChips);
        refreshBalanceUI();
        $("depositAmount").value = "";
        alert(isEn() ? ("Deposited +" + res.netChips.toLocaleString()) : ("充值成功 +" + res.netChips.toLocaleString()));
      }
    } catch(err){ console.error(err); alert(isEn() ? "Deposit failed" : "充值失败"); }
  };

  const wcb = $("walletConnectBtn");
  if(wcb) wcb.onclick = doConnect;
  const wcl = $("walletCloseBtn");
  if(wcl) wcl.onclick = function(){ $("walletOverlay").classList.add("hidden"); };

  const rnb = $("resetNumbersBtn");
  if(rnb) rnb.onclick = function(){
    if(confirm(isEn() ? "Reset all numbers?" : "确定清空所有战绩记录吗？")){
      PokerStorage.resetStats();
      renderNumbers();
    }
  };

  const back = $("backToLobbyBtn");
  if(back) back.onclick = function(){
    if(confirm(isEn() ? "Leave the table?" : "确定离桌吗？")) backToLobby();
  };
  const ngb = $("newGameBtn");
  if(ngb) ngb.onclick = function(){ $("gameOverOverlay").classList.add("hidden"); backToLobby(); };

  const rs = $("raiseSlider"); if(rs) rs.addEventListener("input", updateRaiseAmount);
  const crb = $("cancelRaiseBtn");
  if(crb) crb.onclick = function(){ $("raisePanel").classList.add("hidden"); };
  const cfr = $("confirmRaiseBtn");
  if(cfr) cfr.onclick = function(){
    const sl = $("raiseSlider");
    const pct = parseInt(sl.value, 10) / 1000;
    const amt = Math.round(G.raiseMin + (G.raiseMax - G.raiseMin) * pct);
    doHumanAction({ type:"raise", target:amt });
  };
  const rp = $("raisePresets");
  if(rp) rp.addEventListener("click", function(e){
    const b = e.target.closest('button[data-preset]');
    if(b) applyRaisePreset(b.getAttribute('data-preset'));
  });
});

})();

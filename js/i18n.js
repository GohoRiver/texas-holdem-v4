window.PokerI18n = (function(){
  const T = {
    zh: {
      navLobby:"大厅", navRules:"规则", navMyNumbers:"我的数据",
      noTables:"0 桌开放", connectWallet:"连接钱包", backToLobby:"大厅",
      tabAi:"AI 练习场", tabPoints:"积分场 · 真人", tabReal:"链上场 · BEM",

      aiBadge:"单机练习 · 无限筹码",
      aiTitle:"无限筹码<br>随便练手",
      aiDesc:"和 AI 对手打牌，不花钱、不注册、不需要钱包。适合熟悉规则、练习 GTO 打法。",
      quickSeat:"⚡ 快速入座", howToPlay:"怎么玩？", youLabel:"你",
      miniPot:"底池 12,400", justNow:"刚刚",
      ticker1:"玩家9021 在 AI 练习场赢下 +5,834", ticker2:"玩家7745 完成 100 手练习",
      ticker3:"玩家0092 在 AI 练习场赢下 +3,566", ticker4:"玩家2210 在 AI 练习场赢下 +500",
      chooseLevel:"选择盲注等级", tableSeats:"桌人数", seatsUnit:"人",
      practiceStats:"练习统计", statHands:"手数", statWinRate:"胜率", statNet:"净盈亏",
      modeInfo:"模式说明", aiInfo:"无限筹码，和 AI 对手打。没有钱包、没有充值，纯练习。",
      myAiChips:"我的 AI 场筹码", aiWinTotal:"累计赢得", rebuy:"补码",
      aiRebuyNote:"筹码跨局累积；赢的每一分都算进总额",

      pointsBadge:"积分场 · 真人 · 每日送 10,000",
      pointsTitle:"真人同桌<br>不花钱也能玩",
      pointsDesc:"每天送 10,000 积分，和真人同桌打。P2P 直连，不经过任何服务器。创建一个房间，把房间号发给朋友即可同桌。",
      claimPoints:"🎁 领取今天的 10,000 积分", myPoints:"我的积分", streak:"连续签到",
      pointsNote:"积分只用来玩，不能充值、提现，也不能换成 BEM",
      pointsStorageWarning:"⚠️ 积分保存在本浏览器，换设备或清除数据后会丢失。想跨设备保留请连接钱包。",
      pointsTables:"积分牌桌（真人对战 · 2-7 人）",

      realBadge:"全链上 · BEM 结算 · 真人",
      realTitle:"真金白银<br>链上公平",
      realDesc:"连接币安 Web3 钱包，充 BEM 换筹码，和真人同桌打。P2P 直连 + 链上结算。",
      walletBem:"钱包 BEM 余额", realBalance:"对战场筹码", walletAddr:"钱包地址",
      deposit:"充值", depositNote:"充值收 2% 手续费；离桌后退回钱包",
      realTables:"链上牌桌（真人对战 · 2-7 人）",

      createRoom:"创建房间",
      joinRoom:"加入房间",
      joinRoomTitle:"加入房间",
      joinRoomDesc:"输入朋友分享的房间号：",
      join:"加入",
      roomsCount:"{n} 桌",
      noRooms:"暂无房间",

      footer1:"1 筹码 = 0.0001 BEM。抽水只在看到翻牌的牌局中收取：底池的 1%，上限 1 个大盲。",
      footer2:"无游戏服务器：牌堆由每位玩家共同加密洗牌，每条消息都签名，每手牌事后都可审计。",

      rulesTitle:"发牌：没有任何人知道整副牌的顺序",
      rulesDesc:"没有庄家、没有发牌服务器。牌堆由全桌每位玩家共同洗牌，只有你能翻开自己的底牌，每一手结束后都可审计。",
      rule1Title:"发牌", rule1Body:"每手开始每位玩家生成临时密钥并公开公钥，合成联合公钥。52 张牌以公开编号开始，从庄位起每人重新加密、置换、广播。最终顺序是所有人洗牌的叠加——只要一人诚实，结果就是均匀随机。",
      rule2Title:"审计：赛后人人可查", rule2Body:"每手打完所有人公开私钥，全桌重放洗牌，验证每一步都是合法置换，作弊者当场点名。公开后整副牌可读，包括弃掉的底牌。",
      rule3Title:"筹码、买入、抽水", rule3Body:"1 筹码 = 0.0001 BEM。链上场入座时把 BEM 换成筹码，离桌时换回。抽水只在看到翻牌的牌局中收取，按底池的 1% 计算、上限 1 个大盲。",
      rule4Title:"三种模式", rule4Body:"AI 练习场：单机，和 4-7 个 AI 对手打，无限筹码。积分场：P2P 真人联机，2-7 人开桌，每天领 10,000 积分。链上场：P2P 真人联机 + BEM 链上结算，2-7 人开桌。",
      rule5Title:"离桌与结算", rule5Body:"离桌时剩余筹码：AI 练习场加回筹码总额，积分场退回积分，链上场退回到对战场筹码。链上场的 BEM 提现需要调用你部署的合约 withdraw 函数。",
      rule6Title:"断线不能赖账", rule6Body:"轮到你下注 30 秒无回应，按弃牌处理。刷新页面不会丢座：45 秒内回来，页面会从本地快照接上。",
      rule7Title:"你在信任什么", rule7Body:"牌的随机性：只要一个人诚实，牌就是随机的。底牌保密：解开需要全桌份额。筹码：链上场由合约托管，只按全桌签名的收据结算。",
      rule8Title:"和其他线上德州扑克不一样的地方", rule8Body:"发牌：没有服务器参与。钱：钱包就是身份，BEM 换成筹码存进合约，离桌后从合约取回。可查：每手审计后整副牌公开，弃掉的牌也看得到。",

      faqTitle:"你可能会问的问题",
      faq1Q:"运营方能不能看牌、出千？", faq1A:"不能。发牌没有服务器参与，运营方看到的和你一样多。唯一能动的是网站代码，更新站点是一笔链上交易，任何人可以比对前后版本。",
      faq2Q:"最后一个洗牌的人能不能操控顺序？", faq2A:"不能。他洗的是看不出内容的密文，连自己洗出来的结果是什么都不知道；赛后审计还会验证每一次洗牌确实是一个合法的排列。",
      faq3Q:"能不能有人串通（几个人联手吃一个人）？", faq3A:"能，和任何线上牌桌一样。链上能证明发牌公平、账目不差一分，但判断不了几个人有没有联手下注。每手审计后所有底牌公开，事后谁在配合看得见。",
      faq4Q:"桌上会不会有机器人？", faq4A:"AI 练习场有 AI 对手，这是设计的一部分。积分场和链上场是真人 P2P 联机。程序和人一样要按规则洗牌、签收据。",
      faq5Q:"网络不好会不会吃亏？", faq5A:"轮到你下注 30 秒没回应，按弃牌并在这手后离桌。刷新页面 45 秒内回来可以接着打。",
      faq6Q:"钱放在哪，运营方跑路怎么办？", faq6A:"链上场的筹码在你部署的合约里（地址 0x19fA…c2c3），合约里只有 deposit 和 withdraw 两个函数，任何人都动不了别人的余额。就算运营方消失，你随时可以调用 withdraw 把 BEM 取回钱包。",
      faq7Q:"要付什么费用？", faq7A:"链上场充值时收 2% 手续费，转给平台收款地址；这之外只有 BSC 网络本身的 Gas 费。AI 场和积分场完全免费。",
      faq8Q:"抽水去了哪里？", faq8A:"链上牌桌的抽水按 1% 计算，封顶 1 个大盲，从主池扣除，进入合约公示的抽水收款地址。充值 2% 手续费直接转给平台地址 0x1219…b19A。",
      faq9Q:"合约审计过吗？", faq9A:"没有经过独立审计。代码公开在 BscScan 上，规则如上，但请按“未审计的合约”来看待它：先小金额试。",
      faq10Q:"我的隐私呢？", faq10A:"你的钱包地址和你打过的每一手（包括弃掉的底牌）都是公开可查的，对手可以复盘你的打法，地址和牌局永久关联。想分开，用单独的钱包。",
      faq11Q:"积分场和链上场是真人吗？", faq11A:"都是真人。积分场用 P2P 直连，不经过任何服务器，房间号发给朋友就能同桌。链上场在 P2P 基础上加了 BEM 链上结算，最少 2 人开桌，最多 7 人。",
      faq12Q:"手机怎么玩？", faq12A:"用 Chrome 或 Safari 打开这个地址，点“连接钱包”会弹出 WalletConnect：跳到手机上的钱包 App 授权。",
      faq13Q:"这合法吗？", faq13A:"各地法规不同，请先确认你所在地允许，再决定是否参与。AI 练习场和积分场没有真实资金，仅供学习和娱乐。",

      myNumbersTitle:"我的数据", myNumbersSub:"0 桌 · 钱包 未连接",
      statTotalPnl:"总盈亏（筹码）", statTables:"打过的桌", statWinRate2:"赢下底池的比例",
      statBiggest:"最大底池", statTotalBuyIn:"累计买入", statTotalCashout:"累计取回",
      curveHint:"打过两桌以上会画出累计曲线", sessionsHeading:"桌次",
      colTable:"桌", colBlinds:"盲注", colBuyIn:"买入", colCashout:"取回",
      colPnl:"盈亏", colHands:"手数", colWon:"赢下", colStatus:"状态",
      resetNumbers:"清空战绩",

      logTitle:"牌局记录", handInfoTitle:"本手信息", dealer:"荷官",
      potLabel:"底池", sidePotLabel:"边池", yourHand:"你的手牌", nextHand:"下一手",
      presetHalf:"1/2 池", presetThreeQuarter:"3/4 池", presetPot:"底池", presetAllin:"全下",
      cancel:"取消", confirm:"确认", rebuyTitle:"筹码耗尽", rebuyContinue:"补码继续", leaveTable:"离桌",
      rebuyMsg:"你的筹码用完了。补码继续，或离桌返回大厅。", gameOverTitle:"对局结束",
      walletTitle:"连接钱包", walletDesc:"请用币安 Web3 钱包或 MetaMask 连接 BNB Chain。",

      actionFold:"弃牌", actionCheck:"过牌", actionCall:"跟注",
      actionBet:"下注", actionRaiseTo:"加注到", actionRaise:"加注…", actionBetMenu:"下注…",
      stagePreflop:"翻牌前", stageFlop:"翻牌", stageTurn:"转牌", stageRiver:"河牌", stageShowdown:"摊牌",
      handNum:"第 {n} 手", dealerIs:"庄家 {name}", blindsAre:"盲注 {sb} / {bb}",
      handShortLabel:"第 {n} 手",
      sbBet:"小盲 {name} 下注 {amt}，大盲 {name2} 下注 {amt2}",
      playerFolds:"{name} 弃牌", playerChecks:"{name} 过牌",
      playerCalls:"{name} 跟注 {amt}", playerBets:"{name} 下注 {amt}",
      playerRaises:"{name} 加注到 {amt}",
      flopIs:"翻牌：{cards}", turnIs:"转牌：{card}", riverIs:"河牌：{card}",
      showdownHeader:"--- 摊牌 ---", reveals:"{name} 亮牌：{cards}",
      handResult:"{name}：{cards} → {hand}",
      winsPot:"{name} 赢得 {pot}（其他玩家全部弃牌）",
      winsPotSide:"{name} 赢得 {potLabel} {amt}（{hand}）",
      pot:"底池", mainPot:"主池", sidePot:"边池", chips:"筹码", hand:"手",
      infoHand:"手数", infoStage:"阶段", infoPot:"底池",
      infoYourBet:"你的下注", infoToCall:"需跟注",
      orderPreflopShort:"翻前", orderPostflopShort:"翻后",
      timeoutFold:"{name} 思考超时，自动弃牌",
      handHighCard:"高牌", handPair:"一对", handTwoPair:"两对",
      handTrips:"三条", handStraight:"顺子", handFlush:"同花",
      handFullHouse:"葫芦", handQuads:"四条", handStraightFlush:"同花顺",
      styleTAG:"紧凶", styleLAG:"松凶", styleNit:"紧弱",
      styleStation:"跟注站", styleManiac:"疯狂型",
      posBTNSB:"BTN/SB", posBTN:"BTN", posSB:"SB", posBB:"BB",
      posUTG:"UTG", posUTG1:"UTG+1", posHJ:"HJ", posCO:"CO", posMP:"MP",
      handShort:"手牌",

      waitingRoomTitle:"联机等待室", roomCode:"房间号", copy:"复制",
      playersOnline:"在线人数", ready:"准备好了", waitingHint:"至少需要 2 人才能开始",
      roomFull:"房间已满（最多 7 人）",
      waitingForPlayers:"等待玩家加入...",
      playerJoined:"玩家加入：", playerLeft:"玩家离开：",
      notReady:"未准备", isReady:"已准备"
    },
    en: {
      navLobby:"Lobby", navRules:"Rules", navMyNumbers:"My numbers",
      noTables:"0 tables open", connectWallet:"Connect wallet", backToLobby:"Lobby",
      tabAi:"AI Practice", tabPoints:"Points · Real", tabReal:"On-chain · BEM",

      aiBadge:"Solo practice · Unlimited chips",
      aiTitle:"Unlimited chips<br>Practice freely",
      aiDesc:"Play against AI. No money, no sign-up, no wallet needed. Perfect for learning rules and GTO.",
      quickSeat:"⚡ Quick seat", howToPlay:"How to play?", youLabel:"You",
      miniPot:"Pot 12,400", justNow:"Just now",
      ticker1:"Player9021 won +5,834 at AI practice", ticker2:"Player7745 played 100 hands",
      ticker3:"Player0092 won +3,566 at AI practice", ticker4:"Player2210 won +500 at AI practice",
      chooseLevel:"Choose blinds level", tableSeats:"Seats", seatsUnit:"seats",
      practiceStats:"Practice stats", statHands:"Hands", statWinRate:"Win rate", statNet:"Net",
      modeInfo:"Mode info", aiInfo:"Unlimited chips, AI opponents. No wallet, no deposit, pure practice.",
      myAiChips:"My AI chips", aiWinTotal:"Total won", rebuy:"Rebuy",
      aiRebuyNote:"Chips carry over between sessions; every win counts",

      pointsBadge:"Points · Real · 10,000 daily",
      pointsTitle:"Real players<br>No money needed",
      pointsDesc:"Get 10,000 points daily. Play with real people via P2P. Create a room and share the code to sit together.",
      claimPoints:"🎁 Claim today's 10,000 points", myPoints:"My points", streak:"Streak",
      pointsNote:"Points are for play only, no deposit, no withdraw, no BEM exchange",
      pointsStorageWarning:"⚠️ Points are stored in this browser only. Switching devices or clearing data will lose them. Connect wallet to keep them across devices.",
      pointsTables:"Points tables (Real · 2-7 players)",

      realBadge:"Full on-chain · BEM · Real players",
      realTitle:"Real money<br>Fair on-chain",
      realDesc:"Connect Binance Web3 Wallet, deposit BEM for chips, play with real people. P2P + on-chain settlement.",
      walletBem:"Wallet BEM balance", realBalance:"On-chain chips", walletAddr:"Wallet address",
      deposit:"Deposit", depositNote:"2% deposit fee; chips return to wallet when you leave",
      realTables:"On-chain tables (Real · 2-7 players)",

      createRoom:"Create room",
      joinRoom:"Join room",
      joinRoomTitle:"Join a Room",
      joinRoomDesc:"Enter the room code shared by your friend:",
      join:"Join",
      roomsCount:"{n} tables",
      noRooms:"No tables yet",

      footer1:"1 chip = 0.0001 BEM. Rake only on flops: 1% of pot, capped at 1 big blind.",
      footer2:"No game server: deck shuffled by every player, every message signed, every hand auditable.",

      rulesTitle:"How the cards are dealt, and why it is fair",
      rulesDesc:"No dealer, no dealing server. The deck is shuffled by every player at the table together, only you can open your own hole cards, and every hand is audited afterwards.",
      rule1Title:"Dealing", rule1Body:"Each player generates a per-hand key and publishes its public half; all public keys combine into the joint key. The 52 cards start as public numbers, from the button on every player re-encrypts, permutes and broadcasts.",
      rule2Title:"Audit: anyone can check afterwards", rule2Body:"When a hand ends everyone reveals their key. The table replays every shuffle and verifies each was a proper permutation. The whole deck is readable afterwards, folded cards included.",
      rule3Title:"Chips, buy-ins, rake", rule3Body:"1 chip = 0.0001 BEM. On-chain tables convert BEM to chips on seat-in, and back on leaving. Rake only on hands that see a flop: 1% of pot, capped at 1 big blind.",
      rule4Title:"Three modes", rule4Body:"AI Practice: solo, 4-7 AI opponents, unlimited chips. Points: P2P real players, 2-7 seats, 10,000 points daily. On-chain: P2P + BEM settlement, 2-7 seats.",
      rule5Title:"Leaving & settlement", rule5Body:"On leaving: AI mode adds chips back to total, Points returns points, On-chain returns on-chain chips. BEM withdrawal on-chain calls your contract's withdraw function.",
      rule6Title:"Disconnecting does not pay", rule6Body:"30 seconds with no response on your turn = fold. Reload within 45 seconds to keep your seat.",
      rule7Title:"What you are trusting", rule7Body:"Randomness: as long as one player is honest, the cards are random. Privacy: opening a card needs every player's share. Chips: on-chain held by contract, paid only on whole-table signed receipts.",
      rule8Title:"What is different from other online poker", rule8Body:"Dealing: no server takes part. Money: wallet is identity, BEM becomes chips held by the contract and comes back when you leave. Verifiable: every hand is audited and the whole deck is public afterwards.",

      faqTitle:"Questions you might have",
      faq1Q:"Can the operator see cards or cheat?", faq1A:"No. No server is involved in dealing; the operator sees exactly what you see. The only thing the operator controls is the site code.",
      faq2Q:"Can the last shuffler control the order?", faq2A:"No. They shuffle ciphertext that reveals nothing, so they cannot even tell what they produced; the post-hand audit also verifies that every shuffle was a proper permutation.",
      faq3Q:"Can players collude?", faq3A:"Yes, as at any online table. The chain can prove the dealing was fair and the accounting exact, but it cannot tell whether several people bet as a team. Every hole card is revealed after each hand.",
      faq4Q:"Will there be bots?", faq4A:"AI Practice has AI opponents by design. Points and On-chain are real P2P games. A program has to shuffle and sign receipts like anyone else.",
      faq5Q:"Does a bad connection cost me?", faq5A:"30 seconds with no response on your turn = fold, and you leave after the hand. Reload within 45 seconds to keep playing.",
      faq6Q:"Where is the money, and what if the operator disappears?", faq6A:"On-chain chips are in the contract you deployed (0x19fA…c2c3). The contract only has deposit and withdraw; no one can touch anyone else's balance. You can call withdraw any time to get your BEM back.",
      faq7Q:"What does it cost?", faq7A:"On-chain deposits take a 2% fee, sent to the platform address; the only other cost is BSC network gas. AI and Points modes are completely free.",
      faq8Q:"Where does the rake go?", faq8A:"On-chain rake is 1% of pot, capped at 1 big blind, out of the main pot, sent to the rake address published in the contract. The 2% deposit fee goes to the platform address 0x1219…b19A.",
      faq9Q:"Are the contracts audited?", faq9A:"No independent audit. The code is public on BscScan and the rules are as above, but treat them as unaudited contracts: start small.",
      faq10Q:"What about my privacy?", faq10A:"Your wallet address and every hand you played, folded cards included, are public; opponents can study your play. Use a separate wallet if you want them apart.",
      faq11Q:"Are Points and On-chain real players?", faq11A:"Yes. Points uses P2P direct connection, no server. On-chain adds BEM settlement on top. Both need at least 2 players to start, max 7.",
      faq12Q:"How do I play on a phone?", faq12A:"Open this address in Chrome or Safari; 'Connect wallet' brings up WalletConnect, which jumps into the wallet app on the phone.",
      faq13Q:"Is this legal where I am?", faq13A:"Laws differ from place to place; check that it is allowed where you are before you play. AI Practice and Points have no real money and are for learning and entertainment only.",

      myNumbersTitle:"My numbers", myNumbersSub:"0 tables · wallet not connected",
      statTotalPnl:"Total P&L (chips)", statTables:"Tables played", statWinRate2:"Pot win rate",
      statBiggest:"Biggest pot", statTotalBuyIn:"Total buy-in", statTotalCashout:"Total cashout",
      curveHint:"Play 2+ tables to see the cumulative curve", sessionsHeading:"Sessions",
      colTable:"Table", colBlinds:"Blinds", colBuyIn:"Buy-in", colCashout:"Cashout",
      colPnl:"P&L", colHands:"Hands", colWon:"Won", colStatus:"Status",
      resetNumbers:"Reset numbers",

      logTitle:"Action Log", handInfoTitle:"Hand Info", dealer:"Dealer",
      potLabel:"Pot", sidePotLabel:"Side pot", yourHand:"Your Hand", nextHand:"Next hand",
      presetHalf:"1/2 Pot", presetThreeQuarter:"3/4 Pot", presetPot:"Pot", presetAllin:"All-in",
      cancel:"Cancel", confirm:"Confirm", rebuyTitle:"Out of Chips", rebuyContinue:"Rebuy & Continue", leaveTable:"Leave",
      rebuyMsg:"Out of chips. Rebuy to keep playing, or leave.", gameOverTitle:"Game Over",
      walletTitle:"Connect Wallet", walletDesc:"Please connect Binance Web3 Wallet or MetaMask to BNB Chain.",

      actionFold:"Fold", actionCheck:"Check", actionCall:"Call",
      actionBet:"Bet", actionRaiseTo:"Raise to", actionRaise:"Raise…", actionBetMenu:"Bet…",
      stagePreflop:"Pre-flop", stageFlop:"Flop", stageTurn:"Turn", stageRiver:"River", stageShowdown:"Showdown",
      handNum:"Hand #{n}", dealerIs:"Dealer {name}", blindsAre:"Blinds {sb} / {bb}",
      handShortLabel:"Hand #{n}",
      sbBet:"SB {name} posts {amt}, BB {name2} posts {amt2}",
      playerFolds:"{name} folds", playerChecks:"{name} checks",
      playerCalls:"{name} calls {amt}", playerBets:"{name} bets {amt}",
      playerRaises:"{name} raises to {amt}",
      flopIs:"Flop: {cards}", turnIs:"Turn: {card}", riverIs:"River: {card}",
      showdownHeader:"--- Showdown ---", reveals:"{name} reveals: {cards}",
      handResult:"{name}: {cards} → {hand}",
      winsPot:"{name} wins pot {pot} (all others folded)",
      winsPotSide:"{name} wins {potLabel} {amt} ({hand})",
      pot:"Pot", mainPot:"Main Pot", sidePot:"Side Pot", chips:"chips", hand:"hand",
      infoHand:"Hand", infoStage:"Stage", infoPot:"Pot",
      infoYourBet:"Your bet", infoToCall:"To call",
      orderPreflopShort:"Pre", orderPostflopShort:"Post",
      timeoutFold:"{name} timed out, auto-fold",
      handHighCard:"High Card", handPair:"One Pair", handTwoPair:"Two Pair",
      handTrips:"Three of a Kind", handStraight:"Straight", handFlush:"Flush",
      handFullHouse:"Full House", handQuads:"Four of a Kind", handStraightFlush:"Straight Flush",
      styleTAG:"TAG", styleLAG:"LAG", styleNit:"Nit",
      styleStation:"Station", styleManiac:"Maniac",
      posBTNSB:"BTN/SB", posBTN:"BTN", posSB:"SB", posBB:"BB",
      posUTG:"UTG", posUTG1:"UTG+1", posHJ:"HJ", posCO:"CO", posMP:"MP",
      handShort:"Hand",

      waitingRoomTitle:"Online Lobby", roomCode:"Room code", copy:"Copy",
      playersOnline:"Players online", ready:"Ready", waitingHint:"At least 2 players to start",
      roomFull:"Room is full (max 7)",
      waitingForPlayers:"Waiting for players...",
      playerJoined:"Player joined: ", playerLeft:"Player left: ",
      notReady:"Not ready", isReady:"Ready"
    }
  };

  let current = 'zh';
  function t(key, vars){
    const lang = T[current] || T.zh;
    let s = lang[key];
    if(s === undefined) s = T.zh[key];
    if(s === undefined) s = key;
    if(vars){
      s = s.replace(/\{(\w+)\}/g, function(m, k){
        return vars[k] !== undefined ? String(vars[k]) : m;
      });
    }
    return s;
  }
  function setLang(l){ if(T[l]) current = l; }
  function getLang(){ return current; }
  function apply(root){
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function(el){
      const key = el.getAttribute('data-i18n');
      const v = t(key);
      if(v.indexOf('<br>') !== -1 || v.indexOf('<') !== -1){
        el.innerHTML = v;
      } else {
        el.textContent = v;
      }
    });
  }
  return { t: t, setLang: setLang, getLang: getLang, apply: apply };
})();
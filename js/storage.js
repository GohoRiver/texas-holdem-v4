window.PokerStorage = (function(){
  const AI_CHIPS_KEY = 'neon_holdem_ai_chips_v3';
  const REAL_CHIPS_KEY = 'neon_holdem_real_chips_v3';
  const POINTS_KEY = 'neon_holdem_points_v3';
  const POINTS_LAST_CLAIM_KEY = 'neon_holdem_points_last_claim_v3';
  const POINTS_STREAK_KEY = 'neon_holdem_points_streak_v3';
  const NICKNAME_KEY = 'neon_holdem_nickname_v3';
  const STATS_KEY = 'neon_holdem_stats_v3';
  const VOLUME_KEY = 'neon_holdem_volume_v3';

  function safeGet(key, fallback){
    try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
    catch(e){ return fallback; }
  }
  function safeSet(key, val){
    try { localStorage.setItem(key, val); } catch(e){}
  }

  /* ========= AI 练习场筹码（跨局累积） ========= */
  function getAiChips(){
    const v = parseInt(safeGet(AI_CHIPS_KEY, '0'), 10);
    return isNaN(v) ? 0 : Math.max(0, v);
  }
  function setAiChips(v){ safeSet(AI_CHIPS_KEY, String(Math.max(0, Math.floor(v)))); }
  function addAiChips(v){ setAiChips(getAiChips() + Math.floor(v)); }
  function resetAiChips(){ setAiChips(0); }

  /* ========= 链上场筹码 ========= */
  function getRealChips(){
    const v = parseInt(safeGet(REAL_CHIPS_KEY, '0'), 10);
    return isNaN(v) ? 0 : Math.max(0, v);
  }
  function setRealChips(v){ safeSet(REAL_CHIPS_KEY, String(Math.max(0, Math.floor(v)))); }
  function addRealChips(v){ setRealChips(getRealChips() + Math.max(0, Math.floor(v))); }
  function resetRealChips(){ setRealChips(0); }

  /* ========= 积分场 ========= */
  function getPoints(){
    const v = parseInt(safeGet(POINTS_KEY, '0'), 10);
    return isNaN(v) ? 0 : Math.max(0, v);
  }
  function setPoints(v){ safeSet(POINTS_KEY, String(Math.max(0, Math.floor(v)))); }
  function addPoints(v){ setPoints(getPoints() + Math.max(0, Math.floor(v))); }
  function resetPoints(){ setPoints(0); }

  function getLastClaimDate(){ return safeGet(POINTS_LAST_CLAIM_KEY, ''); }
  function setLastClaimDate(d){ safeSet(POINTS_LAST_CLAIM_KEY, d || ''); }
  function getPointsStreak(){
    const v = parseInt(safeGet(POINTS_STREAK_KEY, '0'), 10);
    return isNaN(v) ? 0 : Math.max(0, v);
  }
  function setPointsStreak(v){ safeSet(POINTS_STREAK_KEY, String(Math.max(0, Math.floor(v)))); }

  function canClaimToday(){
    const today = new Date().toISOString().slice(0, 10);
    return getLastClaimDate() !== today;
  }
  function claimDailyPoints(){
    const today = new Date().toISOString().slice(0, 10);
    if(getLastClaimDate() === today){
      return { ok: false, amount: 0, streak: getPointsStreak() };
    }
    const lastDate = getLastClaimDate();
    let streak = getPointsStreak();
    if(lastDate){
      const last = new Date(lastDate);
      const now = new Date(today);
      const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));
      if(diffDays === 1){ streak += 1; } else { streak = 1; }
    } else { streak = 1; }
    const baseAmount = 10000;
    const amount = (streak % 7 === 0) ? baseAmount * 3 : baseAmount;
    addPoints(amount);
    setLastClaimDate(today);
    setPointsStreak(streak);
    return { ok: true, amount: amount, streak: streak };
  }

  /* ========= 昵称 ========= */
  function getNickname(){ return safeGet(NICKNAME_KEY, ''); }
  function setNickname(n){ safeSet(NICKNAME_KEY, String(n || '').slice(0, 12)); }

  /* ========= 兼容旧接口 ========= */
  function getChips(){ return getAiChips(); }
  function setChips(v){ setAiChips(v); }
  function addChips(v){ addAiChips(v); }
  function resetChips(){ resetAiChips(); }

  /* ========= 战绩 ========= */
  function getStats(){
    const raw = safeGet(STATS_KEY, null);
    if(!raw) return { hands: 0, wins: 0, biggestPot: 0, netGain: 0, sessions: [] };
    try {
      const s = JSON.parse(raw);
      return {
        hands: s.hands || 0,
        wins: s.wins || 0,
        biggestPot: s.biggestPot || 0,
        netGain: s.netGain || 0,
        sessions: Array.isArray(s.sessions) ? s.sessions : []
      };
    } catch(e){
      return { hands: 0, wins: 0, biggestPot: 0, netGain: 0, sessions: [] };
    }
  }
  function recordHand(delta, potSize){
    const s = getStats();
    s.hands += 1;
    if(delta > 0) s.wins += 1;
    s.netGain += delta;
    if(potSize > s.biggestPot) s.biggestPot = potSize;
    safeSet(STATS_KEY, JSON.stringify(s));
    return s;
  }
  function addSession(rec){
    const s = getStats();
    s.sessions = s.sessions || [];
    s.sessions.unshift({
      table: rec.table || 'Nano',
      blinds: rec.blinds || '1/2',
      buyIn: rec.buyIn || 0,
      pnl: rec.pnl || 0,
      hands: rec.hands || 0,
      status: rec.status || 'left',
      mode: rec.mode || 'ai',
      date: rec.date || Date.now()
    });
    if(s.sessions.length > 30) s.sessions = s.sessions.slice(0, 30);
    safeSet(STATS_KEY, JSON.stringify(s));
  }
  function resetStats(){
    safeSet(STATS_KEY, JSON.stringify({
      hands: 0, wins: 0, biggestPot: 0, netGain: 0, sessions: []
    }));
  }

  function getVolume(){
    const v = parseFloat(safeGet(VOLUME_KEY, '0.7'));
    return isNaN(v) ? 0.7 : Math.max(0, Math.min(1, v));
  }
  function setVolume(v){ safeSet(VOLUME_KEY, String(Math.max(0, Math.min(1, v)))); }

  return {
    getAiChips, setAiChips, addAiChips, resetAiChips,
    getRealChips, setRealChips, addRealChips, resetRealChips,
    getPoints, setPoints, addPoints, resetPoints,
    canClaimToday, claimDailyPoints, getPointsStreak,
    getNickname, setNickname,
    getChips, setChips, addChips, resetChips,
    getStats, recordHand, addSession, resetStats,
    getVolume, setVolume
  };
})();
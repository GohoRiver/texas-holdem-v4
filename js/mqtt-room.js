window.PokerMQTT = (function(){
  /* EMQX 公共 broker，免费无需注册 */
  const BROKER = 'wss://broker.emqx.io:8084/mqtt';
  const TOPIC_PREFIX = 'tapeout-poker-v1';
  const LOBBY_TOPIC = TOPIC_PREFIX + '/lobby';
  const HEARTBEAT_INTERVAL = 4000;
  const ROOM_TIMEOUT = 15000;

  let client = null;
  let myId = null;
  let nickname = 'Player';
  let currentRoomId = null;
  let isHost = false;

  /* 房间列表 */
  let rooms = {};
  /* 我的房间内的玩家列表（peerId -> {name, ready, seat}） */
  let roomPlayers = {};
  /* 消息回调 */
  let onLobbyUpdate = null;
  let onRoomMessage = null;
  let onRoomPlayersUpdate = null;

  let heartbeatTimer = null;
  let lobbyCleanTimer = null;

  function init(){
    myId = 'p-' + Math.random().toString(36).slice(2, 10);
    nickname = PokerStorage.getNickname() || 'Player';

    return new Promise(function(resolve, reject){
      client = mqtt.connect(BROKER, {
        clientId: 'tp_' + myId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 2000
      });

      client.on('connect', function(){
        console.log('[MQTT] connected');
        client.subscribe(LOBBY_TOPIC, function(err){
          if(err) console.warn('lobby subscribe failed', err);
          resolve();
        });
        lobbyCleanTimer = setInterval(cleanStaleRooms, 5000);
      });

      client.on('message', function(topic, payload){
        let msg;
        try { msg = JSON.parse(payload.toString()); } catch(e){ return; }
        if(topic === LOBBY_TOPIC){
          handleLobbyMessage(msg);
        } else if(topic === roomTopic(currentRoomId)){
          handleRoomMessage(msg);
        }
      });

      client.on('error', function(err){
        console.warn('[MQTT] error', err);
        reject(err);
      });
    });
  }

  function roomTopic(roomId){
    return TOPIC_PREFIX + '/room/' + roomId;
  }

  /* ========== 大厅 ========== */

  function handleLobbyMessage(msg){
    if(!msg || !msg.type) return;

    if(msg.type === 'announce'){
      /* 房主公告房间 */
      const r = msg.room;
      if(!r || !r.roomId) return;
      if(r.hostId === myId) return; /* 自己的房间跳过 */
      rooms[r.roomId] = Object.assign({}, r, { lastSeen: Date.now() });
      notifyLobby();
    } else if(msg.type === 'leave'){
      if(msg.hostId === myId) return;
      if(rooms[msg.roomId]){
        delete rooms[msg.roomId];
        notifyLobby();
      }
    }
  }

  function cleanStaleRooms(){
    const now = Date.now();
    let changed = false;
    Object.keys(rooms).forEach(function(id){
      if(now - rooms[id].lastSeen > ROOM_TIMEOUT){
        delete rooms[id];
        changed = true;
      }
    });
    if(changed) notifyLobby();
  }

  function notifyLobby(){
    if(onLobbyUpdate) onLobbyUpdate(Object.values(rooms));
  }

  /* 注册大厅回调 */
  function setLobbyCallback(cb){ onLobbyUpdate = cb; }

  /* ========== 创建 / 加入房间 ========== */

  function createRoom(roomId, info){
    isHost = true;
    currentRoomId = roomId;

    return new Promise(function(resolve){
      client.subscribe(roomTopic(roomId), function(){
        /* 登记自己 */
        roomPlayers[myId] = { name: nickname, ready: false, seat: 0, isSelf: true };
        /* 公告房间 */
        broadcastLobbyAnnounce(info);
        /* 开启心跳 */
        if(heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(function(){
          broadcastLobbyAnnounce(info);
        }, HEARTBEAT_INTERVAL);
        resolve();
      });
    });
  }

  function joinRoom(roomId){
    isHost = false;
    currentRoomId = roomId;

    return new Promise(function(resolve){
      client.subscribe(roomTopic(roomId), function(){
        /* 发送加入请求 */
        publish(roomTopic(roomId), {
          type: 'join_request',
          peerId: myId,
          name: nickname
        });
        resolve();
      });
    });
  }

  function broadcastLobbyAnnounce(extra){
    const roomInfo = Object.assign({
      roomId: currentRoomId,
      hostId: myId,
      hostName: nickname,
      playerCount: Object.keys(roomPlayers).length,
      level: extra.level,
      mode: extra.mode,
      maxPlayers: 7
    }, extra);
    publish(LOBBY_TOPIC, { type: 'announce', room: roomInfo });
  }

  function updateRoomInfo(extra){
    if(isHost) broadcastLobbyAnnounce(extra);
  }

  function leaveRoom(){
    if(!currentRoomId) return;
    publish(roomTopic(currentRoomId), {
      type: 'leave',
      peerId: myId
    });
    if(isHost){
      publish(LOBBY_TOPIC, { type: 'leave', roomId: currentRoomId, hostId: myId });
    }
    client.unsubscribe(roomTopic(currentRoomId));
    if(heartbeatTimer){ clearInterval(heartbeatTimer); heartbeatTimer = null; }
    currentRoomId = null;
    isHost = false;
    roomPlayers = {};
  }

  /* ========== 房间消息 ========== */

  function handleRoomMessage(msg){
    if(!msg || !msg.type) return;

    switch(msg.type){
      case 'join_request':
        /* 房主处理：把新玩家加入列表 */
        if(!isHost) return;
        if(!roomPlayers[msg.peerId]){
          roomPlayers[msg.peerId] = {
            name: msg.name || 'Player',
            ready: false,
            seat: Object.keys(roomPlayers).length,
            isSelf: false
          };
          /* 广播当前完整玩家列表 */
          broadcastRoomPlayers();
          /* 通知房主更新大厅公告 */
          broadcastLobbyAnnounce({ level: currentLevel, mode: currentMode });
          notifyRoomPlayers();
        }
        break;

      case 'player_list':
        /* 客户端接收完整玩家列表 */
        if(isHost) return;
        roomPlayers = {};
        msg.players.forEach(function(p){
          roomPlayers[p.peerId] = {
            name: p.name,
            ready: p.ready,
            seat: p.seat,
            isSelf: p.peerId === myId
          };
        });
        notifyRoomPlayers();
        break;

      case 'ready':
        if(roomPlayers[msg.peerId]){
          roomPlayers[msg.peerId].ready = msg.ready;
        }
        /* 房主重新广播 */
        if(isHost) broadcastRoomPlayers();
        notifyRoomPlayers();
        if(isHost) tryStartGame();
        break;

      case 'leave':
        if(roomPlayers[msg.peerId]){
          delete roomPlayers[msg.peerId];
          if(isHost) broadcastRoomPlayers();
          notifyRoomPlayers();
        }
        break;

      case 'game_action':
        /* 玩家操作，转发给房主或广播 */
        if(onRoomMessage) onRoomMessage(msg);
        break;

      case 'game_state':
        /* 房主广播游戏状态 */
        if(!isHost && onRoomMessage) onRoomMessage(msg);
        break;

      case 'game_start':
        /* 游戏开始 */
        if(onRoomMessage) onRoomMessage(msg);
        break;
    }
  }

  /* 房主广播当前玩家列表 */
  function broadcastRoomPlayers(){
    const list = Object.keys(roomPlayers).map(function(pid){
      const p = roomPlayers[pid];
      return { peerId: pid, name: p.name, ready: p.ready, seat: p.seat };
    });
    publish(roomTopic(currentRoomId), {
      type: 'player_list',
      players: list
    });
  }

  function notifyRoomPlayers(){
    if(onRoomPlayersUpdate) onRoomPlayersUpdate(Object.keys(roomPlayers).map(function(pid){
      return Object.assign({ peerId: pid }, roomPlayers[pid]);
    }));
  }

  function tryStartGame(){
    const ids = Object.keys(roomPlayers);
    if(ids.length < 2) return;
    const allReady = ids.every(function(pid){ return roomPlayers[pid].ready; });
    if(!allReady) return;

    /* 房主决定开始顺序 */
    const order = ids.slice().sort();
    publish(roomTopic(currentRoomId), {
      type: 'game_start',
      playerOrder: order,
      hostId: myId
    });
    if(onRoomMessage) onRoomMessage({ type: 'game_start', playerOrder: order, hostId: myId });
  }

  /* ========== 消息发送 ========== */

  function publish(topic, msg){
    if(!client || !client.connected) return;
    client.publish(topic, JSON.stringify(msg));
  }

  function sendRoomMessage(msg){
    if(!currentRoomId) return;
    publish(roomTopic(currentRoomId), msg);
  }

  /* ========== 公开 API ========== */

  let currentLevel = '';
  let currentMode = '';

  return {
    init: init,
    setLobbyCallback: setLobbyCallback,
    setRoomMessageCallback: function(cb){ onRoomMessage = cb; },
    setRoomPlayersCallback: function(cb){ onRoomPlayersUpdate = cb; },
    createRoom: createRoom,
    joinRoom: joinRoom,
    leaveRoom: leaveRoom,
    sendRoomMessage: sendRoomMessage,
    setRoomInfo: function(level, mode){ currentLevel = level; currentMode = mode; updateRoomInfo({ level: level, mode: mode }); },
    toggleReady: function(){
      const me = roomPlayers[myId];
      if(!me) return false;
      me.ready = !me.ready;
      publish(roomTopic(currentRoomId), {
        type: 'ready',
        peerId: myId,
        ready: me.ready
      });
      notifyRoomPlayers();
      return me.ready;
    },
    getMyId: function(){ return myId; },
    getRoomId: function(){ return currentRoomId; },
    getRoomPlayers: function(){ return roomPlayers; },
    isHost: function(){ return isHost; },
    getRooms: function(){ return Object.values(rooms); }
  };
})();
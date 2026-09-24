window.PokerMQTT = (function(){
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

  let rooms = {};
  let roomPlayers = {};
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

      let resolved = false;
      client.on('connect', function(){
        console.log('[MQTT] connected as', myId);
        client.subscribe(LOBBY_TOPIC, function(){
          if(!resolved){ resolved = true; resolve(); }
        });
        lobbyCleanTimer = setInterval(cleanStaleRooms, 5000);
      });

      client.on('message', function(topic, payload){
        let msg;
        try { msg = JSON.parse(payload.toString()); } catch(e){ return; }
        if(topic === LOBBY_TOPIC){
          handleLobbyMessage(msg);
        } else if(currentRoomId && topic === roomTopic(currentRoomId)){
          handleRoomMessage(msg);
        }
      });

      client.on('error', function(err){
        console.warn('[MQTT] error', err);
        if(!resolved){ resolved = true; reject(err); }
      });
    });
  }

  function roomTopic(roomId){
    return TOPIC_PREFIX + '/room/' + roomId;
  }

  function handleLobbyMessage(msg){
    if(!msg || !msg.type) return;
    if(msg.type === 'announce'){
      const r = msg.room;
      if(!r || !r.roomId) return;
      if(r.hostId === myId) return;
      rooms[r.roomId] = Object.assign({}, r, { lastSeen: Date.now() });
      notifyLobby();
    } else if(msg.type === 'leave'){
      if(msg.hostId === myId) return;
      if(rooms[msg.roomId]){ delete rooms[msg.roomId]; notifyLobby(); }
    }
  }

  function cleanStaleRooms(){
    const now = Date.now();
    let changed = false;
    Object.keys(rooms).forEach(function(id){
      if(now - rooms[id].lastSeen > ROOM_TIMEOUT){ delete rooms[id]; changed = true; }
    });
    if(changed) notifyLobby();
  }

  function notifyLobby(){
    if(onLobbyUpdate) onLobbyUpdate(Object.values(rooms));
  }

  function createRoom(roomId, info){
    isHost = true;
    currentRoomId = roomId;
    return new Promise(function(resolve){
      client.subscribe(roomTopic(roomId), function(){
        roomPlayers[myId] = { name: nickname, ready: false, seat: 0, isSelf: true };
        broadcastLobbyAnnounce(info);
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
        /* 连发 5 次 join_request，确保房主收到 */
        for(let i = 0; i < 5; i++){
          setTimeout(function(){
            publish(roomTopic(roomId), {
              type: 'join_request',
              peerId: myId,
              name: nickname
            });
          }, i * 400);
        }
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
      level: '',
      mode: '',
      maxPlayers: 7
    }, extra);
    publish(LOBBY_TOPIC, { type: 'announce', room: roomInfo });
  }

  function leaveRoom(){
    if(!currentRoomId) return;
    publish(roomTopic(currentRoomId), { type: 'leave', peerId: myId });
    if(isHost){
      publish(LOBBY_TOPIC, { type: 'leave', roomId: currentRoomId, hostId: myId });
    }
    client.unsubscribe(roomTopic(currentRoomId));
    if(heartbeatTimer){ clearInterval(heartbeatTimer); heartbeatTimer = null; }
    currentRoomId = null;
    isHost = false;
    roomPlayers = {};
  }

  function handleRoomMessage(msg){
    if(!msg || !msg.type) return;

    switch(msg.type){
      case 'join_request':
        if(!isHost) return;
        if(!roomPlayers[msg.peerId]){
          roomPlayers[msg.peerId] = {
            name: msg.name || 'Player',
            ready: false,
            seat: Object.keys(roomPlayers).length,
            isSelf: false
          };
        }
        /* 每次都回复玩家列表 */
        broadcastRoomPlayers();
        broadcastLobbyAnnounce({ level: currentLevel, mode: currentMode });
        notifyRoomPlayers();
        break;

      case 'player_list':
        if(isHost) return;
        roomPlayers = {};
        msg.players.forEach(function(p){
          roomPlayers[p.peerId] = {
            name: p.name, ready: p.ready, seat: p.seat,
            isSelf: p.peerId === myId
          };
        });
        notifyRoomPlayers();
        break;

      case 'ready':
        if(roomPlayers[msg.peerId]){
          roomPlayers[msg.peerId].ready = msg.ready;
        }
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
        if(onRoomMessage) onRoomMessage(msg);
        break;

      case 'game_state':
        if(onRoomMessage) onRoomMessage(msg);
        break;

      case 'game_start':
        if(onRoomMessage) onRoomMessage(msg);
        break;

      case 'sync_request':
        if(isHost && onRoomMessage) onRoomMessage(msg);
        break;
    }
  }

  function broadcastRoomPlayers(){
    const list = Object.keys(roomPlayers).map(function(pid){
      const p = roomPlayers[pid];
      return { peerId: pid, name: p.name, ready: p.ready, seat: p.seat };
    });
    publish(roomTopic(currentRoomId), { type: 'player_list', players: list });
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
    const order = ids.slice().sort();
    /* 广播 5 次 */
    for(let i = 0; i < 5; i++){
      setTimeout(function(){
        publish(roomTopic(currentRoomId), {
          type: 'game_start',
          playerOrder: order,
          hostId: myId
        });
      }, i * 400);
    }
    if(onRoomMessage) onRoomMessage({ type: 'game_start', playerOrder: order, hostId: myId });
  }

  function publish(topic, msg){
    if(!client || !client.connected) return;
    client.publish(topic, JSON.stringify(msg));
  }

  function sendRoomMessage(msg){
    if(!currentRoomId) return;
    publish(roomTopic(currentRoomId), msg);
  }

  function broadcastGameStart(order){
    for(let i = 0; i < 5; i++){
      setTimeout(function(){
        publish(roomTopic(currentRoomId), {
          type: 'game_start',
          playerOrder: order,
          hostId: myId
        });
      }, i * 300);
    }
  }

  let currentLevel = '';
  let currentMode = '';

  return {
    init: init,
    setLobbyCallback: function(cb){ onLobbyUpdate = cb; },
    setRoomMessageCallback: function(cb){ onRoomMessage = cb; },
    setRoomPlayersCallback: function(cb){ onRoomPlayersUpdate = cb; },
    createRoom: createRoom,
    joinRoom: joinRoom,
    leaveRoom: leaveRoom,
    sendRoomMessage: sendRoomMessage,
    broadcastGameStart: broadcastGameStart,
    broadcastRoomPlayers: broadcastRoomPlayers,
    setRoomInfo: function(level, mode){
      currentLevel = level; currentMode = mode;
      if(isHost && currentRoomId) broadcastLobbyAnnounce({ level: level, mode: mode });
    },
    toggleReady: function(){
      const me = roomPlayers[myId];
      if(!me) return false;
      me.ready = !me.ready;
      publish(roomTopic(currentRoomId), {
        type: 'ready', peerId: myId, ready: me.ready
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

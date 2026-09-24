window.PokerLobby = (function(){
  const REGISTRY_ID = 'poker-lobby-registry-v1';
  const ROOM_TIMEOUT = 10 * 60 * 1000; // 10 分钟没心跳视为过期
  const HEARTBEAT_INTERVAL = 5000;

  let peer = null;
  let myId = null;
  let isRegistry = false;
  let registryConn = null;
  let clientConns = {};
  let rooms = {};
  let onUpdate = null;
  let heartbeatTimer = null;
  let cleanupTimer = null;

  const ICE = {
    iceServers: [
      { urls: 'stun:stun.miwifi.com:3478' },
      { urls: 'stun:stun.chat.bilibili.com:3478' },
      { urls: 'stun:stun.qq.com:3478' },
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  };

  function init(callback){
    onUpdate = callback;
    createClientPeer();
  }

  function createClientPeer(){
    if(peer) { try { peer.destroy(); } catch(e){} }
    peer = new Peer(undefined, { config: ICE });

    peer.on('open', function(id){
      myId = id;
      console.log('[Lobby] my peer id:', id);
      setTimeout(tryConnectAsClient, 300);
    });

    peer.on('error', function(err){
      if(err.type === 'peer-unavailable'){
        console.log('[Lobby] registry not found, becoming registry');
        becomeRegistry();
      } else {
        console.warn('[Lobby] peer error:', err);
      }
    });
  }

  function tryConnectAsClient(){
    if(!peer || peer.destroyed) return;
    registryConn = peer.connect(REGISTRY_ID, { reliable: true });

    registryConn.on('open', function(){
      isRegistry = false;
      console.log('[Lobby] connected to registry');
      registryConn.send({ type: 'hello', peerId: myId });
      notify();
    });

    registryConn.on('data', function(msg){
      if(msg.type === 'rooms'){
        rooms = {};
        (msg.rooms || []).forEach(function(r){ rooms[r.roomId] = r; });
        notify();
      }
    });

    registryConn.on('close', function(){
      console.log('[Lobby] registry disconnected');
      if(!isRegistry) setTimeout(becomeRegistry, 800);
    });

    registryConn.on('error', function(){
      if(!isRegistry) setTimeout(becomeRegistry, 800);
    });
  }

  function becomeRegistry(){
    if(isRegistry) return;
    console.log('[Lobby] attempting to become registry...');
    if(peer) { try { peer.destroy(); } catch(e){} peer = null; }

    peer = new Peer(REGISTRY_ID, { config: ICE });

    peer.on('open', function(){
      isRegistry = true;
      myId = REGISTRY_ID;
      console.log('[Lobby] I am now the registry');
      if(!cleanupTimer) cleanupTimer = setInterval(cleanupRooms, 30000);
      notify();
    });

    peer.on('connection', handleIncoming);

    peer.on('error', function(err){
      if(err.type === 'unavailable-id'){
        console.log('[Lobby] registry id taken, becoming client again');
        isRegistry = false;
        setTimeout(createClientPeer, 1000);
      } else {
        console.warn('[Lobby] registry error:', err);
      }
    });
  }

  function handleIncoming(conn){
    if(!isRegistry){
      try { conn.close(); } catch(e){}
      return;
    }
    clientConns[conn.peer] = conn;

    conn.on('open', function(){
      conn.send({ type: 'rooms', rooms: Object.values(rooms) });
    });

    conn.on('data', function(msg){ handleClientRequest(conn, msg); });

    conn.on('close', function(){ delete clientConns[conn.peer]; });
  }

  function handleClientRequest(conn, msg){
    if(!msg || !msg.type) return;
    if(msg.type === 'create_room'){
      rooms[msg.room.roomId] = Object.assign({}, msg.room, { lastSeen: Date.now() });
      broadcastRooms();
    } else if(msg.type === 'update_room'){
      if(rooms[msg.roomId]){
        rooms[msg.roomId] = Object.assign({}, rooms[msg.roomId], msg.updates, { lastSeen: Date.now() });
        broadcastRooms();
      }
    } else if(msg.type === 'leave_room'){
      delete rooms[msg.roomId];
      broadcastRooms();
    } else if(msg.type === 'heartbeat'){
      if(rooms[msg.roomId]) rooms[msg.roomId].lastSeen = Date.now();
    }
  }

  function broadcastRooms(){
    const list = Object.values(rooms);
    Object.keys(clientConns).forEach(function(pid){
      try { clientConns[pid].send({ type: 'rooms', rooms: list }); } catch(e){}
    });
    notify();
  }

  function notify(){
    if(onUpdate) onUpdate(Object.values(rooms));
  }

  function cleanupRooms(){
    const now = Date.now();
    let changed = false;
    Object.keys(rooms).forEach(function(id){
      if(now - rooms[id].lastSeen > ROOM_TIMEOUT){
        delete rooms[id];
        changed = true;
      }
    });
    if(changed) broadcastRooms();
  }

  /* ========== 公开 API ========== */

  function createRoom(room){
    // room: { roomId, level, mode, hostName, playerCount, maxPlayers }
    room.lastSeen = Date.now();
    if(isRegistry){
      rooms[room.roomId] = room;
      broadcastRooms();
    } else if(registryConn && registryConn.open){
      registryConn.send({ type: 'create_room', room: room });
    }
    // 无论谁创建，本地也记一份
    rooms[room.roomId] = room;
    notify();
    // 心跳
    if(heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(function(){
      if(isRegistry){
        if(rooms[room.roomId]) rooms[room.roomId].lastSeen = Date.now();
      } else if(registryConn && registryConn.open){
        registryConn.send({ type: 'heartbeat', roomId: room.roomId });
      }
    }, HEARTBEAT_INTERVAL);
  }

  function updateRoom(roomId, updates){
    if(rooms[roomId]) Object.assign(rooms[roomId], updates, { lastSeen: Date.now() });
    if(isRegistry){
      if(rooms[roomId]) broadcastRooms();
    } else if(registryConn && registryConn.open){
      registryConn.send({ type: 'update_room', roomId: roomId, updates: updates });
    }
    notify();
  }

  function leaveRoom(roomId){
    if(heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    delete rooms[roomId];
    if(isRegistry){
      broadcastRooms();
    } else if(registryConn && registryConn.open){
      registryConn.send({ type: 'leave_room', roomId: roomId });
    }
    notify();
  }

  function getRooms(){ return Object.values(rooms); }

  function getRoomsByLevel(level, mode){
    return Object.values(rooms).filter(function(r){
      return r.level === level && r.mode === mode;
    });
  }

  function getRoomCount(level, mode){
    return getRoomsByLevel(level, mode).reduce(function(sum, r){
      return sum + (r.playerCount || 1);
    }, 0);
  }

  function getRoomTableCount(level, mode){
    return getRoomsByLevel(level, mode).length;
  }

  return {
    init: init,
    createRoom: createRoom,
    updateRoom: updateRoom,
    leaveRoom: leaveRoom,
    getRooms: getRooms,
    getRoomsByLevel: getRoomsByLevel,
    getRoomCount: getRoomCount,
    getRoomTableCount: getRoomTableCount
  };
})();
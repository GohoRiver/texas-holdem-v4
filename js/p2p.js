window.PokerP2P = (function(){
  let peer = null;
  let connections = {}; // peerId -> DataConnection
  let myPeerId = null;
  let roomId = null;
  let onMessage = null;
  let onPlayerJoin = null;
  let onPlayerLeave = null;

  const PEERBASKET_URL = 'https://peerbasket.bittu.dev/basket/';

  /* 初始化：创建Peer并加入房间 */
  async function init(room, messageHandler, joinHandler, leaveHandler){
    roomId = room;
    onMessage = messageHandler;
    onPlayerJoin = joinHandler;
    onPlayerLeave = leaveHandler;

    // 1. 创建Peer（使用免费的信令服务器）
    peer = new Peer(undefined, {
      config: {
        iceServers: [
          { url: 'stun:stun.l.google.com:19302' }, // 免费的STUN服务器
          { url: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peer.on('open', async (id) => {
      myPeerId = id;
      console.log('我的Peer ID:', id);

      // 2. 向PeerBasket注册自己，并获取房间内其他玩家
      await registerAndFetchPeers();
    });

    // 3. 监听其他玩家的连接
    peer.on('connection', (conn) => {
      setupConnection(conn);
    });

    // 4. 定期刷新，发现新玩家
    setInterval(registerAndFetchPeers, 5000);
  }

  /* 向PeerBasket注册并获取房间内的其他玩家 */
  async function registerAndFetchPeers(){
    if(!myPeerId) return;
    try {
      const res = await fetch(PEERBASKET_URL + roomId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peer_id: myPeerId })
      });
      const data = await res.json();
      const peers = data.peers || [];

      // 连接新发现的玩家
      peers.forEach(id => {
        if(id !== myPeerId && !connections[id]){
          const conn = peer.connect(id, { reliable: true });
          setupConnection(conn);
        }
      });
    } catch(e){
      console.warn('PeerBasket请求失败:', e);
    }
  }

  /* 设置数据通道 */
  function setupConnection(conn){
    conn.on('open', () => {
      connections[conn.peer] = conn;
      console.log('已连接:', conn.peer);
      if(onPlayerJoin) onPlayerJoin(conn.peer);
    });

    conn.on('data', (data) => {
      if(onMessage) onMessage(conn.peer, data);
    });

    conn.on('close', () => {
      delete connections[conn.peer];
      if(onPlayerLeave) onPlayerLeave(conn.peer);
    });
  }

  /* 广播消息给所有连接（牌局动作） */
  function broadcast(msg){
    Object.values(connections).forEach(conn => {
      try { conn.send(msg); } catch(e){}
    });
  }

  /* 发送消息给指定玩家（如发底牌） */
  function sendTo(peerId, msg){
    const conn = connections[peerId];
    if(conn) conn.send(msg);
  }

  /* 断开连接 */
  function disconnect(){
    Object.values(connections).forEach(c => c.close());
    connections = {};
    if(peer) peer.destroy();
    peer = null;
  }

  return {
    init,
    broadcast,
    sendTo,
    disconnect,
    getMyId: () => myPeerId,
    getConnections: () => connections
  };
})();
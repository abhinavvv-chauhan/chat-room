"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
let allUsers = [];
wss.on("connection", (socket) => {
    socket.on("message", (message) => {
        try {
            const data = JSON.parse(message.toString());
            switch (data.type) {
                case 'join':
                    handleJoinRoom(socket, data.payload);
                    break;
                case 'chat':
                    handleChatMessage(socket, data.payload);
                    break;
            }
        }
        catch (_a) { }
    });
    socket.on("close", () => {
        handleUserDisconnect(socket);
    });
    socket.on("error", () => { });
});
function handleJoinRoom(socket, payload) {
    const { username, roomCode } = payload;
    allUsers = allUsers.filter(user => user.socket !== socket);
    const newUser = {
        socket,
        username,
        roomCode,
        id: generateUserId()
    };
    allUsers.push(newUser);
    broadcastRoomInfo(roomCode);
    const welcomeMsg = {
        id: generateMessageId(),
        username: "System",
        message: `${username} joined the room`,
        timestamp: new Date().toISOString(),
        type: 'system'
    };
    broadcastToRoom(roomCode, {
        type: 'message',
        payload: welcomeMsg
    });
    socket.send(JSON.stringify({
        type: 'notification',
        payload: { message: 'A user has joined the room' }
    }));
}
function handleChatMessage(socket, payload) {
    const user = allUsers.find(u => u.socket === socket);
    if (!user || !payload.message.trim())
        return;
    const chatMsg = {
        id: generateMessageId(),
        username: user.username,
        message: payload.message,
        timestamp: new Date().toISOString(),
        type: 'chat'
    };
    broadcastToRoom(user.roomCode, {
        type: 'message',
        payload: chatMsg
    });
}
function handleUserDisconnect(socket) {
    const user = allUsers.find(u => u.socket === socket);
    if (!user)
        return;
    allUsers = allUsers.filter(u => u.socket !== socket);
    const leaveMsg = {
        id: generateMessageId(),
        username: "System",
        message: `${user.username} left the room`,
        timestamp: new Date().toISOString(),
        type: 'system'
    };
    broadcastToRoom(user.roomCode, {
        type: 'message',
        payload: leaveMsg
    });
    broadcastRoomInfo(user.roomCode);
}
function broadcastToRoom(roomCode, message) {
    const usersInRoom = allUsers.filter(user => user.roomCode === roomCode);
    usersInRoom.forEach(user => {
        if (user.socket.readyState === ws_1.WebSocket.OPEN) {
            user.socket.send(JSON.stringify(message));
        }
    });
}
function broadcastRoomInfo(roomCode) {
    const usersInRoom = allUsers.filter(user => user.roomCode === roomCode);
    const roomInfo = {
        roomCode,
        userCount: usersInRoom.length
    };
    const msg = {
        type: 'roomInfo',
        payload: roomInfo
    };
    usersInRoom.forEach(user => {
        if (user.socket.readyState === ws_1.WebSocket.OPEN) {
            user.socket.send(JSON.stringify(msg));
        }
    });
}
function generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}
function generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}

import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

interface User {
    socket: WebSocket;
    username: string;
    roomCode: string;
    id: string;
}

interface Message {
    id: string;
    username: string;
    message: string;
    timestamp: string;
    type: 'chat' | 'system';
}

interface RoomInfo {
    roomCode: string;
    userCount: number;
}

let allUsers: User[] = [];

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
        } catch {}
    });

    socket.on("close", () => {
        handleUserDisconnect(socket);
    });

    socket.on("error", () => {});
});

function handleJoinRoom(socket: WebSocket, payload: { username: string, roomCode: string }) {
    const { username, roomCode } = payload;

    allUsers = allUsers.filter(user => user.socket !== socket);

    const newUser: User = {
        socket,
        username,
        roomCode,
        id: generateUserId()
    };

    allUsers.push(newUser);
    broadcastRoomInfo(roomCode);

    const welcomeMsg: Message = {
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

function handleChatMessage(socket: WebSocket, payload: { message: string }) {
    const user = allUsers.find(u => u.socket === socket);
    if (!user || !payload.message.trim()) return;

    const chatMsg: Message = {
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

function handleUserDisconnect(socket: WebSocket) {
    const user = allUsers.find(u => u.socket === socket);
    if (!user) return;

    allUsers = allUsers.filter(u => u.socket !== socket);

    const leaveMsg: Message = {
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

function broadcastToRoom(roomCode: string, message: any) {
    const usersInRoom = allUsers.filter(user => user.roomCode === roomCode);
    usersInRoom.forEach(user => {
        if (user.socket.readyState === WebSocket.OPEN) {
            user.socket.send(JSON.stringify(message));
        }
    });
}

function broadcastRoomInfo(roomCode: string) {
    const usersInRoom = allUsers.filter(user => user.roomCode === roomCode);

    const roomInfo: RoomInfo = {
        roomCode,
        userCount: usersInRoom.length
    };

    const msg = {
        type: 'roomInfo',
        payload: roomInfo
    };

    usersInRoom.forEach(user => {
        if (user.socket.readyState === WebSocket.OPEN) {
            user.socket.send(JSON.stringify(msg));
        }
    });
}

function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}

function generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}

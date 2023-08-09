const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors');

const http = require("http");
const Room = require('./models/room');

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);
app.use(cors());


var io = require('socket.io')(server)

app.use(express.json());
const DB = "mongodb+srv://akashc11:akashchauhan11@cluster0.gj30rsv.mongodb.net/?retryWrites=true&w=majority";


io.on('connection', (socket) => {
    socket.on('createRoom', async ({ nickname }) => {

        //roomcreated 
        try {
            let room = new Room();
            let player = {
                socketID: socket.id,
                nickname,
                playerType: 'X'
            }

            room.players.push(player);
            room.turn = player;
            room = await room.save();
            console.log(room);
            const room_id = room._id.toString();
            socket.join(room_id);
            io.to(room_id).emit('createRoomSuccess', room);
        } catch (e) {
            console.log(e);
        }
    });

    socket.on('joinRoom', async ({ nickname, roomId }) => {
        try {
            if (!roomId.match(/^[0-9a-fA-F]{24}$/)) {
                socket.emit('errorOccured', "Please enter valid room id");
                return;
            }
            let room = await Room.findById(roomId);
            if (room.isJoin) {
                let player = {
                    nickname,
                    socketID: socket.id,
                    playerType: "O"
                }
                socket.join(roomId);
                room.players.push(player);
                room.isJoin = false;
                room = await room.save();
                io.to(roomId).emit('joinRoomSuccess', room);
                io.to(roomId).emit("updatePlayers", room.players);
                io.to(roomId).emit("updateRoom", room);

            } else {
                socket.emit('errorOccured', "The Game is in progress");
            }
        } catch (e) {
            console.log(e);
        }
    });
    socket.on('tap', async ({ index, roomId }) => {
        try {
            let room = await Room.findById(roomId);
            let choice = room.turn.playerType;
            if (room.turnIndex == 0) {
                room.turn = room.players[1];
                room.turnIndex = 1;
            } else {
                room.turn = room.players[0];
                room.turnIndex = 0;
            }
            room = await room.save();
            io.to(roomId).emit('tapped', {
                index,
                room,
                choice
            })
        } catch (e) {
            console.log(e)
        }
    });
    socket.on('winner', async ({ winnerSocketId, roomId }) => {
        try {
            let room = await Room.findById(roomId);
            const player = room.players.find((playerr) => playerr.socketID == winnerSocketId);
            player.points += 1;
             room=await room.save();
            if (player.points >= room.maxRounds) {
                io.to(roomId).emit('endGame', player);
            } else {
                io.to(roomId).emit("pointIncrease", player);
            }
        } catch (error) {
            console.log(error)
        }
    });
    socket.on('clear', async ({roomId }) => {
        try {
            const data=await Room.findByIdAndDelete(roomId);
            console.log(data);
        } catch (error) {
            console.log(error)
        }
    });
});


mongoose.connect(DB, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log("Connection to Mongo Db success");
}).catch(e => {
    console.log(e);
})




server.listen(port, "0.0.0.0", () => {
    console.log("Connection successfull");
})
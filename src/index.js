// server side or Backend side

const express = require('express')
const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/message')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)  //created server outside the express
const io = socketio(server)            //refactor

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

let count = 0

io.on('connection', (socket) => {
    console.log('New WebSocket connection')



    socket.on('join', (options, callback) => {

        const { error, user } = addUser({ id: socket.id, ...options })
        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin','Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has join room`),)
        io.to(user.room).emit('roomData',{
            room:user.room,
            users:getUsersInRoom(user.room)
        })

        callback()

        //socket.emit
        //io.emit 
        //socket.broadcast

        //io.to.emit  --> it emit event to all but in specific function
        //socket.broadcast.to.emit --> it broadcast emit event to every except specific user in specific room 
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        // this is for bad-words
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username,message))
        callback()   //this is acknowledgement
    })

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,`https://google.com/maps?q=${location.latitude},${location.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage(`${user.username} has left!`))
            io.to(user.room).emit('roomData',{
                room:user.room,
                users:getUsersInRoom(user.room)
            })

        }

    })

    // socket.emit('countUpdated',count)
    // socket.on('increment',() => {
    //     count = count +1
    //     // socket.emit('countUpdated',count)  //this is for only signle connections
    //     io.emit('countUpdated',count)   // this is for every connections
    // })
})



server.listen(port, () => {
    console.log(`Example app listening on port ${port}!`)
})
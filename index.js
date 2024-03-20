//import
const express = require("express")
const app = express()
const carRouter = require("./src/router/carsRoute")
const userRouter = require("./src/router/usersRoute")
const tripRouter = require("./src/router/tripsRoute")
const { host, port } = require("./src/const/config")
//plugin
app.use(express.json())
//route
app.use('/car', carRouter)
app.use('/user', userRouter)
app.use('/trip', tripRouter)
//listen
app.listen(port, () =>{
    console.log(`This server is listen on http://${host}:${port}`);
})
import express from "express";
import dotenv from "dotenv";
import http from "http"
import 'reflect-metadata'
import UserRoutes from "./router/Users.routes";
import cors from "cors";

const app = express()

const server = http.createServer(app);

dotenv.config({path: './.env'})
app.set('port', process.env.PORT || 4100)
app.use(cors())
app.use(express.json())

const port = app.get('port')

app.use('/api/', [UserRoutes()])
app.use('/', (req: any, res: any)=> {
    res.send("Ritme App")
})

server.listen(port);
server.on('error', (err)=>{
    console.log(err)
});

server.on('listening', ()=>{
    console.log(`Online on port ${port}`)
});
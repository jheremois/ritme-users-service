import { Router } from "express";
import { getUsers, getUser, getMe, editUser } from "../controllers/usersControllers";
import verifyToken from "../middlewares/jwt";

const router = Router()

const UserRoutes = ()=>{

    router.get('/users', verifyToken, getUsers)

    router.get('/user/:id', verifyToken, getUser)

    router.get('/user', verifyToken, getMe)

    router.patch('/user', verifyToken, editUser)

    return router
}

export default UserRoutes
import { Request, Response } from 'express';
import { pool } from '../config/database';
import { userType } from '../models/interfaces/user.type';
import { verify } from "jsonwebtoken";
import appConfig from "../config/environments";
import {Storage} from "@google-cloud/storage";
const fs = require("fs")
const bucketName = process.env.BUCKET_NAME!;

const gcsKey = JSON.parse(
  Buffer.from(process.env.GCP_CRED_FILE!, 'base64').toString()
)

const storage = new Storage({
  credentials: {
    client_email: gcsKey.client_email,
    private_key: gcsKey.private_key
  },
  projectId: gcsKey.project_id
})

const ProfileBucket = storage.bucket(bucketName)
const conf = appConfig.passport.JWT

/*
ProfileBucket.makePublic((err, files)=> {
  err
    ?
      console.log("Bucket public err: ",err)
    :
      console.log("Bucket public res: ",files)
})
*/



export const getUsers = async (_req: Request, res: Response) => {

  pool.query(`
    SELECT s1.user_id, s1.email, s2.user_name, s2.user_description, s2.profile_pic
    FROM users AS s1
    INNER JOIN profiles AS s2
    ON s1.user_id = s2.user_id;`
  , (err: any, response: userType[])=>{
    response.length < 1
    ?
      res.status(400).json(
        {
          data: "No user where found"
        }
      )
    :
    err
      ?
        res.status(402).json(
          {
            data: err
          }
        )
      : 
        res.status(200).json(
          {
            response: response
          }
        )
  })

}

export const getUser = async (req: Request, res: Response) => {

  const {id} = req.params

  pool.query(`
    SELECT s1.user_id, s1.email, s2.user_name, s2.user_description, s2.profile_pic
    FROM users AS s1
    INNER JOIN profiles AS s2
    ON s1.user_id = s2.user_id
    WHERE s1.user_id AND s2.user_id = ${id}`
  , (err: any, response: userType[])=>{
    response.length < 1
    ?
      res.status(401).json(
        {
          data: "No user where found"
        }
      )
    :
      err
        ?
          res.status(402).json(
            {
              data: err
            }
          )
        : 
          res.status(200).json(
            {
              response: response
            }
          )
  })

}

export const getMe = async (req: Request, res: Response) => {

  const token: any = req.headers["user_token"];
  let jwtPlayload: any = verify(token, conf.CLIENT_SECRET);

  pool.query(`
    SELECT s1.user_id, s1.email, s2.user_name, s2.user_description, s2.profile_pic
    FROM users AS s1
    INNER JOIN profiles AS s2
    ON s1.user_id = s2.user_id
    WHERE s1.user_id AND s2.user_id = ${jwtPlayload.user_id}`
  , (err: any, response: userType[])=>{
    response.length < 1
    ?
      res.status(402).json(
        {
          data: "No user where found"
        }
      )
    :
      err
        ?
          res.status(400).json(
            {
              data: err
            }
          )
        : 
          res.status(200).json(
            {
              status: 200,
              response: response
            }
          )
  })

}

export const editUser = async (req: Request, res: Response) => {

  const { user_description, user_name, profile_pic } = req.body
  const token: any = req.headers["user_token"]
  const imgData = profile_pic;
  const base64Data: string | null = profile_pic?imgData.replace(/^data:image\/[a-z]+;base64,/, ""):false
  let jwtPlayload: any = verify(token, conf.CLIENT_SECRET)

  user_name
  ?
  user_name.length > 2
    ? 
      profile_pic && profile_pic.includes("base64")
        ?
          fs.writeFile("profile_pic.png", base64Data, 'base64', 
            (err: any, data: any)=> {
              if (err) {
                  console.log('err: ', err);
              }else{
                console.log('success: ', data);
                ProfileBucket.upload("profile_pic.png", {
                  destination: `${base64Data?.slice(130, 150)}.png`,
                }).then((bucketRes)=>{
                  pool.query(`
                    UPDATE profiles
                    SET user_description= '${user_description || ""}', user_name= '${user_name}', profile_pic= 'https://storage.googleapis.com/ritme-profiles/${bucketRes[0].id}'
                    WHERE user_id = ${jwtPlayload.user_id}
                  `, 
                    (err: any, response: userType[])=>{
                      response
                        ?
                          res.status(200).json(response)
                        :
                          res.status(402).json("User name already selected")
                    }
                  )
                }).catch((err)=>{
                  res.status(402).json("User name already selected")
                })
              }
            }
          )
        :
          pool.query(`
              UPDATE profiles
              SET user_description= '${user_description || ""}', user_name= '${user_name}'
              WHERE user_id = ${jwtPlayload.user_id}
            `, 
            (err: any, response: userType[])=>{
              response
                ?
                  res.status(200).json(response)
                :
                  res.status(402).json("User name already selected")
            }
          )
    :
      res.status(403).json("Name field is failing")
  :
    res.status(500).send("Internal error")
}

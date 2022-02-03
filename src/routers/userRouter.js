import express from "express";
import {
  see,
  logout,
  edit,
  remove,
  startGithubLogin,
  finishGithubLogin,
  getEdit,
  postEdit,
} from "../controllers/userController";
import {
  protectorMiddleware,
  publicOnlyMiddleware,
} from "../middlewares/localMiddleware";

const userRouter = express.Router();

userRouter.route("/edit").all(protectorMiddleware).get(getEdit).post(postEdit);
userRouter.get("/logout", protectorMiddleware, logout);
userRouter.get("/remove", remove);
userRouter.get("/github/start", publicOnlyMiddleware, startGithubLogin);
userRouter.get("/github/finish", publicOnlyMiddleware, finishGithubLogin);
userRouter.get("/:id(\\d+)", see);

export default userRouter;

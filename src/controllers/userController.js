import User from "../models/User";
import bcrypt from "bcrypt";
import fetch from "node-fetch";
import { Octokit } from "@octokit/core";

export const getJoin = (req, res) => res.render("join", { pageTitle: "Join" });
export const postJoin = async (req, res) => {
  const { name, username, email, password, password2, location } = req.body;
  const pageTitle = "Join";
  if (password !== password2) {
    return res.status(400).render("join", {
      pageTitle,
      errorMessage: "password confirmation does not match",
    });
  }
  const exists = await User.exists({ $or: [{ username }, { email }] });
  if (exists) {
    return res.status(400).render("join", {
      pageTitle,
      errorMessage: "This username/email is already taken",
    });
  }
  try {
    await User.create({
      name,
      username,
      email,
      password,
      location,
    });
    return res.redirect("/login");
  } catch (error) {
    return res.status(400).render("join", {
      pageTitle,
      errorMessage: error._message,
    });
  }
};
export const getEdit = (req, res) => {
  return res.render("edit-profile", { pageTitle: "Edit Profile" });
};
export const postEdit = async (req, res) => {
  const {
    session: {
      user: { _id, avatarUrl },
    },
    body: { email, name, username, location },
    file,
  } = req;
  // const exists = await User.exists({ $or: [{ username }, { email }] });
  // if (exists) {
  //   return res.status(400).render("edit-profile", {
  //     errorMessage: "This username/email is already taken",
  //   });
  // }
  const userUpdate = await User.findByIdAndUpdate(
    _id,
    {
      email,
      name,
      username,
      location,
      avatarUrl: file ? file.path : avatarUrl,
    },
    { new: true }
  );
  req.session.user = userUpdate;
  return res.redirect("/users/edit");
};
export const remove = (req, res) => res.send("Remove User");
export const getLogin = (req, res) =>
  res.render("login", { pageTitle: "Log In" });
export const postLogin = async (req, res) => {
  const { username, password } = req.body;
  //1. ???????????? ????????? ??????
  const user = await User.findOne({ username, socialOnly: false });
  if (!user) {
    return res.status(400).render("login", {
      pageTitle: "Log in",
      errorMessage: "???????????? ???????????? ????????????.",
    });
  }
  //2. ???????????? ???????????? ????????? ??????
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(400).render("login", {
      pageTitle: "Log in",
      errorMessage: "Wrong password",
    });
  }
  req.session.loggedIn = true;
  req.session.user = user;
  return res.redirect("/");
};
export const startGithubLogin = (req, res) => {
  const baseUrl = "https://github.com/login/oauth/authorize";
  const config = {
    client_id: process.env.GH_CLIENT,
    allow_signup: false,
    scope: "read:user user:email",
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;
  return res.redirect(finalUrl);
};
export const finishGithubLogin = async (req, res) => {
  const baseUrl = "https://github.com/login/oauth/access_token";
  const config = {
    client_id: process.env.GH_CLIENT,
    client_secret: process.env.GH_SECRET,
    code: req.query.code,
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;
  const tokenRequest = await (
    await fetch(finalUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    })
  ).json();

  if ("access_token" in tokenRequest) {
    const { access_token } = tokenRequest;
    const apiUrl = "https://api.github.com";
    const emailData = await (
      await fetch(`${apiUrl}/user/emails`, {
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();
    const emailObj = emailData.find(
      (email) => email.primary === true && email.verified === true
    );
    if (!emailObj) {
      return res.redirect("/login");
    }
    console.log(emailObj);
    let user = await User.findOne({ email: emailObj.email });
    if (!user) {
      //????????? ???????????? ???????????? ????????????????????? ??????????????? ?????????
      const password = await bcrypt.hash(process.env.NO_PASSWORD, 5);
      console.log("????????????????????? ????????????");
      const userData = await (
        await fetch(`${apiUrl}/user`, {
          headers: {
            Authorization: `token ${access_token}`,
          },
        })
      ).json();
      console.log(userData);
      user = await User.create({
        email: emailObj.email,
        username: userData.login,
        password,
        socialOnly: true,
        name: userData.name ? userData.name : "No Name",
        location: userData.location ? userData.location : "No Location",
        avatarUrl: userData.avatarUrl,
      });
    }
    req.session.loggedIn = true;
    req.session.user = user;
    console.log("???????????????");
    return res.redirect("/");
  } else {
    return res.redirect("/login");
  }
};
export const see = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).populate({
    path: "videos",
    populate: {
      path: "owner",
      model: "User",
    },
  });
  if (!user) {
    return res.status(404).render("404page");
  }
  return res.render("user/profile", {
    pageTitle: `${user.name}??? ?????????`,
    user,
  });
};
export const logout = (req, res) => {
  req.session.destroy();
  return res.redirect("/");
};
export const getChangePassword = (req, res) => {
  if (req.session.user.socialOnly) {
    return res.redirect("/");
  }
  return res.render("user/change-password", { pageTitle: "Change Password" });
};
export const postChangePassword = async (req, res) => {
  const {
    session: {
      user: { _id, password },
    },
    body: { oldPassword, newPassword, newPasswordConfirmation },
  } = req;
  if (newPassword !== newPasswordConfirmation) {
    return res.status(400).render("user/change-password", {
      pageTitle: "Change Password",
      errorMessage: "??????????????? ?????? ?????????????????????.",
    });
  }
  const match = await bcrypt.compare(oldPassword, password);
  if (!match) {
    return res.status(400).render("user/change-password", {
      pageTitle: "Change Password",
      errorMessage: "????????? ??????????????? ????????????.",
    });
  }
  const user = await User.findById(_id);
  user.password = newPassword;
  await user.save();
  return res.redirect("/users/logout");
};

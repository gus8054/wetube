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
export const edit = (req, res) => res.send("Edit User");
export const remove = (req, res) => res.send("Remove User");
export const getLogin = (req, res) =>
  res.render("login", { pageTitle: "Log In" });
export const postLogin = async (req, res) => {
  const { username, password } = req.body;
  //1. 아이디가 있는지 확인
  const user = await User.findOne({ username });
  if (!user) {
    return res.status(400).render("login", {
      pageTitle: "Log in",
      errorMessage: "아이디가 존재하지 않습니다.",
    });
  }
  //2. 아이디와 비밀번호 맞는지 확인
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
    const userData = await (
      await fetch(`${apiUrl}/user`, {
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();
    console.log(userData);

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
      return res.status(400).redirect("/login", {
        pageTitle: "Log in",
        errorMessage: "email을 확인할 수 없습니다.",
      });
    }
    console.log(emailObj);
    const user = await User.findOne({
      $or: [{ email: emailObj.email }, { username: userData.login }],
    });
    if (!user) {
      //소셜로그인으로 회원가입후 로그인
      const password = await bcrypt.hash(process.env.NO_PASSWORD, 5);
      console.log("소셜로그인으로 회원가입");
      const user = await User.create({
        email: emailObj.email,
        username: userData.login,
        password,
        socialOnly: true,
        name: userData.name ? userData.name : "No Name",
        location: userData.location ? userData.location : "No Location",
      });
      req.session.loggedIn = true;
      req.session.user = user;
      console.log("회원가입후 로그인 성공");
      return res.redirect("/");
    } else {
      if (!user.socialOnly) {
        console.log("깃헙에 사용된 아이디나 이메일이 이미 존재함.");
        return res.status(400).render("login", {
          pageTitle: "Log in",
          errorMessage: "일반 로그인을 이용해주세요.",
        });
      } else {
        req.session.loggedIn = true;
        req.session.user = user;
        console.log("깃헙으로 로그인성공");
        return res.redirect("/");
      }
    }
  } else {
    return res.redirect("/login");
  }
};
export const see = (req, res) => res.render("home");
export const logout = (req, res) => res.send("Log Out");

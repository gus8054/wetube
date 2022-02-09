import User from "../models/User";
import Video from "../models/Video";

export const home = async (req, res) => {
  const videos = await Video.find({})
    .sort({ createdAt: "desc" })
    .populate("owner");
  return res.render("home", { pageTitle: "Home", videos });
};
export const watch = async (req, res) => {
  const { id } = req.params;
  const video = await Video.findById(id).populate("owner");
  if (!video) {
    return res.status(404).render("404page", { pageTitle: `Video not found` });
  }
  return res.render("watch", { pageTitle: video.title, video });
};
export const getEdit = async (req, res) => {
  const {
    params: { id },
    session: {
      user: { _id },
    },
  } = req;
  const video = await Video.findById(id);
  if (!video) {
    return res.status(404).render("404page", { pageTitle: "Video not found." });
  }
  if (String(_id) !== String(video.owner)) {
    return res.status(403).redirect("/");
  }
  return res.render("edit", { pageTitle: `Edit: ${video.title}`, video });
};
export const postEdit = async (req, res) => {
  const {
    params: { id },
    body: { title, description, hashtags },
    session: {
      user: { _id },
    },
  } = req;
  const video = await Video.exists({ _id: id });
  if (!video) {
    return res.status(404).render("404page", { pageTitle: "Video not found." });
  }
  if (String(_id) !== String(video.owner)) {
    return res.status(403).redirect("/");
  }
  await Video.findByIdAndUpdate(id, {
    title,
    description,
    hashtags: Video.formatHashtags(hashtags),
  });
  return res.redirect(`/videos/${id}`);
};

export const getUpload = (req, res) => {
  return res.render("upload", { pageTitle: "Upload Video" });
};

export const postUpload = async (req, res) => {
  const {
    body: { title, description, hashtags },
    file: { path: fileUrl },
    session: {
      user: { _id },
    },
  } = req;
  try {
    const newVideo = await Video.create({
      title,
      description,
      hashtags: Video.formatHashtags(hashtags),
      fileUrl,
      owner: _id,
    });
    const user = await User.findById(_id);
    user.videos.push(newVideo._id);
    user.save();
    req.session.user.videos.push(newVideo._id);
    return res.redirect("/");
  } catch (error) {
    console.log(error);
    return res.status(400).render("upload", {
      pageTitle: "Upload Video",
      errorMessage: error._message,
    });
  }
};
export const deleteVideo = async (req, res) => {
  const {
    params: { id },
    session: {
      user: { _id },
    },
  } = req;
  const video = await Video.findById(id);
  if (!video) {
    return res.status(404).render("404", { pageTitle: "Video not found." });
  }
  if (String(_id) !== String(video.owner)) {
    return res.status(403).redirect("/");
  }
  await Video.findByIdAndDelete(id);
  const user = await User.findById(_id);
  const deleteIndex = user.videos.findIndex(
    (element) => String(element) === String(video._id)
  );
  user.videos.splice(deleteIndex, 1);
  user.save();
  req.session.user.videos = user.videos;
  return res.redirect("/");
};

export const search = async (req, res) => {
  const { keyword } = req.query;
  let videos = [];
  if (keyword) {
    videos = await Video.find({
      title: {
        $regex: new RegExp(`${keyword}$`, "i"),
      },
    }).populate("owner");
  }
  return res.render("search", { pageTitle: "Search", videos });
};

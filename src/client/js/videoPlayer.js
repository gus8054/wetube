const playBtn = document.getElementById("play");
const muteBtn = document.getElementById("mute");
const time = document.getElementById("time");
const volumeRange = document.getElementById("volume");
const currentTime = document.getElementById("currentTime");
const totalTime = document.getElementById("totalTime");

const video = document.querySelector("video");

let volumeValue = 0.5;

const handlePlayBtn = () => {
  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
  playBtn.innerText = video.paused ? "Play" : "Pause";
};

const handleMute = () => {
  if (video.muted) {
    video.muted = false;
  } else {
    video.muted = true;
  }
  muteBtn.innerText = video.muted ? "Unmute" : "Mute";
  volumeRange.value = video.muted ? "0" : volumeValue;
  video.volume = volumeRange.value;
};

const handleVolumeRange = (event) => {
  volumeValue = event.target.value;
  video.volume = volumeValue;
  video.muted = video.volume ? false : true;
  muteBtn.innerText = video.muted ? "Unmute" : "Mute";
};

const formatTime = (second) =>
  new Date(second * 1000).toISOString().substring(11, 19);

const handleLoadedMetaData = () => {
  totalTime.innerText = formatTime(Math.floor(video.duration));
};
const handleTimeUpdate = () => {
  currentTime.innerText = formatTime(Math.floor(video.currentTime));
};

playBtn.addEventListener("click", handlePlayBtn);
muteBtn.addEventListener("click", handleMute);
volumeRange.addEventListener("input", handleVolumeRange);
video.addEventListener("loadedmetadata", handleLoadedMetaData);
video.addEventListener("timeupdate", handleTimeUpdate);

if (video.readyState === 4) {
  handleLoadedMetaData();
}

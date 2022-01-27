import mongoose from "mongoose";

mongoose.connect(process.env.DB_URL);

const db = mongoose.connection;

const handleError = (error) => console.log("ERROR:", error);

const handleOpen = () => console.log("✅DB connection");

db.on("error", handleError);
db.once("open", handleOpen);

import "dotenv/config";
import "./db";
import "./models/Video";
import "./models/User";
import app from "./server";

const PORT = 4000;

function handleListening() {
  return console.log(`Server listening on port http://localhost:${PORT}`);
}

app.listen(PORT, handleListening);

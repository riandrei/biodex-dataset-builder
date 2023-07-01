import mongoose from "mongoose";

mongoose.connect(process.env.MONGODB_CONNECTION_STRING);

const Schema = mongoose.Schema;

const BuildSchema = new Schema({
  name: String,
  intelligence: String,
  power: String,
  defense: String,
  mobility: String,
  health: String,
  stealth: String,
  tier: String,
  server: String,
  time: String,
});

const Build = mongoose.model("build", BuildSchema);

export default Build;

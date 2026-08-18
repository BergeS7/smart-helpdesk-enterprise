import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  nome: String,
  email: { type: String, unique: true },
  senha: String,
  role: { type: String, default: "user" }
});

export default mongoose.model("User", UserSchema);
import { Router } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";

export const authRouter = Router();

// Single-user login: compare against APP_PASSWORD, hand back a long-lived JWT.
authRouter.post("/login", (req, res) => {
  const { password } = req.body ?? {};
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    res.status(500).json({ error: "APP_PASSWORD not configured" });
    return;
  }

  const a = Buffer.from(String(password ?? ""));
  const b = Buffer.from(expected);
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!match) {
    res.status(401).json({ error: "wrong password" });
    return;
  }

  const token = jwt.sign({ sub: "owner" }, process.env.JWT_SECRET!, { expiresIn: "90d" });
  res.json({ token });
});

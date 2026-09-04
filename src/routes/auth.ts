import { Router } from "express";
import {
  loginUser,
  registerUser,
} from "../services/authService.js";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters",
      });
    }

    const user = await registerUser(email, password, role);

    res.status(201).json(user);
  } catch (error: any) {
    if (error.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({
        error: "Email already registered",
      });
    }

    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const result = await loginUser(email, password);

    res.status(200).json(result);
  } catch (error: any) {
    if (error.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    next(error);
  }
});

export default router;
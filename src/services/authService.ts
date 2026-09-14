import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET: string = process.env.JWT_SECRET ?? (() => {
  throw new Error("JWT_SECRET is not configured");
})();


export async function registerUser(
  email: string,
  password: string,
  
) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    token,
  };
}
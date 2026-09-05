const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const { apiRouter, seed } = require("./server/routes");
const { ensureDB } = require("./server/db");

const app = express();
const PORT = process.env.PORT || 3000;

async function start() {
  await ensureDB();
  seed();

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  app.use(express.static(path.join(__dirname, "public")));

  app.use("/api", apiRouter);

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MAKTAB X running on http://0.0.0.0:${PORT}`);
  });
}

start();

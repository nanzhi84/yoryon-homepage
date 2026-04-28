import express from "express";
import postsRouter from "./routes/posts.js";

const DEFAULT_PORT = 3001;
const LOCAL_HOST = "127.0.0.1";

const app = express();
const port = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);

if (Number.isNaN(port)) {
  throw new Error("PORT must be a valid integer.");
}

app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "yoryon-api" });
});

app.use("/api/posts", postsRouter);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Internal Server Error" });
});

app.listen(port, LOCAL_HOST, () => {
  console.log(`Yoryon API listening at http://${LOCAL_HOST}:${port}`);
});

import { readFile } from "node:fs/promises";
import { Router } from "express";

const postsFileUrl = new URL("../../data/posts.json", import.meta.url);

const router = Router();

router.get("/", async (_request, response, next) => {
  try {
    const rawPosts = await readFile(postsFileUrl, "utf8");
    response.json(JSON.parse(rawPosts));
  } catch (error) {
    next(error);
  }
});

export default router;

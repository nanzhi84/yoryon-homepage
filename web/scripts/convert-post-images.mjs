import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const WEBP_QUALITY = 82;
const WEBP_EFFORT = 6;
const APPLY_FLAG = "--apply";
const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx", ".mdoc"]);
const CONTENT_ASSET_SEGMENT = `${path.sep}assets${path.sep}`;
const MARKDOWN_IMAGE_PATTERN = /(!\[[^\]]*\]\()([^)\s]+\.png)(\))/gi;

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const contentRoot = path.join(projectRoot, "src", "content");
const shouldApply = process.argv.includes(APPLY_FLAG);

const findMarkdownFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return findMarkdownFiles(fullPath);
    }

    if (entry.isFile() && MARKDOWN_EXTENSIONS.has(path.extname(entry.name))) {
      return [fullPath];
    }

    return [];
  }));

  return files.flat();
};

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
};

const convertImage = async (sourcePath, outputPath) => {
  if (await fileExists(outputPath)) {
    return;
  }

  await sharp(sourcePath)
    .webp({
      quality: WEBP_QUALITY,
      effort: WEBP_EFFORT,
      smartSubsample: true
    })
    .toFile(outputPath);
};

const toWebpReference = (reference) => reference.replace(/\.png$/i, ".webp");

const isContentAssetImage = (imagePath) => {
  const relativePath = path.relative(contentRoot, imagePath);

  return Boolean(
    relativePath &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath) &&
    imagePath.includes(CONTENT_ASSET_SEGMENT)
  );
};

const main = async () => {
  const markdownFiles = await findMarkdownFiles(contentRoot);
  const pendingConversions = new Map();
  let conversionCount = 0;
  let updatedFileCount = 0;

  for (const markdownPath of markdownFiles) {
    const source = await fs.readFile(markdownPath, "utf8");
    const fileConversions = [];
    let hasUpdates = false;

    const updated = source.replace(MARKDOWN_IMAGE_PATTERN, (match, prefix, imageReference, suffix) => {
      const resolvedImagePath = path.resolve(path.dirname(markdownPath), decodeURI(imageReference));

      if (!isContentAssetImage(resolvedImagePath)) {
        return match;
      }

      const webpPath = resolvedImagePath.replace(/\.png$/i, ".webp");
      conversionCount += 1;
      hasUpdates = true;

      if (shouldApply && !pendingConversions.has(webpPath)) {
        pendingConversions.set(webpPath, convertImage(resolvedImagePath, webpPath));
      }

      if (shouldApply) {
        fileConversions.push(pendingConversions.get(webpPath));
      }

      return `${prefix}${toWebpReference(imageReference)}${suffix}`;
    });

    if (shouldApply && hasUpdates) {
      await Promise.all(fileConversions);
      await fs.writeFile(markdownPath, updated);
      updatedFileCount += 1;
    }
  }

  if (shouldApply) {
    console.log(`Converted ${conversionCount} image reference(s) and updated ${updatedFileCount} markdown file(s).`);
    return;
  }

  console.log(`Dry run: ${conversionCount} image reference(s) can be converted. Pass ${APPLY_FLAG} to write changes.`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

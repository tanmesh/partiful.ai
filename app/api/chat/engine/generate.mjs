import {
  serviceContextFromDefaults,
  SimpleDirectoryReader,
  storageContextFromDefaults,
  VectorStoreIndex,
  Document
} from "llamaindex";
import fs from "fs";
import path from 'path';

import * as dotenv from "dotenv";

import {
  CHUNK_OVERLAP,
  CHUNK_SIZE,
  STORAGE_CACHE_DIR,
  STORAGE_DIR,
} from "./constants.mjs";

// Load environment variables from local .env file
dotenv.config();

async function readFiles() {
  const folderPath = STORAGE_DIR;

  let documents = [];

  try {
    const files = await fs.promises.readdir(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const fileContent = JSON.parse(await fs.promises.readFile(filePath, 'utf-8'));

      let document = new Document();
      document.text = fileContent['text'];
      document.metadata = {
        "url": fileContent['link']
      };
      documents.push(document);
    }
    return documents;
  } catch (err) {
    console.error('Error reading folder:', err);
    return [];
  }
}

async function getRuntime(func) {
  const start = Date.now();
  await func();
  const end = Date.now();
  return end - start;
}

async function generateDatasource(serviceContext) {
  console.log(`Generating storage context...`);
  // Split documents, create embeddings and store them in the storage context
  const ms = await getRuntime(async () => {
    const storageContext = await storageContextFromDefaults({
      persistDir: STORAGE_CACHE_DIR,
    });
    // const documents = await new SimpleDirectoryReader().loadData({
    //   directoryPath: STORAGE_DIR,
    // });

    let documents = [];

    await readFiles().then((documents_) => {
      documents = documents_;
    });
    await VectorStoreIndex.fromDocuments(documents, {
      storageContext,
      serviceContext,
    });
  });
  console.log(`Storage context successfully generated in ${ms / 1000}s.`);
}

(async () => {
  const serviceContext = serviceContextFromDefaults({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  await generateDatasource(serviceContext);
  console.log("Finished generating storage.");
})();

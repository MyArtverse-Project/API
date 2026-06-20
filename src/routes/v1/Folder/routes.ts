import type { FastifyInstance } from "fastify"
import {
  createFolder,
  getCharacterGalleryFolders,
  getFolderByHandle,
  getFolders,
} from "./controllers"
import {
  CREATE_FOLDER_SCHEMA,
  GET_CHARACTER_GALLERY_FOLDERS_SCHEMA,
  GET_FOLDER_BY_HANDLE_SCHEMA,
  GET_FOLDER_SCHEMA,
  GET_FOLDER_RECURSIVELY_SCHEMA,
} from "./schemas"

async function folderRoutes(server: FastifyInstance) {
  server.post(
    "/create",
    { onRequest: [server.auth], schema: CREATE_FOLDER_SCHEMA },
    createFolder
  )
  server.get(
    "/character/:characterId",
    { schema: GET_CHARACTER_GALLERY_FOLDERS_SCHEMA },
    getCharacterGalleryFolders
  )
  server.get("/:folderId", { schema: GET_FOLDER_SCHEMA }, getFolders)
  server.get(
    "/handle/:handle",
    { schema: GET_FOLDER_BY_HANDLE_SCHEMA },
    getFolderByHandle
  )
  server.get(
    "/folders/:folderId/recursive",
    { schema: GET_FOLDER_RECURSIVELY_SCHEMA },
    getFolders
  )
}

export default folderRoutes

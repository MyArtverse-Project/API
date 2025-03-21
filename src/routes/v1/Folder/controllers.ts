import { FastifyReply, FastifyRequest } from "fastify";
import { Folder } from "../../../models/Folder";
import { User } from "../../../models";

export const createFolder = async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, contentType, parentId, color } = request.body as { name: string, contentType: string,  parentId?: string, color?: string };
    const { profileId } = request.user as { id: string; profileId: string }
    if (!name || !contentType || !profileId) {
        console.log("Missing required fields", { name, contentType, profileId });
        return reply.status(400).send({ error: "Missing required fields" });
    }

    // Validate contentType
    const validContentTypes = ["characters", "art"];
    if (!validContentTypes.includes(contentType)) {
        console.log("Invalid content type", { contentType });
        return reply.status(400).send({ error: "Invalid content type" });
    }

    const folderRepo = await request.server.db.getRepository(Folder);
    const userRepo = await request.server.db.getRepository(User);

    const user = await userRepo.findOne({ where: { id: profileId } });
    if (!user) return reply.status(400).send({ error: "User not found" });

    const parent = parentId
        ? await folderRepo.findOne({ where: { id: parentId } })
        : null;

    const newFolder = await folderRepo.save({ 
        parent: parent,
        name: name,
        color: color,
        contentType: contentType,
        owner: user,
        children: []
     });
    await folderRepo.save(newFolder);

    reply.send(newFolder);
}

export const getFolders = async (request: FastifyRequest, reply: FastifyReply) => {
    const { folderId } = request.params as { folderId: string };
    if (!folderId) return reply.status(400).send({ error: "Missing folderId" });
    const folderRepo = request.server.db.getRepository(Folder);

    const folder = await folderRepo.findOne({
        where: { id: folderId },
        relations: ["children", "characters", "artworks"],
    });

    if (!folder) return reply.status(404).send({ error: "Folder not found" });

    reply.send(folder);
}

export const getFolderByHandle = async (request: FastifyRequest, reply: FastifyReply) => {
    const { handle } = request.params as { handle: string };
    if (!handle) return reply.status(400).send({ error: "Missing handle" });
    const user = await request.server.db.getRepository(User).findOne({ where: { handle } });
    if (!user) return reply.status(404).send({ error: "User not found" });
    const folderRepo = request.server.db.getRepository(Folder);

    const folders = await folderRepo.find({
        where: { owner: { id: user.id } },
        relations: ["children", "characters", "artworks"],
    });

    if (!folders || folders.length === 0) return reply.status(404).send({ error: "No folders found for this user" });

    reply.send(folders);
}

const getFolderRecursively = async (request: FastifyRequest, reply: FastifyReply) => {
    const { folderId } = request.params as { folderId: string };
    const folderRepo = request.server.db.getRepository(Folder);

    const folder = await folderRepo.findOne({
        where: { id: folderId },
        relations: ["children", "characters", "artworks"],
    });

    if (!folder) return reply.status(404).send({ error: "Folder not found" });

    const nestedFolder = await getNestedFolders(folder, folderRepo);
    reply.send(nestedFolder);
}

const getNestedFolders = async (folder: Folder, folderRepo: any) => {
    const children = await folderRepo.find({ where: { parent: folder }, relations: ["children"] });
    folder.children = children;

    for (const child of children) {
        await getNestedFolders(child, folderRepo); // Recursive call for each child
    }

    return folder;
};
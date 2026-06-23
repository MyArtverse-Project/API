import { FastifyReply, FastifyRequest } from "fastify";
import Character from "../../../models/Character";
import Folder from "../../../models/Folder";
import { User } from "../../../models";

const normalizeContentType = (contentType: string) => {
    if (contentType === "artworks") return "art";
    return contentType;
};

const buildFolderTree = (folders: Folder[]) => {
    const roots = folders.filter((folder) => !folder.parentId);
    const attachChildren = (folder: Folder): Folder => ({
        ...folder,
        children: folders
            .filter((child) => child.parentId === folder.id)
            .map(attachChildren),
    });
    return roots.map(attachChildren);
};

export const createFolder = async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, contentType, parentId, color, characterId } = request.body as {
        name: string;
        contentType: string;
        parentId?: string;
        color?: string;
        characterId?: string;
    };
    const { profileId } = request.user as { id: string; profileId: string };
    const normalizedContentType = normalizeContentType(contentType);

    if (!name || !contentType || !profileId) {
        return reply.status(400).send({ error: "Missing required fields" });
    }

    const validContentTypes = ["characters", "art"];
    if (!validContentTypes.includes(normalizedContentType)) {
        return reply.status(400).send({ error: "Invalid content type" });
    }

    if (normalizedContentType === "art" && !characterId) {
        return reply.status(400).send({ error: "characterId is required for art folders" });
    }

    const folderRepo = request.server.db.getRepository(Folder);
    const userRepo = request.server.db.getRepository(User);
    const characterRepo = request.server.db.getRepository(Character);

    const user = await userRepo.findOne({ where: { id: profileId } });
    if (!user) return reply.status(400).send({ error: "User not found" });

    let character: Character | null = null;
    if (normalizedContentType === "art") {
        character = await characterRepo.findOne({
            where: { id: characterId, owner: { id: profileId } },
        });
        if (!character) {
            return reply.status(403).send({ error: "Character not found or forbidden" });
        }
    }

    let parent: Folder | null = null;
    if (parentId) {
        parent = await folderRepo.findOne({
            where: { id: parentId },
            relations: { character: true },
        });
        if (!parent) {
            return reply.status(404).send({ error: "Parent folder not found" });
        }
        if (parent.contentType !== normalizedContentType) {
            return reply.status(400).send({ error: "Parent folder content type mismatch" });
        }
        if (normalizedContentType === "art") {
            if (!parent.character || parent.character.id !== characterId) {
                return reply.status(400).send({ error: "Parent folder belongs to a different character" });
            }
        } else if (parent.character) {
            return reply.status(400).send({ error: "Invalid parent folder for character folders" });
        }
    }

    const newFolder = await folderRepo.save({
        parent,
        name,
        color,
        contentType: normalizedContentType,
        owner: user,
        character: normalizedContentType === "art" ? character : null,
        children: [],
    });

    return reply.send(newFolder);
};

export const getFolders = async (request: FastifyRequest, reply: FastifyReply) => {
    const { folderId } = request.params as { folderId: string };
    if (!folderId) return reply.status(400).send({ error: "Missing folderId" });
    const folderRepo = request.server.db.getRepository(Folder);

    const folder = await folderRepo.findOne({
        where: { id: folderId },
        relations: ["children", "characters", "artworks"],
    });

    if (!folder) return reply.status(404).send({ error: "Folder not found" });

    return reply.send(folder);
};

export const getFolderByHandle = async (request: FastifyRequest, reply: FastifyReply) => {
    const { handle } = request.params as { handle: string };
    if (!handle) return reply.status(400).send({ error: "Missing handle" });
    const user = await request.server.db.getRepository(User).findOne({ where: { handle } });
    if (!user) return reply.status(404).send({ error: "User not found" });
    const folderRepo = request.server.db.getRepository(Folder);

    const folders = await folderRepo.find({
        where: { owner: { id: user.id }, contentType: "characters" },
        relations: ["children", "characters", "artworks"],
    });

    if (!folders || folders.length === 0) {
        return reply.send([]);
    }

    return reply.send(buildFolderTree(folders));
};

export const getCharacterGalleryFolders = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const { characterId } = request.params as { characterId: string };
    if (!characterId) return reply.status(400).send({ error: "Missing characterId" });

    const characterRepo = request.server.db.getRepository(Character);
    const folderRepo = request.server.db.getRepository(Folder);

    const character = await characterRepo.findOne({
        where: { id: characterId },
        relations: { owner: true },
    });

    if (!character) {
        return reply.status(404).send({ error: "Character not found" });
    }

    const authUser = request.user as { profileId: string } | undefined;
    const isOwner = authUser?.profileId === character.owner.id;

    if (character.visibility === "private" && !isOwner) {
        return reply.status(403).send({ error: "Forbidden" });
    }

    const folders = await folderRepo.find({
        where: {
            contentType: "art",
            character: { id: characterId },
        },
        relations: ["children"],
        order: { name: "ASC" },
    });

    return reply.send(buildFolderTree(folders));
};

export const deleteFolder = async (request: FastifyRequest, reply: FastifyReply) => {
    const { folderId } = request.params as { folderId: string };
    const { profileId } = request.user as { profileId: string };

    if (!folderId) {
        return reply.status(400).send({ error: "Missing folderId" });
    }

    const folderRepo = request.server.db.getRepository(Folder);

    const folder = await folderRepo.findOne({
        where: { id: folderId, owner: { id: profileId } },
    });

    if (!folder) {
        return reply.status(404).send({ error: "Folder not found" });
    }

    await folderRepo.remove(folder);

    return reply.send({ message: "Folder deleted" });
};

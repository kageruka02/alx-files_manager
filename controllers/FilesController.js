import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type, parentId = '0', isPublic = false, data } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }
    if (parentId !== '0') {
      const parentFile = await dbClient.db
        .collection('files')
        .findOne({ _id: ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    let file;
    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne({
        userId: ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === '0' ? '0' : ObjectId(parentId),
      });
      file = {
        id: result.insertedId.toString(),
        userId,
        name,
        type,
        isPublic,
        parentId: parentId === '0' ? '0' : parentId,
      };
    } else {
      const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
      const fileId = uuidv4();
      const localPath = path.join(FOLDER_PATH, fileId);
      await fs.mkdir(FOLDER_PATH, { recursive: true });
      await fs.writeFile(localPath, Buffer.from(data, 'base64'));
      const result = await dbClient.db.collection('files').insertOne({
        userId: ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === '0' ? '0' : ObjectId(parentId),
        localPath,
      });
      file = {
        id: result.insertedId.toString(),
        userId,
        name,
        type,
        isPublic,
        parentId: parentId === '0' ? '0' : parentId,
        localPath,
      };
    }

    return res.status(201).json(file);
  }
}

export default FilesController;

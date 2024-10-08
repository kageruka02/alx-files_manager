import { ObjectId } from 'mongodb';
import mime from 'mime-types';
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

    const {
      name, type, parentId = '0', isPublic = false, data,
    } = req.body;
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
        parentId: parentId === '0' ? 0 : ObjectId(parentId),
      });
      file = {
        id: result.insertedId.toString(),
        userId,
        name,
        type,
        isPublic,
        parentId: parentId === '0' ? 0 : parentId,
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
        parentId: parentId === '0' ? 0 : ObjectId(parentId),
        localPath,
      });
      file = {
        id: result.insertedId.toString(),
        userId,
        name,
        type,
        isPublic,
        parentId: parentId === '0' ? 0 : parentId,
        localPath,
      };
    }

    return res.status(201).json(file);
  }

  static async getShow(req, res) {
    const { id } = req.params;
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
    if (!file) {
      res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).send(file);
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const parentId = req.query.parentId || '0';
    const page = parseInt(req.query.page, 10) || 0;

    const pipeline = [
      {
        $match: {
          userId: ObjectId(userId),
          parentId: parentId === '0' ? '0' : ObjectId(parentId),
        },
      },
      {
        $skip: page * 20,
      },
      {
        $limit: 20,
      },
    ];

    try {
      const files = await dbClient.db
        .collection('files')
        .aggregate(pipeline)
        .toArray();
      return res.status(200).json(files);
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putPublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;

    try {
      const file = await dbClient.db.collection('files').findOne({
        _id: ObjectId(fileId),
        userId: ObjectId(userId),
      });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      await dbClient.db
        .collection('files')
        .updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });

      file.isPublic = true;
      return res.status(200).json(file);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Internal Server Error', details: error.message });
    }
  }

  // PUT /files/:id/unpublish
  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;

    try {
      const file = await dbClient.db.collection('files').findOne({
        _id: ObjectId(fileId),
        userId: ObjectId(userId),
      });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      await dbClient.db
        .collection('files')
        .updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });

      file.isPublic = false;
      return res.status(200).json(file);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Internal Server Error', details: error.message });
    }
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const token = req.header('X-Token');
    const userId = token ? await redisClient.get(`auth_${token}`) : null;

    try {
      const file = await dbClient.db
        .collection('files')
        .findOne({ _id: ObjectId(fileId) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Check if the file is a folder
      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      // Check if the file is public or belongs to the authenticated user
      if (!file.isPublic && (!userId || userId !== file.userId.toString())) {
        return res.status(404).json({ error: 'Not found' });
      }

      const filePath = file.localPath;

      try {
        const fileContent = await fs.readFile(filePath);
        const mimeType = mime.lookup(file.name) || 'application/octet-stream';

        return res
          .header('Content-Type', mimeType)
          .status(200)
          .send(fileContent);
      } catch (error) {
        return res.status(404).json({ error: 'Not found' });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Internal Server Error', details: error.message });
    }
  }
}

export default FilesController;

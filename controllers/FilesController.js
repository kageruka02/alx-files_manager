import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import MongoClient from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variable for folder path
const FOLDER_PATH =
  process.env.FOLDER_PATH || path.join(__dirname, '/tmp/files_manager');

const client = new MongoClient(process.env.MONGO_URI);
const db = client.db('files_manager');

class FilesController {
  static async postUpload(req, res) {
    try {
      const { name, type, parentId, isPublic = false, data } = req.body;
      const token = req.headers['x-token'];

      // Validate input
      if (!name) return res.status(400).json({ error: 'Missing name' });
      if (!type || !['folder', 'file', 'image'].includes(type))
        return res.status(400).json({ error: 'Missing or invalid type' });
      if (type !== 'folder' && !data)
        return res.status(400).json({ error: 'Missing data' });

      // Retrieve user based on token
      const user = await db.collection('users').findOne({ token });
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      // Validate parentId
      if (parentId) {
        const parentFile = await db
          .collection('files')
          .findOne({ _id: new MongoClient.ObjectId(parentId) });
        if (!parentFile)
          return res.status(400).json({ error: 'Parent not found' });
        if (parentFile.type !== 'folder')
          return res.status(400).json({ error: 'Parent is not a folder' });
      }

      // Process file
      let localPath = null;
      if (type !== 'folder') {
        if (!fs.existsSync(FOLDER_PATH)) {
          fs.mkdirSync(FOLDER_PATH, { recursive: true });
        }

        const fileId = uuidv4();
        localPath = path.join(FOLDER_PATH, fileId);
        fs.writeFileSync(localPath, Buffer.from(data, 'base64'));
      }

      // Create file document
      const newFile = {
        userId: user._id,
        name,
        type,
        isPublic,
        parentId: parentId || 0,
        localPath: localPath || null,
      };

      const result = await db.collection('files').insertOne(newFile);
      res.status(201).json({ id: result.insertedId, ...newFile });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default FilesController;

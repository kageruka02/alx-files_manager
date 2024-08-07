import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AuthController {
  static async getConnect(req, res) {
    const header = req.header('Authorization');
    if (!header || !header.startsWith('Basic')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const base64Credentials = header.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString(
      'ascii',
    );
    const [email, password] = credentials.split(':');
    const hashpassword = sha1(password);
    const user = await dbClient.db
      .collection('users')
      .findOne({ email, password: hashpassword });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = uuidv4();
    const tokenKey = `auth_${token}`;
    await redisClient.set(tokenKey, user._id.toString(), 86400);
    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.header('X-Token');
    const tokenKey = `auth_${token}`;
    const value = redisClient.get(tokenKey);
    if (!value) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await redisClient.del(tokenKey);
    return res.status(204).send();
  }
}

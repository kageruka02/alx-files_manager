import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }
    const userExist = await dbClient.db.collection('users').findOne({ email });
    if (userExist) {
      return res.status(400).json({ error: 'Already exist' });
    }
    const hashpassword = sha1(password);
    const newUser = await dbClient.db
      .collection('users')
      .insertOne({ email, password: hashpassword });
    return res.status(201).json({ id: newUser.insertedId, email });
  }

  static async getMe(req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const tokenKey = `auth_${token}`;
    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: dbClient.getObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ id: user._id.toS, email: user.email });
  }
}
export default UsersController;

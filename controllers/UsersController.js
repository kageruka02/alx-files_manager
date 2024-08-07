import sha1 from 'sha1';
import dbClient from '../utils/db';

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
}
export default UsersController;

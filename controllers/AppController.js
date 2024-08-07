import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export default class AppController {
  static async getStatus(req, res) {
    try {
      const isAlive = redisClient.isAlive();
      const dbisAlive = dbClient.isAlive();
      return res.status(200).json({ redis: isAlive, db: dbisAlive });
    } catch (error) {
      return res.status(500).json({ error: 'Error checking status' });
    }
  }

  static getStats(req, res) {
    Promise.all([dbClient.nbUsers(), dbClient.nbFiles()]).then(
      ([usersCount, filesCount]) => {
        res.status(200).json({ users: usersCount, files: filesCount });
      },
    );
  }
}

import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export default class AppController {
  static getStatus(req, res) {
    const isAlive = redisClient.isAlive();
    const dbisAlive = dbClient.isAlive();
    res.status(200).json({ redis: isAlive, db: dbisAlive });
  }

  static getStats(req, res) {
    Promise.all([dbClient.nbUsers(), dbClient.nbFiles()]).then(
      ([usersCount, filesCount]) => {
        res.status(200).json({ users: usersCount, files: filesCount });
      },
    );
  }
}

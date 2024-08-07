import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'file_manager';
    this.url = `mongodb://${this.host}:${this.port}`;
    this.client = new MongoClient(this.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    this.connected = false;
    this.client.connect((error) => {
      if (error) {
        console.error('failed to connect to mongodb', error);
        this.connected = false;
      } else {
        this.db = this.client.db(this.database);
        this.connected = true;
      }
    });
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    return this.db.collection('files').countDocuments();
  }
}
const dbClient = new DBClient();
export default dbClient;

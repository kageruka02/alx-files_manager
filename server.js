import express from 'express';
import router from './routes/index';

const PORT = process.env.PORT || 5000;
const app = express();
app.use(express.json());
app.use('/', router);

app.listen(PORT, (error) => {
  if (error) {
    console.error('not connected', error);
  }
});

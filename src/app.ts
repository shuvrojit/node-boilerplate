import express, { Express, Response } from 'express';
import morganMiddleware from './config/morgan';

const app: Express = express();

app.use(express.json());

app.use(morganMiddleware);

app.get('/', (_, res: Response) => {
  res.status(200);
  res.send('root');
});

export default app;

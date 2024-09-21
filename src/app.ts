import express, { Express, Response } from 'express';

const app: Express = express();

app.get('/', (res: Response) => {
  res.status(200);
  res.send('home public');
});

export default app;

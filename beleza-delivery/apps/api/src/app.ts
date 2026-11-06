import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

export const app = express();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'beleza-delivery-api' });
});

app.get('/', (_req, res) => {
  res.json({ message: 'API Beleza Delivery ativa' });
});

import express from 'express';
import mustacheExpress from 'mustache-express';
import * as path from 'path';

export const app = express();
app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '../views'));
app.use(express.json());

export const router = express.Router();

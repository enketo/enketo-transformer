import bodyParser from 'body-parser';
import express from 'express';
import config from './config/config.json';
import { api } from './src/api';

const app = express();

Object.entries(config).forEach(([key, value]) => {
    app.set(key, value);
});

app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

api(app);

export { app };

import bodyParser from 'body-parser';
import express from 'express';
import { config } from '../config/build.shared';
import { api } from './api';

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

if (ENV === 'production') {
    app.listen(app.get('port'), () => {
        console.warn(`enketo-transformer running on port ${app.get('port')}!`);
    });
}

export { app };

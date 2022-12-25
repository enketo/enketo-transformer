/**
 * @module api
 *
 * @description This is not a robust, secure web API. It is just a quick starting point.
 * This repo is not used in production as a web API (only as a library).
 *
 * See inventory of work to be done here: https://github.com/enketo/enketo-transformer/labels/web-api-only.
 *
 * PRs are very welcome!
 */

const express = require('express');
const { request } = require('undici');
const transformer = require('./transformer');

const router = express.Router();

class FetchError extends Error {
    /**
     * @param {number} status
     * @param {string} message
     */
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

/**
 * @param {express.Request} req
 * @returns {Promise<string>}
 */
const getXForm = async (req) => {
    const url = req.query.xform;

    try {
        const response = await request(url, {
            headers: {
                'X-OpenRosa-Version': '1.0',
            },
        });
        const { statusCode } = response;

        if (statusCode === 401) {
            throw new FetchError(
                statusCode,
                'Forbidden. Authorization Required.'
            );
        }

        if (statusCode < 200 || statusCode >= 300) {
            throw new FetchError(statusCode, `Request to ${url} failed.`);
        }

        return response.body.text();
    } catch (error) {
        console.error(`Error occurred when requesting ${url}`, error);

        if (error.status == null) {
            throw new FetchError(500, error.message ?? 'Unknown error.');
        }

        throw error;
    }
};

/**
 * @param {import('express').Request} req
 * @returns {Promise<import('./transformer').TransformedSurvey>}
 */
const getTransformedSurvey = async (req) => {
    const isPost = req.method === 'POST';
    const payload = isPost ? req.body : req.query;
    const { markdown, openclinica, theme } = payload;
    const media = isPost ? payload.media : {};
    const xform = req.method === 'POST' ? payload.xform : await getXForm(req);

    return transformer.transform({
        xform,
        markdown: markdown !== 'false',
        openclinica: openclinica === 'true',
        media,
        theme,
    });
};

router
    .all('/', (req, res, next) => {
        try {
            if (req.app.get('secure')) {
                throw new FetchError(405, 'Not Allowed.');
            }

            const payload = req.method === 'POST' ? req.body : req.query;

            if (payload.xform == null) {
                throw new FetchError(400, 'Bad Request.');
            }

            // Allow requests from anywhere
            res.set('Access-Control-Allow-Origin', '*');
            next();
        } catch (error) {
            next(error);
        }
    })
    .get('/', async (req, res) => {
        try {
            const survey = await getTransformedSurvey(req);

            res.json(survey);
        } catch (error) {
            res.status(error.status).send(
                `${error.message} (stack: ${error.stack})`
            );
        }
    })
    .post('/', async (req, res) => {
        try {
            const survey = await getTransformedSurvey(req);

            res.json(survey);
        } catch (error) {
            res.status(error.status).send(
                `${error.message} (stack: ${error.stack})`
            );
        }
    })
    // for development purposes, to return HTML that can be easily inspected in the developer console
    .get('/htmlform', async (req, res) => {
        try {
            const { form } = await getTransformedSurvey(req);

            res.set('Content-Type', 'text/html');
            res.end(form);
        } catch (error) {
            res.status(error.status).send.send(
                `${error.message} (stack: ${error.stack})`
            );
        }
    });

module.exports = (app) => {
    app.use('/transform', router);
};

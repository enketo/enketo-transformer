import { transform } from '../src/node';

describe('Node bridge to headless browser', () => {
    it('calls a browser `transform` function', async () => {
        let caught: Error | null = null;

        const { default: xform } = await import(
            './forms/advanced-required.xml?raw'
        );

        try {
            await transform({ xform });
        } catch (error) {
            caught = error as Error;
        }

        expect(caught).to.deep.equal(new Error('Not implemented (yet).'));
    });
});

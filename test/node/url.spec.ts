import { escapeURLPath } from '../../src/url';

describe('URL escaping', () => {
    it('does not add a leading slash when the input does not have one', () => {
        const escaped = escapeURLPath('no leading slash.png');

        expect(escaped).to.equal('no%20leading%20slash.png');
    });
});

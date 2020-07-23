const chai = require( 'chai' );
const expect = chai.expect;
const language = require( '../src/language' );

describe( 'language', () => {

    describe( 'parser', () => {
        let test;

        test = t => {
            const name = t[ 0 ];
            const sample = t[ 1 ];
            const expected = t[ 2 ];
            it( `parses "${name}" with sample "${sample}" correctly`, () => {
                expect( language.parse( name, sample ) ).to.deep.equal( expected );
            } );
        };

        [
            // no lanuage (only inline XForm text)
            [ '', 'a', {
                tag: '',
                desc: '',
                dir: 'ltr',
                src: ''
            } ],
            [ '', 'رب', {
                tag: '',
                desc: '',
                dir: 'rtl',
                src: ''
            } ],
            // non-recommended ways, some half-hearted attempt to determine at least dir correctly
            [ 'Arabic', 'رب', {
                tag: 'ar',
                desc: 'Arabic',
                dir: 'rtl',
                src: 'Arabic'
            } ],
            [ 'arabic', 'رب', {
                tag: 'ar',
                desc: 'arabic',
                dir: 'rtl',
                src: 'arabic'
            } ],
            [ 'العربية', 'رب', {
                tag: 'العربية',
                desc: 'العربية',
                dir: 'rtl',
                src: 'العربية'
            } ],
            [ 'English', 'hi', {
                tag: 'en',
                desc: 'English',
                dir: 'ltr',
                src: 'English'
            } ],
            [ 'Dari', 'کن', {
                tag: 'prs',
                desc: 'Dari',
                dir: 'rtl',
                src: 'Dari'
            } ],
            // spaces
            [ '  fantasy lang  ', 'bl', {
                tag: 'fantasy lang',
                desc: 'fantasy lang',
                dir: 'ltr',
                src: '  fantasy lang  '
            } ],
            [ 'fantasy lang', 'ک', {
                tag: 'fantasy lang',
                desc: 'fantasy lang',
                dir: 'rtl',
                src: 'fantasy lang'
            } ],
            // better way, which works well in Enketo (not in ODK Collect), 
            // description is automatically set to English description if tag is found
            [ 'ar', 'رب', {
                tag: 'ar',
                desc: 'Arabic',
                dir: 'rtl',
                src: 'ar'
            } ],
            [ 'ar-IR', 'رب', {
                tag: 'ar-IR',
                desc: 'Arabic',
                dir: 'rtl',
                src: 'ar-IR'
            } ],
            [ 'nl', 'he', {
                tag: 'nl',
                desc: 'Dutch',
                dir: 'ltr',
                src: 'nl'
            } ],
            // the recommended future-proof way
            [ 'ArabicDialect (ar)', 'رب', {
                tag: 'ar',
                desc: 'ArabicDialect',
                dir: 'rtl',
                src: 'ArabicDialect (ar)'
            } ],
            // sample contains markdown tag
            [ 'Dari (prs)', '# نام فورم', {
                tag: 'prs',
                desc: 'Dari',
                dir: 'rtl',
                src: 'Dari (prs)'
            } ],
            // sample returns 'bidi' directionality -> rtl
            [ 'Sorani (ckb)', 'رهگهز', {
                tag: 'ckb',
                desc: 'Sorani', // or Central Kurdish?
                dir: 'rtl',
                src: 'Sorani (ckb)'
            } ],
            // no space before paren open
            [ 'ArabicDialect(ar)', 'رب', {
                tag: 'ar',
                desc: 'ArabicDialect',
                dir: 'rtl',
                src: 'ArabicDialect(ar)'
            } ],
            [ 'Nederlands (nl)', 'heej', {
                tag: 'nl',
                desc: 'Nederlands',
                dir: 'ltr',
                src: 'Nederlands (nl)'
            } ],
            // recommended way, spaces in name
            [ 'Arabic Dialect (ar)', 'رب', {
                tag: 'ar',
                desc: 'Arabic Dialect',
                dir: 'rtl',
                src: 'Arabic Dialect (ar)'
            } ],
            // unmatchable tag
            [ '0a', 'd', {
                tag: '0a',
                desc: '0a',
                dir: 'ltr',
                src: '0a'
            } ],
            // unmatchable description
            [ 'nonexisting', 'd', {
                tag: 'nonexisting',
                desc: 'nonexisting',
                dir: 'ltr',
                src: 'nonexisting'
            } ],
            // unmatchable tag and unmatchable description
            [ 'nonexisting (0a)', 'd', {
                tag: '0a',
                desc: 'nonexisting',
                dir: 'ltr',
                src: 'nonexisting (0a)'
            } ],
        ].forEach( test );

    } );

} );

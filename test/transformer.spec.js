const chai = require( 'chai' );
const chaiAsPromised = require( 'chai-as-promised' );
const expect = chai.expect;
const fs = require( 'fs' );
const DOMParser = require( 'xmldom' ).DOMParser;
const parser = new DOMParser();
const transformer = require( '../src/transformer' );

chai.use( chaiAsPromised );

function parseHtmlForm( transformationResult ) {
    return parser.parseFromString( transformationResult.form, 'text/html' );
}

function findElementByName( htmlDoc, tagName, nameAttributeValue ) {
    const elements = Array.prototype.slice.call( htmlDoc.getElementsByTagName( tagName ) );
    const target = elements.find( el => el.getAttribute( 'name' ) === nameAttributeValue );

    return target || null;
}

function findElementsByName( htmlDoc, tagName, nameAttributeValue ) {
    const elements = Array.prototype.slice.call( htmlDoc.getElementsByTagName( tagName ) );

    return elements.filter( el => el.getAttribute( 'name' ) === nameAttributeValue );
}

describe( 'transformer', () => {

    describe( 'transforms valid XForms', () => {
        const xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
        const result = transformer.transform( {
            xform
        } );

        it( 'without an error', () => Promise.all( [
            expect( result ).to.eventually.to.be.an( 'object' ),
            expect( result ).to.eventually.have.property( 'form' ).and.to.not.be.empty,
            expect( result ).to.eventually.have.property( 'model' ).and.to.not.be.empty,
            expect( result ).to.eventually.have.property( 'transformerVersion' ).and.to.not.be.empty,
        ] ) );

        it( 'does not include the xform in the response', () => expect( result ).to.eventually.not.have.property( 'xform' ) );

    } );

    describe( 'transforms invalid XForms', () => {
        const invalid_xforms = [ undefined, null, '', '<data>' ];

        invalid_xforms.forEach( xform => {
            it( 'with a parse error', () => {
                const result = transformer.transform( {
                    xform
                } );

                return expect( result ).to.eventually.be.rejectedWith( Error );
            } );
        } );
    } );

    describe( 'copies attributes on the `<model>`', () => {
        it( 'copies the odk:xforms-version attribute', () => {
            const xform = fs.readFileSync( './test/forms/autocomplete.xml', 'utf8' );
            const result = transformer.transform( { xform } );

            return expect( result ).to.eventually.have.property( 'model' ).and.to.contain( 'odk:xforms-version="1.0.0"' );
        } );
    } );

    describe( 'manipulates themes and', () => {
        const xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );

        it( 'adds a provided theme if none is defined in the XForm', () => {
            const result = transformer.transform( {
                xform,
                theme: 'mytheme'
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'theme-mytheme' );
        } );

        it( 'leaves the XForm-defined theme unchanged if the theme value provided is falsy', () => {
            const newXform = xform.replace( '<h:body>', '<h:body class="theme-one">' ),
                result1 = transformer.transform( {
                    xform: newXform
                } ),
                result2 = transformer.transform( {
                    xform: newXform,
                    theme: ''
                } ),
                result3 = transformer.transform( {
                    xform: newXform,
                    theme: null
                } ),
                result4 = transformer.transform( {
                    xform: newXform,
                    theme: false
                } );

            return Promise.all( [
                expect( result1 ).to.eventually.have.property( 'form' ).and.to.contain( 'theme-one' ),
                expect( result2 ).to.eventually.have.property( 'form' ).and.to.contain( 'theme-one' ),
                expect( result3 ).to.eventually.have.property( 'form' ).and.to.contain( 'theme-one' ),
                expect( result4 ).to.eventually.have.property( 'form' ).and.to.contain( 'theme-one' )
            ] );
        } );

        it( 'replaces a theme defined in the XForm with a provided one', () => {
            const newXform = xform.replace( '<h:body>', '<h:body class="theme-one">' ),
                result = transformer.transform( {
                    xform: newXform,
                    theme: 'mytheme'
                } );

            return Promise.all( [
                expect( result ).to.eventually.have.property( 'form' ).and.to.not.contain( 'theme-one' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'theme-mytheme' )
            ] );
        } );

    } );

    describe( 'manipulates languages and', () => {
        it( 'provides a languageMap as output property', () => {
            const xform = fs.readFileSync( './test/forms/advanced-required.xml', 'utf8' );
            const result = transformer.transform( {
                xform
            } );

            return expect( result ).to.eventually.have.property( 'languageMap' ).and.to.deep.equal( {
                'dutch': 'nl',
                'english': 'en'
            } );
        } );

        it( 'provides an empty languageMap as output property if nothing was changed', () => {
            const xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            const result = transformer.transform( {
                xform
            } );

            return expect( result ).to.eventually.have.property( 'languageMap' ).and.to.deep.equal( {} );
        } );
    } );

    describe( 'renders markdown', () => {
        it( 'takes into account that libxmljs Element.text() converts html entities', () => {
            const xform = fs.readFileSync( './test/forms/external.xml', 'utf8' );
            const result = transformer.transform( {
                xform
            } );

            return Promise.all( [
                expect( result ).to.eventually.have.property( 'form' )
                    .and.to.not.contain( '&lt;span style="color:pink;"&gt;Intro&lt;/span&gt;' ),
                expect( result ).to.eventually.have.property( 'form' )
                    .and.to.contain( '<span style="color:pink;">Intro</span>' )
            ] );
        } );

        it( 'and picks up formatting of <output>s', () => {
            const xform = fs.readFileSync( './test/forms/formatted-output.xml', 'utf8' );
            const result = transformer.transform( {
                xform
            } );

            return expect( result ).to.eventually.have.property( 'form' )
                .and.to.contain( 'formatted: <em><span class="or-output" data-value="/output/txt"> </span></em> and' );
        } );
    } );

    describe( 'does not render markdown', () => {
        it( 'when `markdown: false` is provided as option', () => {
            const xform = fs.readFileSync( './test/forms/formatted-output.xml', 'utf8' );
            const result = transformer.transform( {
                xform,
                markdown: false
            } );

            return expect( result ).to.eventually.have.property( 'form' )
                .and.to.contain( 'formatted: *<span class="or-output" data-value="/output/txt"> </span>* and _normal_ text' );
        } );
    } );

    describe( 'manipulates media sources', () => {

        it( 'in the View by replacing media elements according to a provided map', () => {
            const xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            const media = {
                'happy.jpg': '/i/am/happy.jpg',
                'pigeon.png': '/a/b/pigeon.png'
            };
            const result1 = transformer.transform( {
                xform
            } );
            const result2 = transformer.transform( {
                xform,
                media
            } );

            return Promise.all( [
                expect( result1 ).to.eventually.have.property( 'form' ).and.to.contain( 'jr://images/happy.jpg' ),
                expect( result1 ).to.eventually.have.property( 'form' ).and.to.contain( 'jr://images/pigeon.png' ),
                expect( result1 ).to.eventually.have.property( 'form' ).and.to.not.contain( '/i/am/happy.jpg' ),
                expect( result1 ).to.eventually.have.property( 'form' ).and.to.not.contain( '/a/b/pigeon.png' ),

                expect( result2 ).to.eventually.have.property( 'form' ).and.to.not.contain( 'jr://images/happy.jpg' ),
                expect( result2 ).to.eventually.have.property( 'form' ).and.to.not.contain( 'jr://images/pigeon.png' ),
                expect( result2 ).to.eventually.have.property( 'form' ).and.to.contain( '/i/am/happy.jpg' ),
                expect( result2 ).to.eventually.have.property( 'form' ).and.to.contain( '/a/b/pigeon.png' )
            ] );
        } );

        it( 'in the View by replacing big-image link hrefs according to a provided map', () => {
            const img = '<value form="image">jr://images/happy.jpg</value>';
            const xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' )
                .replace( img, `${img}\n<value form="big-image">jr://images/very-happy.jpg</value>` );
            const media = {
                'happy.jpg': '/i/am/happy.jpg',
                'very-happy.jpg': '/i/am/very-happy.jpg',
            };
            const result = transformer.transform( {
                xform,
                media
            } );

            return Promise.all( [
                expect( result ).to.eventually.have.property( 'form' ).and.not.to.contain( 'jr://images/happy.jpg' ),
                expect( result ).to.eventually.have.property( 'form' ).and.not.to.contain( 'jr://images/very-happy.jpg' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( '/i/am/happy.jpg' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( '/i/am/very-happy.jpg' ),
            ] );
        } );

        it( 'in the Model by replacing them according to a provided map', () => {
            const xform = fs.readFileSync( './test/forms/external.xml', 'utf8' );
            const media = {
                'neighborhoods.csv': '/path/to/neighborhoods.csv',
                'cities.xml': '/path/to/cities.xml'
            };
            const result1 = transformer.transform( {
                xform
            } );
            const result2 = transformer.transform( {
                xform,
                media
            } );

            return Promise.all( [
                expect( result1 ).to.eventually.have.property( 'model' ).and.to.contain( 'jr://file-csv/neighborhoods.csv' ),
                expect( result1 ).to.eventually.have.property( 'model' ).and.to.contain( 'jr://file/cities.xml' ),
                expect( result1 ).to.eventually.have.property( 'model' ).and.to.not.contain( '/path/to/neighborhoods.csv' ),
                expect( result1 ).to.eventually.have.property( 'model' ).and.to.not.contain( '/path/to/cities.xml' ),

                expect( result2 ).to.eventually.have.property( 'model' ).and.to.not.contain( 'jr://file-csv/neighborhoods.csv' ),
                expect( result2 ).to.eventually.have.property( 'model' ).and.to.not.contain( 'jr://file/cities.xml' ),
                expect( result2 ).to.eventually.have.property( 'model' ).and.to.contain( '/path/to/neighborhoods.csv' ),
                expect( result2 ).to.eventually.have.property( 'model' ).and.to.contain( '/path/to/cities.xml' )
            ] );
        } );

        it( `in the model for binary questions that contain a default value by copying to a
            src attribute and resolving the URL according to a provided map`, () => {
            const xform = fs.readFileSync( './test/forms/image-default.xml', 'utf8' );
            const media = {
                'happy.jpg': 'https://feelings/happy.jpg',
                'unhappy.jpg': 'https://feelings/unhappy.jpg',
                'indifferent.png': 'https://feelings/indifferent.png'
            };

            const result = transformer.transform( {
                xform,
                media
            } );

            return Promise.all( [
                expect( result ).to.eventually.have.property( 'model' )
                    .and.to.contain( '<ann src="https://feelings/unhappy.jpg">jr://images/unhappy.jpg</ann>' ),
                expect( result ).to.eventually.have.property( 'model' )
                    .and.to.contain( '<dra src="https://feelings/indifferent.png">jr://images/indifferent.png</dra>' )
            ] );
        } );

        it( 'by adding a form logo <img> if needed', () => {
            const xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            const media = {
                'form_logo.png': '/i/am/logo.png'
            };
            const result1 = transformer.transform( {
                xform
            } );
            const result2 = transformer.transform( {
                xform,
                media
            } );

            return Promise.all( [
                expect( result1 ).to.eventually.have.property( 'form' ).and.to.not.contain( '<img src="/i/am/logo.png"' ),
                expect( result2 ).to.eventually.have.property( 'form' ).and.to.contain( '<img src="/i/am/logo.png"' )
            ] );
        } );

    } );

    describe( 'processes questions with constraints', () => {
        it( 'and adds the correct number of constraint-msg elements', () => {
            const count = result => {
                const matches = result.form.match( /class="or-constraint-msg/g );

                return matches ? matches.length : 0;
            };
            const xform1 = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            const count1 = transformer.transform( {
                xform: xform1
            } ).then( count );
            const xform2 = fs.readFileSync( './test/forms/advanced-required.xml', 'utf8' );
            const count2 = transformer.transform( {
                xform: xform2
            } ).then( count );

            return Promise.all( [
                expect( count1 ).to.eventually.equal( 4 ),
                expect( count2 ).to.eventually.equal( 0 )
            ] );
        } );

    } );

    describe( 'processes required questions', () => {

        it( 'and adds the data-required HTML attribute for required XForm attributes keeping the value unchanged', () => {
            const xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            const result = transformer.transform( {
                xform
            } );

            return Promise.all( [
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'data-required="true()"' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.not.contain( ' required="required"' )
            ] );
        } );

        it( 'and does not add the data-required attribute if the value is false()', () => {
            const xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' ).replace( 'required="true()"', 'required="false()"' );
            const result = transformer.transform( {
                xform
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.not.contain( 'data-required' );
        } );

        it( 'and adds the correct number of required-msg elements', () => {
            const count = result => result.form.match( /class="or-required-msg/g ).length;
            const xform1 = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            const count1 = transformer.transform( {
                xform: xform1
            } ).then( count );
            const xform2 = fs.readFileSync( './test/forms/advanced-required.xml', 'utf8' );
            const count2 = transformer.transform( {
                xform: xform2
            } ).then( count );

            return Promise.all( [
                expect( count1 ).to.eventually.equal( 1 ),
                expect( count2 ).to.eventually.equal( 2 )
            ] );
        } );

        it( 'and adds a default requiredMsg if no custom is provided', () => {
            const xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            const result = transformer.transform( {
                xform
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'data-i18n="constraint.required"' );
        } );

        it( 'and adds a custom requiredMsg if provided', () => {
            const xform = fs.readFileSync( './test/forms/advanced-required.xml', 'utf8' ).replace( 'required="true()"', 'required="false()"' );
            const result = transformer.transform( {
                xform
            } );

            return Promise.all( [
                expect( result ).to.eventually.have.property( 'form' ).and.to.not.contain( 'data-i18n' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'custom verplicht bericht' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'custom required message' )
            ] );
        } );

    } );

    describe( 'processes multiline questions', () => {

        it( 'and outputs a textarea for appearance="multiline" on text input', () => {
            const xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            const result = transformer.transform( {
                xform
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.contain( '<textarea' );
        } );

        it( 'and outputs a textarea for appearance="multi-line" on text input', () => {
            const xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' ).replace( 'appearance="multiline"', 'appearance="multi-line"' );
            const result = transformer.transform( {
                xform
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.contain( '<textarea' );
        } );

        it( 'and outputs a textarea for appearance="textarea" on text input', () => {
            const xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' ).replace( 'appearance="multiline"', 'appearance="textarea"' );
            const result = transformer.transform( {
                xform
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.contain( '<textarea' );
        } );

        it( 'and outputs a textarea for appearance="text-area" on text input', () => {
            const xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' ).replace( 'appearance="multiline"', 'appearance="text-area"' );
            const result = transformer.transform( {
                xform
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.contain( '<textarea' );
        } );

        it( 'and outputs a textarea for rows="x" attribute on text input, with a rows appearance', () => {
            const xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' ).replace( 'appearance="multiline"', 'rows="5"' );
            const result = transformer.transform( {
                xform
            } );

            return Promise.all( [
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( '<textarea' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'or-appearance-rows-5' )
            ] );
        } );

    } );

    describe( 'processes autocomplete questions by producing <datalist> elements', () => {

        it( 'and outputs <datalist> elements', () => {
            const xform = fs.readFileSync( './test/forms/autocomplete.xml' );
            const transform = transformer.transform( { xform } ).then( parseHtmlForm );

            return transform.then( doc => {
                return Promise.all( [
                    expect( doc ).to.be.an( 'object' ),
                    expect( doc.getElementsByTagName( 'select' ) ).to.have.length( 4 ),
                    expect( doc.getElementsByTagName( 'datalist' ) ).to.have.length( 2 ),
                    expect( doc.getElementById( 'selectoneautocompletethree' ).nodeName.toLowerCase() ).to.equal( 'datalist' ),
                    expect( doc.getElementsByTagName( 'input' )[ 0 ].getAttribute( 'list' ) ).to.equal( 'selectoneautocompletethree' ),
                    expect( doc.getElementsByTagName( 'input' )[ 0 ].getAttribute( 'type' ) ).to.equal( 'text' ),
                    expect( doc.getElementById( 'selectoneautocompletefour' ).nodeName.toLowerCase() ).to.equal( 'datalist' ),
                    expect( doc.getElementsByTagName( 'input' )[ 1 ].getAttribute( 'list' ) ).to.equal( 'selectoneautocompletefour' )
                ] );
            } );
        } );

    } );

    describe( 'processes a model with namespaces', () => {
        const xform = fs.readFileSync( './test/forms/model-namespace.xml' );
        const result = transformer.transform( {
            xform
        } );

        it( 'leaves namespace prefixes and declarations intact on nodes', () => Promise.all( [
            expect( result ).to.eventually.have.property( 'model' ).and.to.contain( '<orx:instanceID' ),
            expect( result ).to.eventually.have.property( 'model' ).and.to.contain( 'xmlns:orx="http://openrosa.org/xforms"' ),
            expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'name="/data/orx:meta/orx:instanceID' ),
        ] ) );

        it( 'leaves namespace prefixes and declarations intact on node attributes', () => Promise.all( [
            expect( result ).to.eventually.have.property( 'model' ).and.to.contain( '<a orx:comment="/data/a_comment"/>' ),
        ] ) );
    } );

    describe( 'supports the enk:for attribute', () => {
        const xform = fs.readFileSync( './test/forms/for.xml' );
        const result = transformer.transform( {
            xform
        } );

        it( 'by turning it into the data-for attribute', () => Promise.all( [
            expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'data-for="../a"' ),
        ] ) );
    } );

    describe( 'for backwards compatibility of forms without a /meta/instanceID node', () => {
        const xform1 = fs.readFileSync( './test/forms/no-instance-id.xml' );
        const result1 = transformer.transform( {
            xform: xform1
        } );

        it( 'adds a /meta/instanceID node', () => expect( result1 ).to.eventually.have.property( 'model' ).and.to.contain( '<meta><instanceID/></meta>' ) );

        const xform2 = fs.readFileSync( './test/forms/model-namespace.xml' );
        const result2 = transformer.transform( {
            xform: xform2
        } );

        it( 'does not add it if it contains /meta/instanceID in the OpenRosa namespace', () => expect( result2 ).to.eventually.have.property( 'model' ).and.to.not.contain( '<instanceID/>' ) );
    } );

    describe( 'converts deprecated', () => {
        const xform = fs.readFileSync( './test/forms/deprecated.xml' );
        const result = transformer.transform( { xform } );

        it( 'method="form-data-post" to "post" in submission element', () => expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'method="post"' ) );
    } );

    describe( 'oc:relevantMsg binding attributes', () => {
        const xform = fs.readFileSync( './test/forms/relevant_constraint_required.xml' );

        it( 'if includeRelevantMsg=1, are copied to or-relevant-msg elements or a default is added for relevant expressions', () => {
            const result = transformer.transform( {
                xform,
                includeRelevantMsg: 1
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.satisfy( form => form.match( /or-relevant-msg/g ).length === 4 );
        } );

        it( 'are ignored by default', () => {
            const result = transformer.transform( {
                xform
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.not.to.contain( 'or-relevant-msg' );
        } );

    } );

    describe( 'itext ids for itemsets are extracted', () => {
        const xform = fs.readFileSync( './test/forms/rank.xml', 'utf8' );
        const MATCH = /itemset-labels.+Mexico.+USA.+The Netherlands/;
        const REPLACE = /randomize\(.+\)/;

        it( 'works for itemset nodesets using a simple randomize()', () => {
            const result = transformer.transform( { xform } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.match( MATCH );
        } );

        it( 'works for itemset nodesets using a randomize() with static seed', () => {
            const result = transformer.transform( {
                xform: xform.replace( REPLACE, 'randomize(instance(\'holiday\')/root/item, 34)' )
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.match( MATCH );
        } );

        xit( 'works for itemset nodesets using a simple randomize() with complex multi-parameter predicate function', () => {
            const result = transformer.transform( {
                xform: xform.replace( REPLACE, 'randomize(instance(\'holiday\')/root/item[value=concat("a", "b")]/name)' )
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.match( MATCH );
        } );

        xit( 'works for itemset nodesets using a randomize() with a static seed and with a complex multi-parameter predicate function', () => {
            const result = transformer.transform( {
                xform: xform.replace( REPLACE, 'randomize(instance(\'holiday\')/root/item[value=concat("a", "b")]/name, 34)' )
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.match( MATCH );
        } );
    } );


    describe( 'range questions', () => {

        it( 'with "picker" appearance, have the same HTML form output as the equivalent select-one-minimal question', () => {
            const selectMinimalXform = fs.readFileSync( './test/forms/select-one-numbers.xml', 'utf8' );
            const rangePickerXform = fs.readFileSync( './test/forms/range-picker.xml', 'utf8' );

            return Promise.all( [
                transformer.transform( { xform: selectMinimalXform } ),
                transformer.transform( { xform: rangePickerXform } )
            ] ).then( results => {
                // eliminate some acceptable differences:
                const modifiedSelectMinimalResult = results[ 0 ].form
                    .replace( 'or-appearance-minimal', '' )
                    .replace( /data-type-xml=".+" /, '' )
                    .replace( /data-name=".+" /, '' );
                const modifiedRangePickerResult = results[ 1 ].form
                    .replace( 'or-appearance-picker', '' )
                    .replace( /data-type-xml=".+" /, '' )
                    .replace( /min=".+" /, '' )
                    .replace( /max=".+" /, '' )
                    .replace( /step=".+" /, '' );

                expect( modifiedSelectMinimalResult ).to.equal( modifiedRangePickerResult );
            } );

        } );
    } );

    describe( 'setvalue actions', () => {
        const xform = fs.readFileSync( './test/forms/setvalue.xml', 'utf8' );
        const transform = transformer.transform( { xform } ).then( parseHtmlForm );

        it( 'included in XForm body', () => {
            return transform
                .then( form => {
                    const target = findElementByName( form, 'input', '/data/b' );
                    expect( target ).to.not.equal( null );
                    expect( target.getAttribute( 'data-event' ) ).to.equal( 'odk-instance-first-load' );
                    expect( target.getAttribute( 'data-setvalue' ) ).to.equal( 'string-length(/data/c)' );
                    expect( target.getAttribute( 'data-type-xml' ) ).to.equal( 'string' );
                } );
        } );

        it( 'included as XForm <bind> sibling ', () => {
            return transform
                .then( form => {
                    const target = findElementByName( form, 'input', '/data/a' );
                    expect( target ).to.not.equal( null );
                    expect( target.getAttribute( 'data-event' ) ).to.equal( 'odk-instance-first-load' );
                    expect( target.getAttribute( 'data-setvalue' ) ).to.equal( '"ab"' );
                    expect( target.getAttribute( 'data-type-xml' ) ).to.equal( 'int' );
                } );
        } );

        it( 'with odk-new-repeat included inside a repeat ', () => {
            return transform
                .then( form => {
                    const targets = findElementsByName( form, 'input', '/data/person/age' );
                    // Duplicates added by xsl sheet are merged.
                    expect( targets.length ).to.equal( 1 );
                    // The empty .setvalue label is removed.
                    expect( form.getElementsByTagName( 'label' ).length ).to.equal( 5 );
                    const target = targets[ 0 ];
                    expect( target ).to.not.equal( null );
                    expect( target.getAttribute( 'data-event' ) ).to.equal( 'odk-new-repeat odk-instance-first-load' );
                    expect( target.getAttribute( 'data-setvalue' ) ).to.equal( '../../my_age + 2' );
                    expect( target.getAttribute( 'data-type-xml' ) ).to.equal( 'decimal' );
                } );
        } );

        it( 'with xforms-value-changed included inside an input form control', () => {
            return transform
                .then( form => {
                    const target = findElementByName( form, 'input', '/data/person/age_changed' );
                    expect( target ).to.not.equal( null );
                    // The nested labels are removed
                    expect( form.getElementsByTagName( 'label' ).length ).to.equal( 5 );
                    expect( target.getAttribute( 'data-event' ) ).to.equal( 'xforms-value-changed' );
                    expect( target.getAttribute( 'data-setvalue' ) ).to.equal( '"Age changed!"' );
                    expect( target.getAttribute( 'data-type-xml' ) ).to.equal( 'string' );
                    // Check location as sibling of /data/person/age
                    const sibling = target.parentNode.getElementsByTagName( 'input' )[ 0 ];
                    expect( sibling.getAttribute( 'name' ) ).to.equal( '/data/person/age' );
                } );
        } );

        it( 'with xforms-value-changed included inside a select1 form control with minimal appearance', () => {
            return transform
                .then( form => {
                    const target = findElementByName( form, 'input', '/data/my_age_changed' );
                    expect( target ).to.not.equal( null );
                    // The nested labels are removed
                    expect( form.getElementsByTagName( 'label' ).length ).to.equal( 5 );
                    expect( target.getAttribute( 'data-event' ) ).to.equal( 'xforms-value-changed' );
                    expect( target.getAttribute( 'data-setvalue' ) ).to.equal( '3+3' );
                    expect( target.getAttribute( 'data-type-xml' ) ).to.equal( 'int' );
                    // check location of target as sibling <select>
                    const sibling = target.parentNode.getElementsByTagName( 'select' )[ 0 ];
                    expect( sibling.getAttribute( 'name' ) ).to.equal( '/data/my_age' );
                } );
        } );

        it( 'with xforms-value-changed included inside a select1 form control', () => {
            const xform2 = xform.replace( 'appearance="minimal"', '' );
            const transform = transformer.transform( { xform: xform2 } ).then( parseHtmlForm );

            return transform
                .then( form => {
                    const target = findElementByName( form, 'input', '/data/my_age_changed' );
                    expect( target ).to.not.equal( null );
                    // The nested labels are removed
                    expect( form.getElementsByTagName( 'label' ).length ).to.equal( 6 );
                    expect( target.getAttribute( 'data-event' ) ).to.equal( 'xforms-value-changed' );
                    expect( target.getAttribute( 'data-setvalue' ) ).to.equal( '3+3' );
                    expect( target.getAttribute( 'data-type-xml' ) ).to.equal( 'int' );
                    // check location of target inside same label as input[name="/data/my_age"]
                    const radio = target.parentNode.getElementsByTagName( 'input' )[ 0 ];
                    expect( radio.getAttribute( 'name' ) ).to.equal( '/data/my_age' );
                } );
        } );

        it( 'with xforms-value-changed included inside a rank form control', () => {
            const xform2 = xform.replace( 'appearance="minimal"', '' ).replace( /select1/g, 'odk:rank' );
            const transform = transformer.transform( { xform: xform2 } ).then( parseHtmlForm );

            return transform
                .then( form => {
                    const target = findElementByName( form, 'input', '/data/my_age_changed' );
                    expect( target ).to.not.equal( null );
                    // The nested labels are removed
                    expect( form.getElementsByTagName( 'label' ).length ).to.equal( 6 );
                    expect( target.getAttribute( 'data-event' ) ).to.equal( 'xforms-value-changed' );
                    expect( target.getAttribute( 'data-setvalue' ) ).to.equal( '3+3' );
                    expect( target.getAttribute( 'data-type-xml' ) ).to.equal( 'int' );
                    // check location of target inside same label as input[name="/data/my_age"]
                    const radio = target.parentNode.getElementsByTagName( 'input' )[ 0 ];
                    expect( radio.getAttribute( 'name' ) ).to.equal( '/data/my_age' );

                } );
        } );

        it( 'with xforms-value-changed included inside a range form control', () => {
            const xform2 = xform.replace( /<input ref="\/data\/person\/age">(.*)<\/input>/gm, '<range ref="/data/person/age">$1</range>' );
            const transform = transformer.transform( { xform: xform2 } ).then( parseHtmlForm );

            return transform
                .then( form => {
                    const target = findElementByName( form, 'input', '/data/person/age_changed' );
                    expect( target ).to.not.equal( null );
                    // The nested labels are removed
                    expect( form.getElementsByTagName( 'label' ).length ).to.equal( 5 );
                    expect( target.getAttribute( 'data-event' ) ).to.equal( 'xforms-value-changed' );
                    expect( target.getAttribute( 'data-setvalue' ) ).to.equal( '"Age changed!"' );
                    expect( target.getAttribute( 'data-type-xml' ) ).to.equal( 'string' );
                    // Check location as sibling of /data/person/age
                    const sibling = target.parentNode.getElementsByTagName( 'input' )[ 0 ];
                    expect( sibling.getAttribute( 'name' ) ).to.equal( '/data/person/age' );
                } );
        } );

        it( 'with xforms-value-changed included inside a select1 form control with an itemset', () => {
            const xform2 = fs.readFileSync( './test/forms/itemset.xml', 'utf8' );
            const transform = transformer.transform( { xform: xform2 } ).then( parseHtmlForm );

            return transform
                .then( form => {
                    const target = findElementByName( form, 'input', '/data/state_changed' );
                    expect( target ).to.not.equal( null );
                    // The nested labels are removed
                    expect( target.getAttribute( 'data-event' ) ).to.equal( 'xforms-value-changed' );
                    expect( target.getAttribute( 'data-setvalue' ) ).to.equal( '3+3' );
                    expect( target.getAttribute( 'data-type-xml' ) ).to.equal( 'string' );
                    // check location of target inside same label as input[name="/data/state"]
                    const parent = target.parentNode;
                    expect( parent.nodeName ).to.equal( 'fieldset' );
                    expect( parent.getElementsByTagName( 'input' )[ 0 ].getAttribute( 'name' ) ).to.equal( '/data/state' );
                } );
        } );

        it( 'with multiple xforms-value-changed inside a single text input', () => {
            const xform2 = fs.readFileSync( './test/forms/setvalue-value-changed-multiple.xml', 'utf8' );
            const transform = transformer.transform( { xform: xform2 } ).then( parseHtmlForm );

            return transform
                .then( form => {
                    const target = findElementByName( form, 'input', '/data/a' );
                    expect( target ).to.not.equal( null );
                    expect( target.hasAttribute( 'data-event' ) ).to.equal( false );
                    expect( target.hasAttribute( 'data-setvalue' ) ).to.equal( false );
                    expect( target.getAttribute( 'data-type-xml' ) ).to.equal( 'string' );
                    // check for 4 setvalue siblings
                    const parent = target.parentNode;
                    const sibs = Array.prototype.slice.call( parent.getElementsByTagName( 'input' ) ).slice( 1 );
                    // data/b
                    expect( sibs[ 0 ].getAttribute( 'name' ) ).to.equal( '/data/b' );
                    expect( sibs[ 0 ].getAttribute( 'data-setvalue' ) ).to.equal( '1 + 1' );
                    expect( sibs[ 0 ].getAttribute( 'data-event' ) ).to.equal( 'xforms-value-changed' );
                    expect( sibs[ 0 ].getAttribute( 'type' ) ).to.equal( 'hidden' );
                    // data/c
                    expect( sibs[ 1 ].getAttribute( 'name' ) ).to.equal( '/data/c' );
                    expect( sibs[ 1 ].getAttribute( 'data-setvalue' ) ).to.equal( 'now()' );
                    expect( sibs[ 1 ].getAttribute( 'data-event' ) ).to.equal( 'xforms-value-changed' );
                    expect( sibs[ 1 ].getAttribute( 'type' ) ).to.equal( 'hidden' );
                    // data/d
                    expect( sibs[ 2 ].getAttribute( 'name' ) ).to.equal( '/data/d' );
                    expect( sibs[ 2 ].hasAttribute( 'data-setvalue' ) ).to.equal( true );
                    expect( sibs[ 2 ].getAttribute( 'data-setvalue' ) ).to.equal( '' );
                    expect( sibs[ 2 ].getAttribute( 'data-event' ) ).to.equal( 'xforms-value-changed' );
                    expect( sibs[ 2 ].getAttribute( 'type' ) ).to.equal( 'hidden' );
                    // data/e
                    expect( sibs[ 3 ].getAttribute( 'name' ) ).to.equal( '/data/e' );
                    expect( sibs[ 3 ].hasAttribute( 'data-setvalue' ) ).to.equal( true );
                    expect( sibs[ 3 ].getAttribute( 'data-setvalue' ) ).to.equal( '' );
                    expect( sibs[ 3 ].getAttribute( 'data-event' ) ).to.equal( 'xforms-value-changed' );
                    expect( sibs[ 3 ].getAttribute( 'type' ) ).to.equal( 'hidden' );

                    // other form controls
                    const questions = Array.prototype.slice.call( form.getElementsByTagName( 'label' ) )
                        .filter( question => question.getAttribute( 'class' ).includes( 'question' ) );
                    expect( questions.length ).to.equal( 3 );

                    const c = questions[ 1 ].getElementsByTagName( 'input' );
                    expect( c.length ).to.equal( 1 );
                    expect( c[ 0 ].getAttribute( 'name' ) ).to.equal( '/data/c' );
                    expect( c[ 0 ].hasAttribute( 'data-event' ) ).to.equal( false );
                    expect( c[ 0 ].hasAttribute( 'data-setvalue' ) ).to.equal( false );

                    const d = questions[ 2 ].getElementsByTagName( 'input' );
                    expect( d.length ).to.equal( 1 );
                    expect( d[ 0 ].getAttribute( 'name' ) ).to.equal( '/data/d' );
                    expect( d[ 0 ].hasAttribute( 'data-event' ) ).to.equal( false );
                    expect( d[ 0 ].hasAttribute( 'data-setvalue' ) ).to.equal( false );
                } );
        } );

        describe( 'adds missing relevant nodes', () => {
            const xform = fs.readFileSync( './test/forms/missing-relevants.xml', 'utf8' );
            const result = transformer.transform( {
                xform
            } ).then( form => {
                return parser.parseFromString( form.model, 'text/xml' );
            } );

            return result.then( form => {
                expect( form.getElementsByTagName( 'school_roomtype' ).length ).to.equal( 7 );
            } );
        } );
    } );

} );

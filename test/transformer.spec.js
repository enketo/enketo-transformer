/* global describe, require, it*/
'use strict';

var Promise = require( 'lie' );
var chai = require( 'chai' );
var chaiAsPromised = require( 'chai-as-promised' );
var expect = chai.expect;
var fs = require( 'fs' );
var DOMParser = require( 'xmldom' ).DOMParser;
var parser = new DOMParser();
var transformer = require( '../src/transformer' );

chai.use( chaiAsPromised );

describe( 'transformer', function() {

    describe( 'transforms valid XForms', function() {
        var xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
        var result = transformer.transform( {
            xform: xform
        } );

        it( 'without an error', function() {
            return Promise.all( [
                expect( result ).to.eventually.to.be.an( 'object' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.not.be.empty,
                expect( result ).to.eventually.have.property( 'model' ).and.to.not.be.empty,
                expect( result ).to.eventually.have.property( 'transformerVersion' ).and.to.not.be.empty,
            ] );
        } );

        it( 'does not include the xform in the response', function() {
            return expect( result ).to.eventually.not.have.property( 'xform' );
        } );

    } );

    describe( 'transforms invalid XForms', function() {
        var invalid_xforms = [ undefined, null, '', '<data>' ];

        invalid_xforms.forEach( function( xform ) {
            it( 'with a parse error', function() {
                var result = transformer.transform( {
                    xform: xform
                } );
                return expect( result ).to.eventually.be.rejectedWith( Error );
            } );
        } );
    } );

    describe( 'manipulates themes and', function() {
        var xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );

        it( 'adds a provided theme if none is defined in the XForm', function() {
            var result = transformer.transform( {
                xform: xform,
                theme: 'mytheme'
            } );
            return expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'theme-mytheme' );
        } );

        it( 'leaves the XForm-defined theme unchanged if the theme value provided is falsy', function() {
            var newXform = xform.replace( '<h:body>', '<h:body class="theme-one">' ),
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

        it( 'replaces a theme defined in the XForm with a provided one', function() {
            var newXform = xform.replace( '<h:body>', '<h:body class="theme-one">' ),
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

    describe( 'manipulates languages and', function() {
        it( 'provides a languageMap as output property', function() {
            var xform = fs.readFileSync( './test/forms/advanced-required.xml', 'utf8' );
            var result = transformer.transform( {
                xform: xform
            } );

            return expect( result ).to.eventually.have.property( 'languageMap' ).and.to.deep.equal( {
                'dutch': 'nl',
                'english': 'en'
            } );
        } );

        it( 'provides an empty languageMap as output property if nothing was changed', function() {
            var xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            var result = transformer.transform( {
                xform: xform
            } );

            return expect( result ).to.eventually.have.property( 'languageMap' ).and.to.deep.equal( {} );
        } );
    } );

    describe( 'renders markdown', function() {
        it( 'takes into account that libxmljs Element.text() converts html entities', function() {
            var xform = fs.readFileSync( './test/forms/external.xml', 'utf8' );
            var result = transformer.transform( {
                xform: xform
            } );

            return Promise.all( [
                expect( result ).to.eventually.have.property( 'form' )
                .and.to.not.contain( '&lt;span style="color:pink;"&gt;Intro&lt;/span&gt;' ),
                expect( result ).to.eventually.have.property( 'form' )
                .and.to.contain( '<span style="color:pink;">Intro</span>' )
            ] );
        } );

        it( 'and picks up formatting of <output>s', function() {
            var xform = fs.readFileSync( './test/forms/formatted-output.xml', 'utf8' );
            var result = transformer.transform( {
                xform: xform
            } );

            return expect( result ).to.eventually.have.property( 'form' )
                .and.to.contain( 'formatted: <em><span class="or-output" data-value="/output/txt"> </span></em> and' );
        } );
    } );

    describe( 'does not render markdown', function() {
        it( 'when `markdown: false` is provided as option', function() {
            var xform = fs.readFileSync( './test/forms/formatted-output.xml', 'utf8' );
            var result = transformer.transform( {
                xform: xform,
                markdown: false
            } );

            return expect( result ).to.eventually.have.property( 'form' )
                .and.to.contain( 'formatted: *<span class="or-output" data-value="/output/txt"> </span>* and _normal_ text' );
        } );
    } );

    describe( 'manipulates media sources', function() {

        it( 'in the View by replacing media elements according to a provided map', function() {
            var xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            var media = {
                'happy.jpg': '/i/am/happy.jpg',
                'pigeon.png': '/a/b/pigeon.png'
            };
            var result1 = transformer.transform( {
                xform: xform
            } );
            var result2 = transformer.transform( {
                xform: xform,
                media: media
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

        it( 'in the View by replacing big-image link hrefs according to a provided map', function() {
            var img = '<value form="image">jr://images/happy.jpg</value>';
            var xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' )
                .replace( img, img + '\n<value form="big-image">jr://images/very-happy.jpg</value>' );
            var media = {
                'happy.jpg': '/i/am/happy.jpg',
                'very-happy.jpg': '/i/am/very-happy.jpg',
            };
            var result = transformer.transform( {
                xform: xform,
                media: media
            } );

            return Promise.all( [
                expect( result ).to.eventually.have.property( 'form' ).and.not.to.contain( 'jr://images/happy.jpg' ),
                expect( result ).to.eventually.have.property( 'form' ).and.not.to.contain( 'jr://images/very-happy.jpg' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( '/i/am/happy.jpg' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( '/i/am/very-happy.jpg' ),
            ] );
        } );

        it( 'in the Model by replacing them according to a provided map', function() {
            var xform = fs.readFileSync( './test/forms/external.xml', 'utf8' );
            var media = {
                'neighborhoods.csv': '/path/to/neighborhoods.csv',
                'cities.xml': '/path/to/cities.xml'
            };
            var result1 = transformer.transform( {
                xform: xform
            } );
            var result2 = transformer.transform( {
                xform: xform,
                media: media
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

        it( 'by adding a form logo <img> if needed', function() {
            var xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            var media = {
                'form_logo.png': '/i/am/logo.png'
            };
            var result1 = transformer.transform( {
                xform: xform
            } );
            var result2 = transformer.transform( {
                xform: xform,
                media: media
            } );

            return Promise.all( [
                expect( result1 ).to.eventually.have.property( 'form' ).and.to.not.contain( '<img src="/i/am/logo.png"' ),
                expect( result2 ).to.eventually.have.property( 'form' ).and.to.contain( '<img src="/i/am/logo.png"' )
            ] );
        } );

    } );

    describe( 'processes questions with constraints', function() {
        it( 'and adds the correct number of constraint-msg elements', function() {
            var count = function( result ) {
                var matches = result.form.match( /class="or-constraint-msg/g );
                return matches ? matches.length : 0;
            };
            var xform1 = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            var count1 = transformer.transform( {
                xform: xform1
            } ).then( count );
            var xform2 = fs.readFileSync( './test/forms/advanced-required.xml', 'utf8' );
            var count2 = transformer.transform( {
                xform: xform2
            } ).then( count );

            return Promise.all( [
                expect( count1 ).to.eventually.equal( 4 ),
                expect( count2 ).to.eventually.equal( 0 )
            ] );
        } );

    } );

    describe( 'processes required questions', function() {

        it( 'and adds the data-required HTML attribute for required XForm attributes keeping the value unchanged', function() {
            var xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            var result = transformer.transform( {
                xform: xform
            } );

            return Promise.all( [
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'data-required="true()"' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.not.contain( ' required="required"' )
            ] );
        } );

        it( 'and does not add the data-required attribute if the value is false()', function() {
            var xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' ).replace( 'required="true()"', 'required="false()"' );
            var result = transformer.transform( {
                xform: xform
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.not.contain( 'data-required' );
        } );

        it( 'and adds the correct number of required-msg elements', function() {
            var count = function( result ) {
                return result.form.match( /class="or-required-msg/g ).length;
            };
            var xform1 = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            var count1 = transformer.transform( {
                xform: xform1
            } ).then( count );
            var xform2 = fs.readFileSync( './test/forms/advanced-required.xml', 'utf8' );
            var count2 = transformer.transform( {
                xform: xform2
            } ).then( count );

            return Promise.all( [
                expect( count1 ).to.eventually.equal( 1 ),
                expect( count2 ).to.eventually.equal( 2 )
            ] );
        } );

        it( 'and adds a default requiredMsg if no custom is provided', function() {
            var xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            var result = transformer.transform( {
                xform: xform
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'data-i18n="constraint.required"' );
        } );

        it( 'and adds a custom requiredMsg if provided', function() {
            var xform = fs.readFileSync( './test/forms/advanced-required.xml', 'utf8' ).replace( 'required="true()"', 'required="false()"' );
            var result = transformer.transform( {
                xform: xform
            } );

            return Promise.all( [
                expect( result ).to.eventually.have.property( 'form' ).and.to.not.contain( 'data-i18n' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'custom verplicht bericht' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'custom required message' )
            ] );
        } );

    } );


    describe( 'processes multiline questions', function() {

        it( 'and outputs a textarea for appearance="multiline" on text input', function() {
            var xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' );
            var result = transformer.transform( {
                xform: xform
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.contain( '<textarea' );
        } );

        it( 'and outputs a textarea for appearance="multi-line" on text input', function() {
            var xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' ).replace( 'appearance="multiline"', 'appearance="multi-line"' );
            var result = transformer.transform( {
                xform: xform
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.contain( '<textarea' );
        } );

        it( 'and outputs a textarea for appearance="textarea" on text input', function() {
            var xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' ).replace( 'appearance="multiline"', 'appearance="textarea"' );
            var result = transformer.transform( {
                xform: xform
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.contain( '<textarea' );
        } );

        it( 'and outputs a textarea for appearance="text-area" on text input', function() {
            var xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' ).replace( 'appearance="multiline"', 'appearance="text-area"' );
            var result = transformer.transform( {
                xform: xform
            } );

            return expect( result ).to.eventually.have.property( 'form' ).and.to.contain( '<textarea' );
        } );

        it( 'and outputs a textarea for rows="x" attribute on text input, with a rows appearance', function() {
            var xform = fs.readFileSync( './test/forms/widgets.xml', 'utf8' ).replace( 'appearance="multiline"', 'rows="5"' );
            var result = transformer.transform( {
                xform: xform
            } );

            return Promise.all( [
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( '<textarea' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'or-appearance-rows-5' )
            ] );
        } );

    } );

    describe( 'processes autocomplete questions by producing <datalist> elements', function() {

        it( 'and outputs <datalist> elements', function() {
            var xform = fs.readFileSync( './test/forms/autocomplete.xml' );
            var result = transformer.transform( {
                xform: xform
            } );
            return result.then( function( res ) {
                var doc = parser.parseFromString( res.form, 'text/xml' );
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

    describe( 'processes a model with namespaces', function() {
        var xform = fs.readFileSync( './test/forms/model-namespace.xml' );
        var result = transformer.transform( {
            xform: xform
        } );

        it( 'leaves namespace prefixes and declarations intact on nodes', function() {
            return Promise.all( [
                expect( result ).to.eventually.have.property( 'model' ).and.to.contain( '<orx:instanceID' ),
                expect( result ).to.eventually.have.property( 'model' ).and.to.contain( 'xmlns:orx="http://openrosa.org/xforms"' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'name="/data/orx:meta/orx:instanceID' ),
            ] );
        } );

        it( 'leaves namespace prefixes and declarations intact on node attributes', function() {
            return Promise.all( [
                expect( result ).to.eventually.have.property( 'model' ).and.to.contain( '<a orx:comment="/data/a_comment"/>' ),
            ] );
        } );
    } );

    describe( 'supports the enk:for attribute', function() {
        var xform = fs.readFileSync( './test/forms/for.xml' );
        var result = transformer.transform( {
            xform: xform
        } );

        it( 'by turning it into the data-for attribute', function() {
            return Promise.all( [
                expect( result ).to.eventually.have.property( 'form' ).and.to.contain( 'data-for="../a"' ),
            ] );
        } );
    } );

    describe( 'for backwards compatibility of forms without a /meta/instanceID node', function() {
        var xform1 = fs.readFileSync( './test/forms/no-instance-id.xml' );
        var result1 = transformer.transform( {
            xform: xform1
        } );

        it( 'adds a /meta/instanceID node', function() {
            return expect( result1 ).to.eventually.have.property( 'model' ).and.to.contain( '<meta><instanceID/></meta>' );
        } );

        var xform2 = fs.readFileSync( './test/forms/model-namespace.xml' );
        var result2 = transformer.transform( {
            xform: xform2
        } );

        it( 'does not add it if it contains /meta/instanceID in the OpenRosa namespace', function() {
            return expect( result2 ).to.eventually.have.property( 'model' ).and.to.not.contain( '<instanceID/>' );
        } );
    } );

} );

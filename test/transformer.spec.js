/* global describe, require, it*/
"use strict";

var Q = require( 'q' ),
    chai = require( "chai" ),
    chaiAsPromised = require( "chai-as-promised" ),
    expect = chai.expect,
    fs = require( "fs" ),
    transformer = require( "../src/transformer" );

chai.use( chaiAsPromised );

describe( 'transformer', function() {

    describe( 'transforms valid XForms', function() {
        var xform = fs.readFileSync( './test/forms/widgets.xml' );
        var result = transformer.transform( {
            xform: xform
        } );

        it( 'without an error', function() {
            return Q.all( [
                expect( result ).to.eventually.to.be.an( 'object' ),
                expect( result ).to.eventually.have.property( 'form' ).and.to.not.be.empty,
                expect( result ).to.eventually.have.property( 'model' ).and.to.not.be.empty
            ] );
        } );

        it( 'does not include the xform in the response', function() {
            return expect( result ).to.eventually.not.have.property( 'xform' );
        } )

    } );

    describe( 'transforms invalid XForms', function() {
        var invalid_xforms = [ undefined, null, '', '<data>' ];

        invalid_xforms.forEach( function( xform ) {
            it( 'with a parse error', function() {
                var result = transformer.transform( {
                    xform: xform
                } );
                return expect( result ).to.eventually.be.rejectedWith( Error, /parse/ );
            } );
        } );
    } );
} );

/* eslint-env mocha */
const chai = require( 'chai' );
const expect = chai.expect;
const sheets = require( '../src/transformer' ).sheets;

describe( 'sheets', () => {

    it( 'should return an xslForm sheet', () => {
        expect( typeof sheets.xslForm ).to.equal( 'string' );
        expect( sheets.xslForm.length > 0 ).to.equal( true );
    } );

    it( 'should return an xslModel sheet', () => {
        expect( typeof sheets.xslModel ).to.equal( 'string' );
        expect( sheets.xslModel.length > 0 ).to.equal( true );
    } );

} );

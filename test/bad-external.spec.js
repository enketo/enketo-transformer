/* global describe, require, it*/
'use strict';

var Promise = require( 'lie' );
var chai = require( 'chai' );
var chaiAsPromised = require( 'chai-as-promised' );
var expect = chai.expect;
var fs = require( 'fs' );
var DOMParser = require( 'xmldom' ).DOMParser;
var transformer = require( '../src/transformer' );

chai.use( chaiAsPromised );

describe( 'for incompatible forms that require preprocessing', function() {
    var xform = fs.readFileSync( './test/forms/bad-external.xml' );
    var parser = new DOMParser();
    var preprocess = function( doc ) {
        var libxmljs = this;
        var NAMESPACES = transformer.NAMESPACES;
        var model = doc.get( '/h:html/h:head/xmlns:model', NAMESPACES );

        if ( !model ) {
            return doc;
        }

        doc.find( '/h:html/h:body//xmlns:input[@query]', NAMESPACES ).forEach( function( input ) {
            var query;
            var ref;
            var match;
            var id;
            var bind;
            var children;
            var attrs;
            var select1;
            var itemset;
            var q = input.attr( 'query' );
            var r = input.attr( 'ref' );

            if ( !q || !r ) {
                return;
            }

            query = q.value();
            ref = r.value();

            /**
             * Preprocess Model
             * - add instances
             */
            match = query.match( /^instance\('([^\)]+)'\)/ );
            id = match && match.length ? match[ 1 ] : null;

            if ( id && !model.get( '//xmlns:instance[@id="' + id + '"]', NAMESPACES ) ) {
                model
                    .node( 'instance' )
                    .namespace( NAMESPACES.xmlns )
                    .attr( {
                        id: id,
                        src: 'esri://file-csv/list_name/' + id + '/itemsets.csv'
                    } );
            }

            /**
             * Preprocess Bind
             * - correct type
             */
            bind = doc.get( '/h:html/h:head/xmlns:model/xmlns:bind[@nodeset="' + ref + '"]', NAMESPACES );
            if ( bind ) {
                bind.attr( {
                    type: 'select1'
                } );
            }

            /**
             * Preprocess Body
             * - convert <input> to <select1> + <itemset>
             */
            children = input.childNodes();
            attrs = input.attrs();
            select1 = new libxmljs.Element( doc, 'select1' ).namespace( NAMESPACES.xmlns );

            // add all attributes including unknowns, except the query attribute
            attrs.forEach( function( attr ) {
                var obj = {};
                obj[ attr.name() ] = attr.value();
                if ( attr.name() !== 'query' ) {
                    select1.attr( obj );
                }
            } );

            // add all existing children
            children.forEach( function( child ) {
                select1.addChild( child );
            } );

            // add the itemset with fixed label and value references
            itemset = select1
                .node( 'itemset' )
                .namespace( NAMESPACES.xmlns )
                .attr( {
                    nodeset: query
                } );
            itemset
                .node( 'value' )
                .namespace( NAMESPACES.xmlns )
                .attr( {
                    ref: "name"
                } );
            itemset
                .node( 'label' )
                .namespace( NAMESPACES.xmlns )
                .attr( {
                    ref: "translate(label)"
                } );

            input.replace( select1 );
        } );
        //console.log( doc.toString( true ) );
        return doc;
    };

    it( 'preprocess fn does nothing if not provided...', function() {
        var result = transformer.transform( {
            xform: xform
        } );
        return result.then( function( res ) {
            var doc = parser.parseFromString( res.model, 'text/xml' );
            return Promise.all( [
                expect( doc ).to.be.an( 'object' ),
                expect( doc.getElementsByTagName( 'instance' ) ).to.have.length( 2 ),
                expect( doc.getElementById( 'existing' ) ).to.not.be.null,
                expect( doc.getElementById( 'existing' ).getAttribute( 'src' ) ).to.equal( 'jr://file/existing.xml' ),
                expect( doc.getElementById( 'counties' ) ).to.be.null,
                expect( doc.getElementById( 'cities' ) ).to.be.null
            ] );
        } );
    } );

    it( 'preprocess fn corrects instances if necessary', function() {
        var result = transformer.transform( {
            xform: xform,
            preprocess: preprocess
        } );
        return result.then( function( res ) {
            var doc = parser.parseFromString( res.model, 'text/xml' );
            return Promise.all( [
                expect( doc ).to.be.an( 'object' ),
                expect( doc.getElementsByTagName( 'instance' ) ).to.have.length( 4 ),
                expect( doc.getElementById( 'existing' ) ).to.not.be.null,
                expect( doc.getElementById( 'existing' ).getAttribute( 'src' ) ).to.equal( 'jr://file/existing.xml' ),
                expect( doc.getElementById( 'counties' ) ).to.not.be.null,
                expect( doc.getElementById( 'counties' ).getAttribute( 'src' ) ).to.equal( 'esri://file-csv/list_name/counties/itemsets.csv' ),
                expect( doc.getElementById( 'cities' ) ).to.not.be.null,
                expect( doc.getElementById( 'cities' ).getAttribute( 'src' ) ).to.equal( 'esri://file-csv/list_name/cities/itemsets.csv' ),
            ] );
        } );
    } );

    it( 'fn corrects body elements if necessary', function() {
        var result = transformer.transform( {
            xform: xform,
            preprocess: preprocess
        } );
        return result.then( function( res ) {
            var doc = parser.parseFromString( res.form, 'text/xml' );
            var selects = doc.getElementsByTagName( 'select' );
            var inputs = doc.getElementsByTagName( 'input' );
            return Promise.all( [
                expect( selects ).to.have.length( 2 ), // language selector and the one with appearance=minimal
                expect( selects[ 1 ].getAttribute( 'name' ) ).to.equal( '/select_one_external/city2' ),
                expect( selects[ 1 ].getAttribute( 'data-type-xml' ) ).to.equal( 'select1' ),
                expect( selects[ 1 ].getElementsByTagName( 'option' )[ 0 ].getAttribute( 'class' ) ).to.equal( 'itemset-template' ),
                expect( selects[ 1 ].getElementsByTagName( 'option' )[ 0 ].getAttribute( 'data-items-path' ) ).to.equal( "instance('cities')/root/item[state= /select_one_external/state  and county= /select_one_external/county ]" ),
                expect( selects[ 1 ].nextSibling.nextSibling.getAttribute( 'class' ) ).to.equal( 'itemset-labels' ),
                expect( selects[ 1 ].nextSibling.nextSibling.getAttribute( 'data-label-ref' ) ).to.equal( 'translate(label)' ),
                expect( selects[ 1 ].nextSibling.nextSibling.getAttribute( 'data-value-ref' ) ).to.equal( 'name' ),
            ] );
        } );
    } );

    it( 'fn does not correct instances if not necessary', function() {
        var result = transformer.transform( {
            xform: fs.readFileSync( './test/forms/widgets.xml' ),
            preprocess: preprocess
        } );
        return result.then( function( res ) {
            var doc = parser.parseFromString( res.model, 'text/xml' );
            return Promise.all( [
                expect( doc ).to.be.an( 'object' ),
                expect( doc.getElementById( 'counties' ) ).to.be.null
            ] );
        } );
    } );

} );

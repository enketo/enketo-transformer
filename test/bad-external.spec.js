const chai = require( 'chai' );
const chaiAsPromised = require( 'chai-as-promised' );
const expect = chai.expect;
const fs = require( 'fs' );
const DOMParser = require( '@xmldom/xmldom' ).DOMParser;
const transformer = require( '../src/transformer' );

chai.use( chaiAsPromised );

describe( 'for incompatible forms that require preprocessing', () => {
    const xform = fs.readFileSync( './test/forms/bad-external.xml' );
    const parser = new DOMParser();
    const preprocess = function( doc ) {
        const libxmljs = this;
        const NAMESPACES = transformer.NAMESPACES;
        const model = doc.get( '/h:html/h:head/xmlns:model', NAMESPACES );

        if ( !model ) {
            return doc;
        }

        doc.find( '/h:html/h:body//xmlns:input[@query]', NAMESPACES ).forEach( input => {
            const q = input.attr( 'query' );
            const r = input.attr( 'ref' );

            if ( !q || !r ) {
                return;
            }

            const query = q.value();
            const ref = r.value();

            /**
             * Preprocess Model
             * - add instances
             */
            const match = query.match( /^instance\('([^)]+)'\)/ );
            const id = match && match.length ? match[ 1 ] : null;

            if ( id && !model.get( `//xmlns:instance[@id="${id}"]`, NAMESPACES ) ) {
                model
                    .node( 'instance' )
                    .namespace( NAMESPACES.xmlns )
                    .attr( {
                        id,
                        src: `esri://file-csv/list_name/${id}/itemsets.csv`
                    } );
            }

            /**
             * Preprocess Bind
             * - correct type
             */
            const bind = doc.get( `/h:html/h:head/xmlns:model/xmlns:bind[@nodeset="${ref}"]`, NAMESPACES );
            if ( bind ) {
                bind.attr( {
                    type: 'select1'
                } );
            }

            /**
             * Preprocess Body
             * - convert <input> to <select1> + <itemset>
             */
            const children = input.childNodes();
            const attrs = input.attrs();
            const select1 = new libxmljs.Element( doc, 'select1' ).namespace( NAMESPACES.xmlns );

            // add all attributes including unknowns, except the query attribute
            attrs.forEach( attr => {
                const obj = {};
                obj[ attr.name() ] = attr.value();
                if ( attr.name() !== 'query' ) {
                    select1.attr( obj );
                }
            } );

            // add all existing children
            children.forEach( child => {
                select1.addChild( child );
            } );

            // add the itemset with fixed label and value references
            const itemset = select1
                .node( 'itemset' )
                .namespace( NAMESPACES.xmlns )
                .attr( {
                    nodeset: query
                } );
            itemset
                .node( 'value' )
                .namespace( NAMESPACES.xmlns )
                .attr( {
                    ref: 'name'
                } );
            itemset
                .node( 'label' )
                .namespace( NAMESPACES.xmlns )
                .attr( {
                    ref: 'translate(label)'
                } );

            input.replace( select1 );
        } );

        //console.log( doc.toString( true ) );
        return doc;
    };

    it( 'preprocess fn does nothing if not provided...', () => {
        const result = transformer.transform( {
            xform
        } );

        return result.then( res => {
            const doc = parser.parseFromString( res.model, 'text/xml' );

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

    it( 'preprocess fn corrects instances if necessary', () => {
        const result = transformer.transform( {
            xform,
            preprocess
        } );

        return result.then( res => {
            const doc = parser.parseFromString( res.model, 'text/xml' );

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

    it( 'fn corrects body elements if necessary', () => {
        const result = transformer.transform( {
            xform,
            preprocess
        } );

        return result.then( res => {
            const doc = parser.parseFromString( res.form, 'text/xml' );
            const selects = doc.getElementsByTagName( 'select' );

            return Promise.all( [
                expect( selects ).to.have.length( 2 ), // language selector and the one with appearance=minimal
                expect( selects[ 1 ].getAttribute( 'name' ) ).to.equal( '/select_one_external/city2' ),
                expect( selects[ 1 ].getAttribute( 'data-type-xml' ) ).to.equal( 'select1' ),
                expect( selects[ 1 ].getElementsByTagName( 'option' )[ 0 ].getAttribute( 'class' ) ).to.equal( 'itemset-template' ),
                expect( selects[ 1 ].getElementsByTagName( 'option' )[ 0 ].getAttribute( 'data-items-path' ) ).to.equal( 'instance(\'cities\')/root/item[state= /select_one_external/state  and county= /select_one_external/county ]' ),
                expect( selects[ 1 ].nextSibling.nextSibling.getAttribute( 'class' ) ).to.equal( 'itemset-labels' ),
                expect( selects[ 1 ].nextSibling.nextSibling.getAttribute( 'data-label-ref' ) ).to.equal( 'translate(label)' ),
                expect( selects[ 1 ].nextSibling.nextSibling.getAttribute( 'data-value-ref' ) ).to.equal( 'name' ),
            ] );
        } );
    } );

    it( 'fn does not correct instances if not necessary', () => {
        const result = transformer.transform( {
            xform: fs.readFileSync( './test/forms/widgets.xml' ),
            preprocess
        } );

        return result.then( res => {
            const doc = parser.parseFromString( res.model, 'text/xml' );

            return Promise.all( [
                expect( doc ).to.be.an( 'object' ),
                expect( doc.getElementById( 'counties' ) ).to.be.null
            ] );
        } );
    } );

} );

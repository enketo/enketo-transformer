/* global describe, it*/
"use strict";

var chai = require( "chai" );
var expect = chai.expect;
var language = require( "../src/language" );

describe( 'language', function() {

    describe( 'parser', function() {
        var test;

        test = function( t ) {
            var input = t[ 0 ];
            var expected = t[ 1 ];
            it( 'parses "' + input + '" correctly', function() {
                expect( language.parse( input ) ).to.deep.equal( expected );
            } );
        };

        [
            // non-recommended ways, some half-hearted attempt to determine at least dir correctly
            [ 'Arabic', {
                tag: 'ar',
                desc: 'Arabic',
                dir: 'rtl',
                src: 'Arabic'
            } ],
            [ 'arabic', {
                tag: 'ar',
                desc: 'arabic',
                dir: 'rtl',
                src: 'arabic'
            } ],
            [ 'العربية', {
                tag: 'العربية',
                desc: 'العربية',
                dir: 'rtl',
                src: 'العربية'
            } ],
            [ 'English', {
                tag: 'en',
                desc: 'English',
                dir: 'ltr',
                src: 'English'
            } ],
            [ 'fantasy_lang', {
                tag: 'fantasy_lang',
                desc: 'fantasy lang',
                dir: 'ltr',
                src: 'fantasy_lang'
            } ],
            // better way, which works well in Enketo (not in ODK Collect), 
            // description is automatically set to English description if tag is found
            [ 'ar', {
                tag: 'ar',
                desc: 'Arabic',
                dir: 'rtl',
                src: 'ar'
            } ],
            [ 'ar-IR', {
                tag: 'ar-IR',
                desc: 'ar-IR',
                dir: 'rtl',
                src: 'ar-IR'
            } ],
            [ 'nl', {
                tag: 'nl',
                desc: 'Dutch',
                dir: 'ltr',
                src: 'nl'
            } ],
            // the recommended way
            [ 'ar__ArabicDialect', {
                tag: 'ar',
                desc: 'ArabicDialect',
                dir: 'rtl',
                src: 'ar__ArabicDialect'
            } ],
            [ 'nl__Nederlands', {
                tag: 'nl',
                desc: 'Nederlands',
                dir: 'ltr',
                src: 'nl__Nederlands'
            } ],
            // recommended way, also converts underscores to spaces
            [ 'ar__Arabic_Dialect', {
                tag: 'ar',
                desc: 'Arabic Dialect',
                dir: 'rtl',
                src: 'ar__Arabic_Dialect'
            } ],
            // unmatchable tag
            [ '0a', {
                tag: '0a',
                desc: '0a',
                dir: 'ltr',
                src: '0a'
            } ],
            // unmatchable description
            [ 'nonexisting', {
                tag: 'nonexisting',
                desc: 'nonexisting',
                dir: 'ltr',
                src: 'nonexisting'
            } ],
            // unmatchable tag and unmatchable description
            [ '0a__nonexisting', {
                tag: '0a',
                desc: 'nonexisting',
                dir: 'ltr',
                src: '0a__nonexisting'
            } ],
        ].forEach( test );

    } );

} );

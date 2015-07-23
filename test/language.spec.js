/* global describe, it*/
"use strict";

var chai = require( "chai" );
var expect = chai.expect;
var language = require( "../src/language" );

describe( 'language', function() {

    describe( 'parser', function() {
        var test;

        test = function( t ) {
            var name = t[ 0 ];
            var sample = t[ 1 ];
            var expected = t[ 2 ];
            it( 'parses "' + name + '" with sample "' + sample + '" correctly', function() {
                expect( language.parse( name, sample ) ).to.deep.equal( expected );
            } );
        };

        [
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
            [ 'fantasy_lang', 'bl', {
                tag: 'fantasy_lang',
                desc: 'fantasy lang',
                dir: 'ltr',
                src: 'fantasy_lang'
            } ],
            [ 'fantasy_lang', 'ک', {
                tag: 'fantasy_lang',
                desc: 'fantasy lang',
                dir: 'rtl',
                src: 'fantasy_lang'
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
                desc: 'ar-IR',
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
            [ 'ar__ArabicDialect', 'رب', {
                tag: 'ar',
                desc: 'ArabicDialect',
                dir: 'rtl',
                src: 'ar__ArabicDialect'
            } ],
            [ 'nl__Nederlands', 'heej', {
                tag: 'nl',
                desc: 'Nederlands',
                dir: 'ltr',
                src: 'nl__Nederlands'
            } ],
            // recommended way, also converts underscores to spaces
            [ 'ar__Arabic_Dialect', 'رب', {
                tag: 'ar',
                desc: 'Arabic Dialect',
                dir: 'rtl',
                src: 'ar__Arabic_Dialect'
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
            [ '0a__nonexisting', 'd', {
                tag: '0a',
                desc: 'nonexisting',
                dir: 'ltr',
                src: '0a__nonexisting'
            } ],
        ].forEach( test );

    } );

} );

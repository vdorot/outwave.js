/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/


/**
 * Web based waveform viewer 
 * 
 * @module Outwave
 * @main  Outwave
 */

define(
    ['./data-file',
    './viewer',
    './segment-collection',
    './segment',
    './style',
    './utils',
    './controls',
    './time-span/time-span',
    './time-span/sparse-time-span',
    './time-span/continuous-time-span',
    './time-span/draggable',
    './time-span/time-span-collection',
    './time-span/sparse-time-span-collection',
    './time-span/continuous-time-span-collection'
    ], //TODO: add timespans if necessary
    function(DataFile, Viewer, SegmentCollection, Segment, Style, utils, Controls, TimeSpan, SparseTimeSpan, ContinuousTimeSpan, Draggable, TimeSpanCollection, SparseTimeSpanCollection, ContinuousTimeSpanCollection){





        /**
         * Provides Outwave.js API for monkey patching, quick fixes, etc.
         * 
         * @property {Object} api
         */
        var api = {
            DataFile: DataFile,
            Viewer: Viewer,
            SegmentCollection: SegmentCollection,
            Segment: Segment,
            Style: Style,
            utils: utils,
            Controls: Controls,
            timeSpans: {
                TimeSpan: TimeSpan,
                SparseTimeSpan: SparseTimeSpan,
                ContinuousTimeSpan: ContinuousTimeSpan,
                Draggable: Draggable,
                TimeSpanCollection: TimeSpanCollection,
                SparseTimeSpanCollection: SparseTimeSpanCollection,
                ContinuousTimeSpanCollection: ContinuousTimeSpanCollection 
            }
        };


        var defaultOptions = {
            height: null,
            segmentWidth: 500,
            hover: true,
            mono: false,
            minZoom: null,
            maxZoom: null,
            zoom: 50,
            hideScrollbar : false,
            autoScroll: true,
            autoScrollType: 'jumpy-animated', // smooth, jumpy or jumpy-animated
                                                // jumpy-animated can cause problems with high zoom values

            autoScrollTarget: 0.2, //[percentage of width] position to which the viewer scrolls the cursor to, only applies to jumpy autoscroll
            autoScrollThreshold: 0.9, //[percentage of width] positon at which scrolling starts, only applies to jumpy autoscroll
            autoScrollAnimationDuration: 400, // [ms]
            autoScrollTimeout: 800, // [milliseconds]
            autoScrollMouseLock: true, // disable autoscroll while mouse cursor is above waveform
            zoomChangeFactor: 2, // number by which the zoom value gets divided/multiplied when zooming in/out

            cacheOffset: false, //cache viewer position on page, the top or left corner(depending on orientation) of the viewer must not move, this makes mouse movmemnts much smoother in Firefox 
        
            init: null, // callback Function(done) to be used after the viewer has been initialized, before it is shown, possible use is to load, thi == viewer, done must be called after everything is ready
        };


        /**
         * Waveform viewer loader
         * Loads datafile and creates a waveform viewer instance. Adds control buttons if enabled in options.
         * If no errors occur onLoad is called with the viewer instance as an argument
         *
         * Use without new keyword
         * 
         * @class Outwave
         * @constructor
         * @param {String}   dataFileUrl URL of waveform file
         * @param {HTMLElement|jQuery element}   container   Container element
         * @param {Object}   options     Various options
         * @param {Function} onLoad        Function(Viewer viewer) - viewer has been successfully loaded
         */
        var Outwave = function(dataFileUrl,container,options,onLoad){

            container = $(container);

            options = $.extend({},defaultOptions,options);
            var style = new Style();

            if(options.style){
                options.style = $.extend({},style,options.style);  
            }else{
                options.style = style;
            }

            var wrapper = $('<div class="outwave"></div>');

            var envelope = wrapper;
            if(options.hideScrollbar){
                var hidingWrapper = $('<div class="scrollbar-hiding-wrapper"></div>').css({
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden'
                });
                hidingWrapper.append(wrapper);
                envelope = hidingWrapper;
            }
            container.append(envelope); //for measuring dimensions

            if(options.hideScrollbar){
                var barSize;
                if(options.style.horizontal()){
                    barSize = utils.getScrollbarDim().height;
                    wrapper.css('height',envelope.height() + barSize);
                }else{
                    barSize = utils.getScrollbarDim().width;
                    wrapper.css('width',envelope.width() + barSize);
                } 
            }



            container = wrapper;

            container.addClass(options.style.vertical()?"vertical":"horizontal");

            var showError = function(message){
                 container.empty().append(options.style.error(message));
            };


            container.empty().append(options.style.loading());

            var onProgress = function(progress){
                container.find(".loading").text(progress + '% ');
            };

            DataFile.loadUrl(dataFileUrl,function(success,errorMessage,dataFile){
                if(!success){
                    showError(errorMessage);
                    return;
                }
                // loading indicator should stay visible
                var viewer = new Viewer(container,dataFile,options);

                Controls(container,viewer,options.style);

                var loaded = function(){
                    //TODO: should display viewer
                    onLoad(viewer);
                };

                if(options.init){
                    options.init.call(viewer,loaded);
                }else{

                    loaded();
                }

            },onProgress);




        };

        Outwave.api = api;



        return Outwave;



    }
);
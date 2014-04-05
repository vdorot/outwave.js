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
            height: 400,
            segmentWidth: 500,
            hover: true,
            mono: false,
            autoScrollType: 'jumpy-animated', // smooth, jumpy or jumpy-animated
                                                // jumpy-animated can cause problems with high zoom values

            autoScrollTarget: 0.2, //[percentage of width] position to which the viewer scrolls the cursor to, only applies to jumpy autoscroll
            autoScrollThreshold: 0.9, //[percentage of width] positon at which scrolling starts, only applies to jumpy autoscroll
            autoScrollAnimationDuration: 400, // [ms]
            autoScrollTimeout: 800, // [milliseconds]
            zoomChangeFactor: 2, // number by which the zoom value gets divided/multiplied when zooming in/out
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

            options = $.extend({},defaultOptions,options);
            options.style = new Style();

            if(options.style){
                $.extend({},options.style,options.style);  
            }

            var wrapper = $('<div class="outwave"></div>');


            container.append(wrapper);
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
                var viewer = new Viewer(container,dataFile,options);

                Controls(container,viewer,options.style);

                onLoad(viewer);

            },onProgress);




        };

        Outwave.api = api;



        return Outwave;



    }
);
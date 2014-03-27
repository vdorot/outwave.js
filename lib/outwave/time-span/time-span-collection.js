/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/


define([
    './continuous-time-span',
    './sparse-time-span',
    './draggable',
    './time-span-error'
],function(ContinuousTimeSpan,SparseTimeSpan,Draggable,TimeSpanError){


    var defaultOptions = {minSpanLength: 0};

    /**
     * @module TimeSpan
     */

    /**
     * Manages time spans
     *
     * Abstract class - use subclasses
     *
     * @class TimeSpanCollection
     * @constructor
     * @param {Outwave} outwave Outwave object
     * @param {Array} options Options: {minSpanLength: Number}
     */
    var TimeSpanCollection = function(outwave,options){

        var self = this;

        this.outwave = outwave;

        this.options = $.extend({},defaultOptions,options);


        //TODO: check if outwave already has an assigned timespan collection

        this.zoom = 1;

        this.dataFile = outwave.getDataFile();

        var containers = outwave.getTimeSpanContainers();

        this.backgroundContainer = containers.back;

        this.foregroundContainer = containers.front;

        this.style = outwave.getStyle();

        this.timespans = [];

        this.draggableMixin = function(span){
            Draggable(span,self.outwave.getViewportElement(),self.style);
            span.setScrollingSpeed(4);
            return span;
        };

        this.spanMixin = null;


        this.setZoom(outwave.getZoomFactor());
        outwave.onZoomFactorChanged(function(zoom){
            self.setZoom(zoom);
        });
    };


    TimeSpanCollection.prototype = {
        /**
         * Return all time spans
         *
         * The array should not be manipulated with, only use for reading
         *
         * @method  getAll
         * @return {[type]} [description]
         */
        getAll: function(){
            return this.timespans;
        },
        /**
         * Factory for new time spans
         *
         * Abstract method
         *
         * @method  spanFactory
         * @return {TimeSpan} New time span
         */
        spanFactory: function(){
            var error = new Error("spanFactory is an abstract method, please use a subclass instead");
            error.name = "AbstractMethodException";
            throw error;
        },
        /**
         * Creates new span
         *
         * @method  createSpan
         * @return {TimeSpan} Created time span
         */
        createSpan: function(){
            var span = this.spanFactory();
            span.setMinLength(this.options.minSpanLength);
            this.applySpanMixins(span);
            return span;
        },
        /**
         * Apply mixins to created time spans
         *
         * @method  applySpanMixins
         * @param  {TimeSpan} span Time span
         */
        applySpanMixins: function(span){
            this.draggableMixin(span);
            if(this.spanMixin){
                this.spanMixin(span);
            }
        },
        /**
         * Merge mergingSpan with span before
         *
         * @method mergePrev
         * @param  {TimeSpan} mergingSpan Span to merge - at the right side
         */
        mergePrev: function(mergingSpan){ // merge mergingSpan and previous

            var spanI = null;
            for(var i=this.timespans.length-1; i>=0; i--){
                var span = this.timespans[i];
                if(span == mergingSpan){
                    spanI = i;
                    break;
                }
            }
            if(spanI ===null || merginSpan.getPrev()===null){
                return;
            }

            var prevSpan = mergingSpan.getPrev();

            this.timespans.splice(spanI-1,2); // remove spans

            //mergingSpan and createdSpan are now detached, so creating a new span in their place doesn't cause overlap errors

            var createdSpan = this.createSpan();

            if(prevSpan.getPrev()) prevSpan.getPrev().setNext(createdSpan);


            createdSpan.setStart(prevSpan.getStart());
            createdSpan.setEnd(mergingSpan.getEnd());
            //double linked list
            createdSpan.setPrev(prevSpan.getPrev());
            createdSpan.setNext(mergingSpan.getNext()); 
            if(mergingSpan.getNext()) mergingSpan.getNext().setPrev(createdSpan);


            this.timespans.splice(spanI-1,0,createdSpan); // insert timespan into ordered array  

            createdSpan.render();

            if(this.timeSpanCreatedFn) this.timeSpanCreatedFn(createdSpan);

            mergingSpan.handleMerged(prevSpan,createdSpan);  

            prevSpan.handleRemoved();
            mergingSpan.handleRemoved();

        },
        /**
         * Split spans at a given time position
         *
         * @method  split
         * @param  {Number} time Time in seconds
         */
        split: function(time){

            var spanI = null;
            for(var i=this.timespans.length-1; i>=0; i--){
                var span = this.timespans[i];
                if(span.getStart()<=time && span.getEnd()>=time){
                    spanI = i;
                }
            }

            if(spanI === null){
                return;
            }




            var splitSpan = this.timespans[spanI];


            if((time - splitSpan.getStart()() < this.options.minSpanLength || (splitSpan.getEnd() - time) < this.options.minSpanLength)){
                
                throw new TimeSpanError("split","Cannot split annotations here, a time span would be shorter than minimum length");       

            }



            this.timespans.splice(spanI,1); // detach span


            var prevSpan = this.createSpan();
            prevSpan.setStart(splitSpan.getStart());
            prevSpan.setEnd(time);
            prevSpan.setPrev(splitSpan.getPrev());
            if(splitSpan.getPrev()) splitSpan.getPrev().setNext(prevSpan);

            var nextSpan = this.createSpan();


            nextSpan.setStart(time);
            nextSpan.setEnd(splitSpan.getEnd());

            nextSpan.setPrev(prevSpan);
            prevSpan.setNext(nextSpan);
            nextSpan.setNext(splitSpan.getNext());
            if(splitSpan.getNext()) splitSpan.getNext().setPrev(nextSpan);


            this.timespans.splice(spanI,0,prevSpan,nextSpan); // insert
            prevSpan.setZoom(this.zoom);
            prevSpan.render();

            nextSpan.setZoom(this.zoom);
            nextSpan.render();

            if(this.timeSpanCreatedFn){
                this.timeSpanCreatedFn(prevSpan);
                this.timeSpanCreatedFn(nextSpan);
            }

            splitSpan.handleSplit(prevSpan,nextSpan);
            splitSpan.handleRemoved();

        },
        /**
         * Remove time span
         *
         * Abstract method
         *
         * @method removeTimeSpan
         * @param  {TimeSpan} timespan Time span to be removed
         */
        removeTimeSpan: function(timespan){
            var error = new Error("removeTimeSpan is an abstract method, please use a subclass instead");
            error.name = "AbstractMethodException";
            throw error;            
        },
        /**
         * Update zoom
         *
         * @method  setZoom
         * @param {NUmber} zoom Zoom factor
         */
        setZoom: function(zoom){
            this.zoom = zoom;
            var i;
            for(i in this.timespans){
                this.timespans[i].setZoom(this.zoom);
            }
        },
        /**
         * Set event handler for new spans created
         *
         * @method onTimeSpanCreated
         * @param  {Function} fn Function(TimeSpan timespan)
         */
        onTimeSpanCreated: function(fn){
            this.timeSpanCreatedFn = fn;
        }


    };

    return TimeSpanCollection;
});
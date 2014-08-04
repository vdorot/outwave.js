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
     * @param {Viewer} viewer Viewer object
     * @param {Array} options Options: {minSpanLength: Number}
     */
    var TimeSpanCollection = function(viewer,options){

        var self = this;

        this.viewer = viewer;

        this.options = $.extend({},defaultOptions,options);


        //TODO: check if outwave already has an assigned timespan collection

        this.zoom = 1;

        this.dataFile = viewer.getDataFile();

        var containers = viewer.getTimeSpanContainers();


        this.backgroundContainer = $('<div class="optimising-connector"></div>');

        containers.back.append(this.backgroundContainer);

        this.backgroundConnector = containers.back;

        this.foregroundContainer = containers.front;


        this.foregroundContainer = $('<div class="optimising-connector"></div>');

        containers.front.append(this.foregroundContainer);

        this.foregroundConnector = containers.front;

        this.style = viewer.getStyle();

        this.timespans = [];

        this.draggableMixin = function(span){
            Draggable(span,self.viewer,self.style);
            span.setScrollingSpeed(4);
            return span;
        };

        this.spanMixin = null;


        this.setZoom(viewer.getZoomFactor());
        viewer.onZoomFactorChanged(function(zoom){
            self.setZoom(zoom);
        });

        this.activeTimeSpan = null;

        this.BeforeBatchPositionChangeHnd = [];

        this.BatchPositionChangedHnd = [];
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
         * Remove all time spans
         * @method clear
         */
        clear: function(){
            for(var i = 0; i<this.timespans.length;i++){
                this.timespans[i].handleDestroyed();
            }
            this.timespans = [];
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
         * @method mergeWithPrev
         * @param  {TimeSpan} mergingSpan Span to merge - at the right side
         */
        mergeWithPrev: function(mergingSpan){ // merge mergingSpan and previous

            var spanI = null;
            for(var i=this.timespans.length-1; i>=0; i--){
                var span = this.timespans[i];
                if(span == mergingSpan){
                    spanI = i;
                    break;
                }
            }
            if(spanI ===null || mergingSpan.getPrev()===null){
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

            createdSpan.setZoom(this.zoom);
            createdSpan.render();

            if(this.timeSpanCreatedFn) this.timeSpanCreatedFn(createdSpan);

            mergingSpan.handleMerged(prevSpan,createdSpan);  

            prevSpan.handleDestroyed();
            mergingSpan.handleDestroyed();

        },
        /**
         * Find time span by position
         *
         * @method  getTimeSpanAtPosition
         * @param  {Number} time Time inside span
         * @return {TimeSpan|null} 
         */
        getTimeSpanAtPosition: function(time){
            for(var i=this.timespans.length-1; i>=0; i--){
                var span = this.timespans[i];
                if(span.getStart()<=time && span.getEnd()>=time){
                    return this.timespans[i];
                }
            }            
            return null;
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


            if((time - splitSpan.getStart() < this.options.minSpanLength || (splitSpan.getEnd() - time) < this.options.minSpanLength)){
                
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
            splitSpan.handleDestroyed();

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
            this.disconnectContainers();
            this.handleBeforeBatchPositionChange();
            for(i in this.timespans){
                this.timespans[i].setZoom(this.zoom);
            }
            this.handleBatchPositionChanged();
            this.reconnectContainers();
        },
        /**
         * Set event handler for new spans created
         *
         * @method onTimeSpanCreated
         * @param  {Function} fn Function(TimeSpan timespan)
         */
        onTimeSpanCreated: function(fn){
            this.timeSpanCreatedFn = fn;
        },
        startBatch: function(){
            this.disconnectContainers();
        }, 
        cancelBatch: function(){
            this.reconnectContainers();
        },
        finishBatch: function(){

            this.reconnectContainers();

            /*var foreFragment = $(document.createDocumentFragment());
            var backFragment = $(document.createDocumentFragment());


            this.batchLoading = false;
            for(var i=0; i< this.timespans.length; i++){
                this.timespans[i].render(foreFragment, backFragment);
            }

            if(this.timespans.length){
                this.timespans[0].backgroundContainer.append(backFragment);
                this.timespans[0].foregroundContainer.append(foreFragment);
            }
*/

        },

        /**
         * Disconnect annotation element containers from DOM
         *
         * Useful for speeding up batch updates like zooming or creating lots of time spans
         *
         * @method disconnectContainers
         */
        disconnectContainers: function(){
            this.foregroundContainer.detach();
            this.backgroundContainer.detach();
        },
        /**
         * Reconnect annotation element containers disconnected by disconnectContainers
         *
         * @method reconnectContainers
         */
        reconnectContainers: function(){
            
            if(this.areContainersConnected()){
                return;
            }

            this.foregroundConnector.append(this.foregroundContainer);
            this.backgroundConnector.append(this.backgroundContainer);
        },
        areContainersConnected: function(){
            return this.foregroundContainer.parent().length > 0;
        },

        /**
         * Set event handler for batch position changes (zooming)
         *
         * @method  onBeforeBatchPositionChange
         * @param  {Function} fn Event handler accepting zoom(pixels per second) and waveform length(pixels) as arguments
         */
        onBeforeBatchPositionChange: function(fn){
            this.BeforeBatchPositionChangeHnd.push(fn);
        },
        /**
         * Fire position change event handlers
         *
         * @method  handleBeforeBatchPositionChange
         */
        handleBeforeBatchPositionChange: function(){

            if(this.BeforeBatchPositionChangeHnd){
                for(var i in this.BeforeBatchPositionChangeHnd){
                    this.BeforeBatchPositionChangeHnd[i]();
                }
            }

        },

        /**
         * Set event handler for batch position changes (zooming)
         *
         * @method  onBatchPositionChanged
         * @param  {Function} fn Event handler accepting zoom(pixels per second) and waveform length(pixels) as arguments
         */
        onBatchPositionChanged: function(fn){
            this.BatchPositionChangedHnd.push(fn);
        },
        /**
         * Fire position change event handlers
         *
         * @method  handleBatchPositionChanged
         */
        handleBatchPositionChanged: function(){

            if(this.BatchPositionChangedHnd){
                for(var i in this.BatchPositionChangedHnd){
                    this.BatchPositionChangedHnd[i]();
                }
            }

        },


    };

    return TimeSpanCollection;
});

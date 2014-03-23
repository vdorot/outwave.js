/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/


define([
    './continuous-time-span',
    './sparse-time-span',
    './draggable'
],function(ContinuousTimeSpan,SparseTimeSpan,Draggable){



    /**
     * Time span collection
     *
     * Manages all time spans
     * @param {Outwave} outwave Outwave object
     */
    var TimeSpanCollection = function(outwave){

        var self = this;

        this.outwave = outwave;

        this.zoom = 1;

        this.dataFile = outwave.getDataFile();

        var containers = outwave.getTimeSpanContainers();

        this.backgroundContainer = containers.back;

        this.foregroundContainer = containers.front;

        this.style = outwave.getStyle();

        this.timespans = [];

        this.spanMixin = function(span){
            Draggable(span,self.outwave.getViewportElement(),self.style);
            span.setScrollingSpeed(4);
            return span;
        };


        this.continuous = false;

        this.setZoom(outwave.getZoom());
        outwave.onZoomChanged(function(zoom){
            self.setZoom(zoom);
        });
    };


    TimeSpanCollection.prototype = {
        /**
         * Return all time spans
         *
         * The array should not be manipulated with, only use for reading
         * @return {[type]} [description]
         */
        getAll: function(){
            return this.timespans;
        },
        /**
         * Set mode to continuous - time spans have to start at the point the previous one ends
         */
        setContinuous: function(){
            this.continuous = true;
        },
        /**
         * Factory for new time spans
         *
         * Creates continuous of sparse time span depending on set mode
         * @return {TimeSpan} New time span
         */
        spanFactory: function(){
            var constructor = this.continuous ? ContinuousTimeSpan : SparseTimeSpan;

            var span = new constructor(this, this.dataFile, this.backgroundContainer, this.foregroundContainer, this.style);
            if(this.spanMixin) this.spanMixin(span);
            return span;
        },  
        /**
         * Merge mergingSpan with span before
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

            var createdSpan = this.spanFactory();

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
         * @param  {Number} time Time in seconds
         */
        split: function(time){

            //todo: chek minLength

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


            //TODO: check minimum span length

            var splitSpan = this.timespans[spanI];

            this.timespans.splice(spanI,1); // detach span


            var prevSpan = this.spanFactory();
            prevSpan.setStart(splitSpan.getStart());
            prevSpan.setEnd(time);
            prevSpan.setPrev(splitSpan.getPrev());
            if(splitSpan.getPrev()) splitSpan.getPrev().setNext(prevSpan);

            var nextSpan = this.spanFactory();


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
         * Add new Continuous time span
         *
         * Starting time is end of last time span or 0, if no spans exist
         * @param {Number} end Ending time
         */
        addContinuous: function(end){ // creates time span in continuous mode
            //find last, add next to it

            //TODO: check mode


            if(end<0 || end > this.dataFile.getLength()){
                var error = new Error("Invalid end time");
                error.name = "TimeSpanError";
                throw error;            
            }


            var span = this.spanFactory();

            if(this.timespans.length){


                var prevSpan = this.timespans[this.timespans.length-1];

                if(end < prevSpan.getEnd()){
                    var error = new Error("Time spans would overlap");
                    error.name = "TimeSpanError";
                    throw error;                    
                }

                span.setStart(prevSpan.getEnd());
                span.setEnd(end);

                span.setPrev(prevSpan);
                span.setNext(null);
                prevSpan.setNext(span);

            }else{

                span.setStart(0);
                span.setEnd(end);
                span.setPrev(null);
                span.setNext(null);
            }


            this.timespans.splice(this.timespans.length,0,span);

            span.setZoom(this.zoom);
            span.render();

            if(this.timeSpanCreatedFn) this.timeSpanCreatedFn(span);


        },
        /**
         * Add spase time span
         * @param {Number} start Start time in seconds
         * @param {Number} end   End time in seconds
         */
        addSparse: function(start,end){ // creates time span in sparse mode

            //TODO: check mode

            //find which timespan the new one goes after
            var prevI = null;
            for(var i=this.timespans.length-1; i>=0; i--){
                var span = this.timespans[i];
                if(span.getEnd() <=start){
                    prevI = i;
                    break;
                }
            }




            var prev = null;
            var next = null;

            if(prevI !== null){
                prev = this.timespans[prevI];
            }



            if(prev){
                next = prev.getNext();
            }else{
                if(this.timespans.length){
                    next = this.timespans[0];
                }else{
                    next = null;
                }
            }






            //check for overlapping timespans
            if(next && next.getStart() < end){

                var error = new Error("Time spans would overlap");
                error.name = "TimeSpanError";
                throw error;
            }


            var timespan = this.spanFactory();

            var nextI;

            if(prev){
                nextI = prevI +1;
            }else{
                nextI = 0;
            }



            this.timespans.splice(nextI,0,timespan); // insert timespan into ordered array
            timespan.setStart(start);
            timespan.setEnd(end);        
            timespan.setPrev(prev);
            timespan.setNext(next);

            if(prev){
                prev.setNext(timespan);
            }

            if(next){
                next.setPrev(timespan);
            }



            timespan.setZoom(this.zoom);
            timespan.render();


            if(this.timeSpanCreatedFn) this.timeSpanCreatedFn(timespan);

            return timespan;

        },
        /**
         * Remove time span
         * @param  {TimeSpan} timespan [Time span to be removed
         */
        removeTimeSpan: function(timespan){
            var i;
            for(i in this.timespans){
                if(this.timespans[i] == timespan){
                    this.timespans.splice(i,1);
                    break;
                }
            }
        },
        /**
         * Update zoom
         * @param {NUmber} zoom Zoom-value
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
         * @param  {Function} fn Function(TimeSpan timespan)
         */
        onTimeSpanCreated: function(fn){
            this.timeSpanCreatedFn = fn;
        }


    };

    return TimeSpanCollection;
});
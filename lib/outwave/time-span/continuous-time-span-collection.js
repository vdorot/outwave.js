/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

define([
'./time-span-collection',
'./continuous-time-span'
],function(TimeSpanCollection,ContinuousTimeSpan){

    /**
     * @module TimeSpan
     */

    /**
     * Continuous time span collection
     *
     * Manages all time spans
     *
     * @class ContinuousTimeSpanCollection
     * @extends {TimeSpanCollection}
     * @constructor
     * @param {Viewer} viewer Viewer object
     * @param {Array} options Options: {minSpanLength: Number}
     */
    var ContinuousTimeSpanCollection = function(viewer, options){
        var collection = new TimeSpanCollection(viewer, options);


        /**
         * Creates a continuous time span and returns the instance
         *
         * Overrides method in parent class
         * 
         * @method spanFactory
         * @return {TimeSpan} New time span
         */
        collection.spanFactory = function(){
            var span = new ContinuousTimeSpan(this, this.dataFile, this.backgroundContainer, this.foregroundContainer, this.style);
            return span;
        };

        /**
         * Add new Continuous time span
         *
         * Starting time is end of last time span or 0, if no spans exist
         *
         * @method  addTimeSpan
         * @param {Number} end Ending time
         */
        collection.addTimeSpan = function(end){

            if(end<0 || end > this.dataFile.getLength()){
                var error = new Error("Invalid end time");
                error.name = "TimeSpanError";
                throw error;            
            }


            var span = this.createSpan();

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
            if(!this.batchLoading){
                span.render();
            }

            if(this.timeSpanCreatedFn) this.timeSpanCreatedFn(span);
            
            return span;

        };

        /**
         * Remove time span
         *
         * @method  removeTimeSpan
         * @param  {TimeSpan} timespan Time span to be removed
         */
        collection.removeTimeSpan =  function(timespan){
            var i;
            for(i in this.timespans){
                if(this.timespans[i] == timespan){


                    if(timespan.getPrev() !== null){
                        timespan.getPrev().setNext(timespan.getNext());
                    }

                    if(timespan.getNext() !== null){
                        timespan.getNext().setPrev(timespan.getPrev());
                        timespan.getNext().setStart(timespan.getStart());
                    }                    

                    timespan.handleRemoved();
                    timespan.handleDestroyed();

                    this.timespans.splice(i,1);
                    break;
                }
            }

        };

        return collection; //return extended object
    };

    return ContinuousTimeSpanCollection;

});

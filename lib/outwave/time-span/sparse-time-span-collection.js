/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

define([
'./time-span-collection',
'./sparse-time-span'
],function(TimeSpanCollection,SparseTimeSpan){

    /**
     * Continuous time span collection
     *
     * Manages all time spans
     * 
     * @class ContinuousTimeSpanCollection
     * @extends {TimeSpanCollection}
     * @constructor
     * @param {Outwave} outwave Outwave object
     */
    var ContinuousTimeSpanCollection = function(outwave){
        var collection = new TimeSpanCollection(outwave);


        /**
         * Creates a sparse time span and return the instance
         *
         * Overrides method in parent class
         * 
         * @return {TimeSpan} New time span
         */
        collection.spanFactory = function(){
            var span = new SparseTimeSpan(this, this.dataFile, this.backgroundContainer, this.foregroundContainer, this.style);
            return span;
        };


        /**
        * Add sparse time span
        * @param {Number} start Start time in seconds
        * @param {Number} end   End time in seconds
        */
        collection.addTimeSpan = function(start,end){


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


            var timespan = this.createSpan();

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

        };
        
        return collection; //return extended object
    };

    return ContinuousTimeSpanCollection;

});
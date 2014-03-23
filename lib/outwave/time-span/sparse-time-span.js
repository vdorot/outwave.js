/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

define([
'./time-span'
],function(TimeSpan){

    /**
     * Sparse time span
     *
     * @class SparseTimeSpan
     * @extends {TimeSpan}
     * @constructor
     * @param {TimeSpanCollection} collection collection object
     * @param {DataFile} dataFile Waveform data
     * @param {jQuery element} backgroundContainer Container element behind waveform
     * @param {jQuery element} foregroundContainer Container element above waveform
     * @param {Style} style Style object
     */
    var SparseTimeSpan = function(collection, dataFile, backgroundContainer, foregroundContainer, style){
        var span = new TimeSpan(collection, dataFile, backgroundContainer, foregroundContainer, style);



        var getStartLimits = span.getStartLimits;
        
        /**
         * Get range of times this span can start at
         *
         * Extends method from parent class
         * @return {interval} Start limits
         */
        span.getStartLimits = function(){
            var limits = getStartLimits.call(this);
            if(this.getPrev()){
                limits = this.intersectIntervals(limits,{s:this.getPrev().getEnd(),e:this.getEnd()});
            }
            return limits;
        };

        var getEndLimits = span.getEndLimits;

        /**
         * Get range of times this span can end at
         *
         * Extends method from parent class
         * @return {interval} End limits
         */        
        span.getEndLimits = function(){
            var limits = getEndLimits.call(this);
            if(this.getNext()){
                limits = this.intersectIntervals(limits,{s:this.getStart(),e:this.getNext().getStart()});
            }
            return limits;
        };

        return span; //return extended object
    };

    return SparseTimeSpan;

});
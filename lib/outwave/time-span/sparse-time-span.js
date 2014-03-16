/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

define([
'./time-span'
],function(TimeSpan){

    var SparseTimeSpan = function(collection, dataFile, backgroundContainer, foregroundContainer, style){
        var span = new TimeSpan(collection, dataFile, backgroundContainer, foregroundContainer, style);



        var getStartLimits = span.getStartLimits;
        span.getStartLimits = function(){
            var limits = getStartLimits.call(this)
            if(this.getPrev()){
                limits = this.intersectIntervals(limits,{s:this.getPrev().getEnd(),e:this.getEnd()});
            }
            return limits;
        }

        var getEndLimits = span.getEndLimits;
        span.getEndLimits = function(){
            var limits = getEndLimits.call(this)
            if(this.getNext()){
                limits = this.intersectIntervals(limits,{s:this.getStart(),e:this.getNext().getStart()});
            }
            return limits;
        }



        span.aaa = "hellow";

        return span; //return extended object
    };

    return SparseTimeSpan;

});
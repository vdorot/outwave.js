
/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

define([
'./time-span'
],function(TimeSpan){

    var ContinuousTimeSpan = function(collection, dataFile, backgroundContainer, foregroundContainer, style){
        var span = new TimeSpan(collection, dataFile, backgroundContainer, foregroundContainer, style);

        var getStartLimits = span.getStartLimits;
        span.getStartLimits = function(){
            var limits = getStartLimits.call(this);
            
            if(this.getPrev()){
                limits = this.intersectIntervals(limits,{s:this.getPrev().getStart()+this.getPrev().getMinLength(),e:this.getEnd()});
            }

            return limits;
        };


        var getEndLimits = span.getEndLimits;
        span.getEndLimits = function(){
            var limits = getEndLimits.call(this);
            
            if(this.getNext()){
                limits = this.intersectIntervals(limits,{s:this.getStart(),e:this.getNext().getEnd()-this.getNext().getMinLength()});
            }


            return limits;
        };   

        var setStart = span.setStart;
        span.setStart = function(time){
            var prevTime = this.getStart();

            setStart.call(this,time);

            if(time !=prevTime && this.getPrev()) this.getPrev().setEnd(time);
            
        };

        var setEnd = span.setEnd;
        span.setEnd = function(time){
            prevTime = this.getEnd();
            setEnd.call(this,time);

            if(time != prevTime && this.getNext()) this.getNext().setStart(time);       

        };


        var setPrev = span.setPrev;

        span.setPrev = function(prev){
            setPrev.call(this,prev);
            if(prev){
                this.getStartElement().addClass('continuous');
            }else{
                this.getStartElement().removeClass('continuous');
            }
        };

        var setNext = span.setNext;

        span.setNext = function(next){
            setNext.call(this,next);
            if(next){
                this.getEndElement().addClass('continuous');
            }else{
                this.getEndElement().removeClass('continuous');
            }
        };


        return span; //return extended object
    };
    return ContinuousTimeSpan;
});
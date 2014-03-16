/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

define([
'../utils'
],function(Utils){


    /*abstract class, use SparseTimeSPan or ContinuousTimeSpan*/
    var TimeSpan = function(collection, dataFile, backgroundContainer, foregroundContainer, style){

        this.zoom = null;

        this.dataFile = dataFile;

        this.collection = collection;

        this.backgroundContainer = backgroundContainer;

        this.foregroundContainer = foregroundContainer;

        this.style = style;

        this.start = null;

        this.end = null;

        this.prev = null;
        this.next = null;

        this.rendered = false;

        this.startEl;
        this.endEl;
        this.backEl;

        this.utils = Utils; //TODO: refactor


        this.splitFn;

        this.mergedFn;

        this.minLength = 1;

        this.data = null;

    }


    TimeSpan.prototype = {
        getCollection: function(){
            return this.collection;
        },
        setData: function(data){
            this.data = data;
        },
        getData: function(){
            return this.data;
        },
        onSplit: function(fn){
            this.splitFn = fn;
        },

        handleSplit: function(prevSpan,nextSpan){
            if(this.splitFn){
                this.splitFn(prevSpan,nextSpan);
            }
        },

        onMerged: function(fn){
            this.mergedFn = fn;
        },
        handleMerged: function(prevSpan,createdSpan){
            if(this.mergedFn){
                this.mergedFn(prevSpan,createdSpan);
            }
        },
        getMinLength: function(){
            return this.minLength;
        },
        setPrev: function(prev){
            this.prev = prev;
        },
        setNext: function(next){
            this.next = next;
        },
        getPrev: function(){
            return this.prev;
        },
        getNext: function(){
            return this.next;
        },
        //interval: {s:0,e:1}
        intersectIntervals: function(a,b){
            if(!a || !b){
                return null;
            }
            var s = Math.max(a.s,b.s);
            var e = Math.min(a.e,b.e);
            return (s<=e)? {s:s,e:e} : null;
        },
        applyInterval: function(interval,value){ // limits vlaue range to interval
            if(!interval) return null;
            var val = Math.max(interval.s,value);
            val = Math.min(interval.e,val);
            return val;
        },
        inInterval: function(interval,time){
            return interval && (time >= interval.s && time<=interval.e);
        },
        getStartLimits: function(){ // returns interval
            if(this.getEnd() !== null){
                return {s:0,e:this.getEnd()-this.getMinLength()};
            }else{
                return {s:0,e:(this.dataFile.getLength())};
            }
        },
        getEndLimits: function(){ // returns interval
            if(this.getStart() !== null){
                return {s:this.getStart()+this.getMinLength(),e:(this.dataFile.getLength())}
            }else{     
                return {s:0,e:(this.dataFile.getLength())};
            }
        },
        canStart: function(start){
            var limits = this.getStartLimits();
            return this.inInterval(limits,start);
        },
        canEnd: function(end){
            var limits = this.getEndLimits();
            return this.inInterval(limits,end);
        },
        setStart: function(start){
            if(!this.canStart(start)){
                //console.log(this.getStartLimits(),end);
                var error = new Error("TimeSpans would overlap");
                error.name = "TimeSpanError";
                throw error;
            }
            this.start = start;
            this.updatePosition();
        },
        setEnd: function(end){
            if(!this.canEnd(end)){
                var error = new Error("TimeSpans would overlap");
                error.name = "TimeSpanError";
                throw error;
            }
            this.end = end;
            this.updatePosition();
        },
        getStart: function(){
            return this.start;
        },
        getStartX: function(){
            return this.timeToX(this.start);
        },
        getEndX: function(){
            return this.timeToX(this.end);
        },
        getEnd: function(){
            return this.end;
        },
        timeToX: function(time){
            return Math.floor(time*this.dataFile.sampleRate/this.zoom);
        },
        xToTime: function(x){
            return (x)*this.zoom/this.dataFile.sampleRate;
        },
        getXStart: function(){
            return this.timeToX(this.start);
        },
        getXEnd: function(){
            return this.timeToX(this.end);
        },
        updatePosition: function(){
            //update element position
            if(!this.rendered){
                return;
            }


            var startX = this.timeToX(this.start);

            var endX = this.timeToX(this.end);

            if(this.positionChangedFn) this.positionChangedFn(this.getStart(),this.getEnd());


            var startPos = startX;

            var startEl = this.getStartElement();
            var endEl = this.getEndElement();
            var backEl = this.getBackElement();

            startEl.css('position','absolute');

            endEl.css('position','absolute');

            backEl.css('position','absolute');

            if(this.style.horizontal()){

                backEl.css({'left': startPos, 'width': endX - startX});

                startEl.css('left',startPos);
                var endPos = endX - this.getEndDimensions().w;
                endEl.css('left',endPos);
            }else{
                backEl.css({'top': startPos, 'height': endX - startX});

                startEl.css('top',startPos);
                var endPos = endX - this.getEndDimensions().h;
                endEl.css('top',endPos);
            }


        },
        createStartElement: function(){
            return this.style.timeSpanStart();
        },
        createEndElement: function(){
            return this.style.timeSpanEnd();
        },
        createBackElement: function(){
            return this.style.timeSpanBackground();
        },
        getStartElement: function(){
            if(!this.startEl){
                this.startEl = this.createStartElement();
            }

            return this.startEl;
        },
        getEndElement: function(){
            if(!this.endEl){
                this.endEl = this.createEndElement();
            }

            return this.endEl;
        },
        getBackElement: function(){
            if(!this.backEl){
                this.backEl = this.createBackElement();
            }

            return this.backEl;       
        },
        getStartDimensions: function(){ // return dimensions of HTML element representing start of time span
            if(!this.startDim){
                this.startDim = this.utils.getElementDimensions(this.getStartElement());
            }
            return this.startDim;
        },
        getEndDimensions: function(){
            if(!this.endDim){
                this.endDim = this.utils.getElementDimensions(this.getEndElement());
            }
            return this.endDim;
        },
        render: function(){

            //generate element
            if(this.rendered){
                this.unRender();
            }


            if(this.start===null || this.end===null || this.zoom===null){
                return;
            }

            //check if start, end and zoom are available

            var startEl = this.getStartElement();

            //startEl.mousemove(function(e){$(e.target).parent().trigger('mouseleave'); e.stopPropagation();});

            var startDim = this.getStartDimensions();


            var endEl = this.getEndElement();

            /*endEl.mousemove(function(e){

                $(e.target).parent().trigger('mouseleave'); e.stopPropagation();

            });*/

            var endDim = this.getEndDimensions();

            this.foregroundContainer.append(startEl, endEl);

            var backEl = this.getBackElement();

            this.backgroundContainer.append(backEl);

            this.rendered = true;

            this.updatePosition();

            var self = this;


            


        },
        setZoom: function(zoom){

            this.zoom = zoom;
            this.updatePosition();
        },
        unRender: function(){ // possible optimisation - keeping only visible annotations rendered
            //remove html elements
            if(!this.rendered){
                return;
            }
            if(this.startEl){
                this.startEl.remove();
                this.startEl = null;
            }

            if(this.endEl){
                this.endEl.remove();
                this.endEl = null;
            }
            if(this.backEl){
                this.backEl.remove();
                this.backEl = null;
            }
            this.startDim = null;
            this.endDim = null;

            this.rendered = false;
        },
        handleRemoved: function(){
            this.unRender();
            if(this.removedFn) this.removedFn();
        },
        onPositionChanged: function(fn){
            this.positionChangedFn = fn;
        },
        onRemoved: function(fn){
            this.removedFn = fn;
        }




    /*dragging: onmousedown capture all movememnt, onmouseup stop*/

    }

    return TimeSpan;

});
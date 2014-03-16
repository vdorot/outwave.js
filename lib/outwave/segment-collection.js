/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

define([],function(){

    var SegmentCollection = function(dataFile, container, segmentFactory, segmentWidth, style){
        this.container = jQuery(container);
        this.container.empty();
        this.viewportLength;
        this.segmentFactory = segmentFactory;

        this.dataFile = dataFile;

        this.segmentWidth = segmentWidth;

        this.segmentCnt = null;
        this.zoom = 1;

        var self = this;

        this.segments = []; //array of segments


        this.cursorTime=null; // time in seconds

        this.cursorTime = 0;
        this.position = null;

        this.scrollPos = 0;

        this.style = style;


    }


    SegmentCollection.prototype = {

    onDimensionChange: function(fn){
        this.dimChangeFn = fn;
    },
    updateDimensions: function(){

        this.segmentCnt = Math.ceil(this.dataFile.frames/ this.zoom / this.segmentWidth);

        this.containerLength = Math.floor(this.dataFile.frames / this.zoom);


        if(this.style.horizontal()){
            this.container.width(this.containerLength);
        }else{
            this.container.height(this.containerLength);
        }

        if(this.dimChangeFn) this.dimChangeFn(containerLength);
    },
    setCursorX: function(x){
        if(!x){
            this.removeCursor();
        }else{
            this.setCursor(this.px2time(x));
        }
    }, 
    setViewportLength: function(ln){
        this.viewportLength = ln;
        this.updateDimensions();
    }
    , 
    px2time: function(px){
        return px/this.dataFile.sampleRate*this.zoom;
    },
    time2px: function(time){
            return Math.floor(time*this.dataFile.sampleRate/this.zoom);   
    }
    ,
    setCursor: function(time){
        if(time == null || time == false){
            return this.removeCursor();
        }
        if(this.cursorTime == time){
            return;
        }
        this.cursorTime = time;
        for(var i=0;i<this.segments.length;i++){
            this.segments[i].setCursor(this.time2px(time));
        }


    },
    removeCursor: function(){
        if(this.cursorTime){
            for(var i=0;i<this.segments.length;i++){
                this.segments[i].setCursor(null);
            }
        }
        this.cursorTime = null;
    },
    setZoom: function(zoom){
        this.zoom = zoom;
        this.updateDimensions();
        this.rebuild();
    },
    scrollTo: function(xPos){
        this.scrollPos = xPos;
        this.updateSegments();
    },
    /*Get one of the recycled segments*/
    getAvailableSegment: function(s){ //s -segment index
        for(var i=0;i<this.segments.length;i++){
            if(this.segments[i].recycled()){
                return this.segments[i];
            }
        }
    },
    createSegment: function(){
        var segment = this.segmentFactory(this.container);
        this.segments.push(segment);
        return segment;
    },
    /*Remove and recreate all segments*/
    rebuild: function(){
        this.segments = new Array();
        this.container.empty();
        this.updateSegments();
    },
    /*Make sure that segment on position s exists*/
    /*Tries to recycle a segment, or creates a new one*/
    ensureSegment: function(s){



        var f=false;
        for(var i=0;i<this.segments.length;i++){
            if(this.segments[i].getPos() == s*this.segmentWidth && !this.segments[i].recycled()){
                f = true;
                break;
            }
        }
        //if segment is found, do nothing
        if(!f){
            var segment = this.getAvailableSegment(); //try getting a recycled segment
            if(!segment){ //no recycled segment found
                segment = this.createSegment();
            }
            var width = Math.min(this.containerLength-s*this.segmentWidth, this.segmentWidth);

            var xCursor = this.time2px(this.cursorTime);
            segment.setZoom(this.zoom);
            segment.setCursor(xCursor);
            segment.setPosWidth(s*this.segmentWidth,width); //setPos autmatically sets segment to NOT recycled
        }
    },
    /*Update segments, after zoom or viewport change*/
    updateSegments: function(){


        if(!this.viewportLength){
            var error = new Error("Viewport length undefined, call setViewportLength before updateSegments");
            error.name = "InvalidState";
            throw error;
        }

        var startW = this.scrollPos - this.viewportLength;
        var endW = this.scrollPos + 2*this.viewportLength;

        var startS = Math.floor(startW / this.segmentWidth);
        var endS = Math.ceil(endW / this.segmentWidth);



        startS = Math.max(startS,0);
        endS = Math.min(endS,this.segmentCnt-1);


        var startX = startS*this.segmentWidth;
        var endX = endS*this.segmentWidth;


        for(var i = 0; i<this.segments.length;i++){
            
            //recycle segments outside of viewport
            if(this.segments[i].getPos()<startX || this.segments[i].getPos() > endX){
                this.segments[i].recycle();
            }
        }


        for(var i=startS; i<=endS;i++){
            this.ensureSegment(i);
        }
        this.segments.sort(function(a,b){return a.getPos()-b.getPos();});
        this.render();
    },
    /*Rendering loop*/
    render: function(){
        var self = this;
        /*Find any segment that needs rendering, and schedule rendering another segment after current segment is finished*/
        
        //todo: render segments in viewport first

        for(var i=0;i<this.segments.length;i++){
            var seg = this.segments[i];
            if(!seg.recycled() && !seg.rendering() && !seg.rendered() &&
                seg.getPos() >= this.scrollPos && seg.getPos() <= (this.scrollPos + this.viewportLength)
                ){
                this.segments[i].render(function(){self.render();});
                return; //found segment in viewport
            }
        }


        for(var i=0;i<this.segments.length;i++){
            var seg = this.segments[i];
            if(!seg.recycled() && !seg.rendering() && !seg.rendered()){
                this.segments[i].render(function(){self.render();});
                return;
            }
        }


    }

    };
    return SegmentCollection;
});
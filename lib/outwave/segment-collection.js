/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

define([],function(){


    /**
     * @module Outwave
     */

    /**
     * Create a segment collection
     * 
     * @class SegmentCollection
     * @constructor
     * @param {DataFile} dataFile       Waveform data
     * @param {jQuery element} container      Container element
     * @param {Function} segmentFactory Factory function for segments
     * @param {Number} segmentWidth   Width of segments
     * @param {Style} style          Style object
     */
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


    };


    SegmentCollection.prototype = {
    /**
     * Update dimensions of container element
     *
     * @method updateDimensions 
     */
    updateDimensions: function(){

        this.segmentCnt = Math.ceil(this.dataFile.getFrameCnt() / this.zoom / this.segmentWidth);

        this.containerLength = Math.floor(this.dataFile.getFrameCnt() / this.zoom);


        if(this.style.horizontal()){
            this.container.width(this.containerLength);
        }else{
            this.container.height(this.containerLength);
        }
    },
    /**
     * Set cursor position
     *
     * @method  setCursorX
     * @param {Number} x Pixel position of cursor froms tart of waveform
     */
    setCursorX: function(x){
        if(!x){
            this.removeCursor();
        }else{
            this.setCursor(this.dataFile.px2time(x,zoom));
        }
    },
    /**
     * Reacts to changes in viewport length
     *
     * @method setViewportLength 
     */
    setViewportLength: function(ln){
        this.viewportLength = ln;
        this.updateDimensions();
    },
    /**
     * Set cursor position
     *
     * @method  setCursor
     * @param {Number} time Time in seconds
     */
    setCursor: function(time){
        if(time === null || time === false){
            return this.removeCursor();
        }
        if(this.cursorTime == time){
            return;
        }
        this.cursorTime = time;
        for(var i=0;i<this.segments.length;i++){
            this.segments[i].setCursor(this.dataFile.time2px(time, this.zoom));
        }


    },
    /**
     * Remove cursor
     *
     * @method  removeCursor
     */
    removeCursor: function(){
        if(this.cursorTime){
            for(var i=0;i<this.segments.length;i++){
                this.segments[i].setCursor(null);
            }
        }
        this.cursorTime = null;
    },
    /**
     * Set zoom
     *
     * @method  setZoom
     * @param {Number} zoom Zoom-value
     */
    setZoom: function(zoom){
        this.zoom = zoom;
        this.updateDimensions();
        this.rebuild();
    },
    /**
     * React to scroliling
     *
     * Should be called when the viewport is scrolled
     *
     * @method  scrollTo
     * @param  {Number} xPos Scroll position - left side of viewport
     */
    scrollTo: function(xPos){
        this.scrollPos = xPos;
        this.updateSegments();
    },
    /**
     * Get a recycled segment, if available
     *
     * @method  getAvailableSegment
     */
    getAvailableSegment: function(){
        for(var i=0;i<this.segments.length;i++){
            if(this.segments[i].recycled()){
                return this.segments[i];
            }
        }
    },
    /**
     * Create a new segment, using segment factory function
     *
     * @method  createSegment
     * @return {Segment} The new segment
     */
    createSegment: function(){
        var segment = this.segmentFactory(this.container);
        this.segments.push(segment);
        return segment;
    },
    /**
     * Removes and recreates all segments
     *
     * Used when zoom factor change
     *
     * @method  rebuild
     */
    rebuild: function(){
        this.segments = [];
        this.container.empty();
        this.updateSegments();
    },
    /**
     * Ensure that there is a segment on index s
     *
     * Tries to recycle existing segments, or creates a new one if necessary
     *
     * @method  ensureSegment
     * @param  {Number} s Index of segment
     */
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

            var xCursor = this.dataFile.time2px(this.cursorTime,this.zoom);
            segment.setZoom(this.zoom);
            segment.setCursor(xCursor);
            segment.setPosWidth(s*this.segmentWidth,width); //setPos autmatically sets segment to NOT recycled
        }
    },
    /**
     * Update segments after viewport change(scrolling)
     *
     * Ensures that the segments under the viewport exist and are being rendered if necessary
     *
     * @method  updateSegments
     */
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
    /**
     * Draw segments that haven't been rendered
     *
     * @method  render
     * @return {[type]} [description]
     */
    render: function(){
        var self = this;
        /*Find any segment that needs rendering, and schedule rendering another segment after current segment is finished*/
        
        var doRender = function(){self.render();};

        var i;
        var seg;
        for(i=0;i<this.segments.length;i++){
            seg = this.segments[i];
            if(!seg.recycled() && !seg.rendering() && !seg.rendered() &&
                seg.getPos() >= this.scrollPos && seg.getPos() <= (this.scrollPos + this.viewportLength)
                ){
                this.segments[i].render(doRender);
                return; //found segment in viewport
            }
        }


        for(i=0;i<this.segments.length;i++){
            seg = this.segments[i];
            if(!seg.recycled() && !seg.rendering() && !seg.rendered()){
                this.segments[i].render(doRender);
                return;
            }
        }


    }

    };
    return SegmentCollection;
});
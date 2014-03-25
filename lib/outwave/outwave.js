/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/



/**
 * Web based waveform viewer 
 * 
 * @module Outwave
 * @main  Outwave
 */


define([
    'jquery',
    'jquery-mousewheel',
    './utils',
    './style',
    './segment',
    './segment-collection'
],function($,_mouseWheel,Utils,Style,Segment,SegmentCollection){

    var defaultOptions = {
        height: 400,
        segmentWidth: 500,
        waveformFill: function (ctx, y1, y2, channel, played) {
            var grad = ctx.createLinearGradient(0, y1, 0, y2);
            if (played) {
                if (channel === 0) {
                    grad.addColorStop(0, '#fff');
                    grad.addColorStop(1, '#ff0000');
                } else {
                    grad.addColorStop(0, '#fff');
                    grad.addColorStop(1, '#0000ff');
                }
            } else {
                if (channel === 0) {
                    grad.addColorStop(0, '#fff');
                    grad.addColorStop(1, '#00ABEB');
                } else {
                    grad.addColorStop(0, '#fff');
                    grad.addColorStop(1, '#66CC00');
                }
            }
            return grad;
        },
        hover: false,
        mono: false,
        autoScrollType: 'jerky', // smooth or jerky
        autoScrollTimeout: 800, // milliseconds
        zoomChangeFactor: 2, // number by which the zoom value gets divided/multiplied when zooming in/out
    };



    /**
     * Main waveform viewer object
     *
     * Width and height(x,y) dimensions are used as if for horizontal orientation.
     * If you are using Outwave vertically, exchange the dimensions. Eg. the height option means width on screen.
     * 
     * @class Outwave
     * @constructor
     * @param {HTMLElement|jQuery element} container The element which the viewer will reside in
     * @param {DataFile} file    Object containing preprocessed waveform data
     * @param {Object} options   Options
     */
    var Outwave = function(container,file,options){
        var self = this; // keep this in scope
        this.zoom = 40;

        container = $(container);

        this.containerEl = container.eq(0); // get first element

        this.containerEl.empty();

        this.dataFile = file;

        this.options = $.extend(this.getDefaultOptions(),options);
        this.options.style = new Style();

        if(options.style){
            $.extend(this.options.style,options.style);  
        }

        this.dataFile.setMono(this.options.mono);

        this.style = this.options.style;

        this.zoomChangedHnd = [];
        this.zoomFactorChangedHnd = [];

        //element with scrollbars
        this.scrollbarEl = $('<div class="outwave"></div>').css(this.style.horizontal()?"height":"width",this.options.height);
        
        Utils.setDimBase(this.scrollbarEl);

        this.scrollbarEl.addClass(this.style.vertical()?"vertical":"horizontal");

        if(this.style.vertical()){
            this.scrollbarEl.css("height","100%");
        }

        this.containerEl.append(this.scrollbarEl);
        var self = this;

        this.width = this.scrollbarEl.width();


        this.segmentsEl = $('<div style="position: relative";></div>');
        this.segmentsEl.height(this.internalHeight());

        this.scrollbarEl.append(this.segmentsEl);



        this.backgroundEl = $('<div style="position: absolute; z-index: 0;" class="background">');

        this.foregroundEl = $('<div style="position: absolute; z-index: 5;" class="foreground">');


        this.timeSpanEl = $('<div style="width: 100%; height: 100%; position: absolute;" class="timeSpans"></div>');
        
        this.foregroundEl.append(this.timeSpanEl);


        this.cursorEl = this.options.style.cursor();
        this.cursorDim = Utils.getElementDimensions(this.cursorEl);
        this.cursorEl.css({position: "absolute", display: "none", 'z-index': 10});
        this.foregroundEl.append(this.cursorEl);


        this.updateDimensions();

        this.hoverEl = this.options.style.hover();
        this.hoverDim = Utils.getElementDimensions(this.hoverEl);
        this.hoverEl.css({position: "absolute", display: "block",'z-index': '100', 'pointer-events': 'none'});

        this.foregroundEl.append(this.hoverEl);



        if(this.options.hover){
            this.foregroundEl.on("mouseenter mousemove", function(event){
                event.preventDefault(); // minimize accidental selection of elements
                var pos;
                if(self.options.style.horizontal()){
                    pos = event.pageX - self.backgroundEl.offset().left;
                    if(pos >= self.internalWidth()){
                        self.scrollbarEl.triggerHandler("mouseleave");
                        return;
                    }
                    self.hoverEl.css("left",Math.floor(pos-(self.hoverDim.w/2))).show();
                }else{
                    pos = event.pageY - self.backgroundEl.offset().top;
                    if(pos >= self.internalWidth()){
                        self.scrollbarEl.triggerHandler("mouseleave");
                        return;
                    }
                    self.hoverEl.css("top",Math.floor(pos-(self.hoverDim.h/2))).show();
                }




            }).on("mouseleave",function(){
                self.hoverEl.hide();
            });

            if(this.options.style.horizontal()){
                this.foregroundEl.css("cursor",'text');
            }else{
                this.foregroundEl.css("cursor",'vertical-text');
            }

        }

        this.foregroundEl.on("mouseup",function(event){
            event.preventDefault();

            var internX;

            if(self.options.style.horizontal()){
                internX = event.pageX - $(this).offset().left;
            }else{
                internX = event.pageY - $(this).offset().top;
            }

            if(internX >= self.internalWidth()){
                return;
            }
            self.clicked(self.internalXToTime(internX));     
        });


        this.scrollbarEl.prepend(this.foregroundEl);
        this.scrollbarEl.prepend(this.backgroundEl);



        var scrollTimeout=null;
        var lastRender = null;

        this.scrollbarEl.scroll(function(){
            if(scrollTimeout){
                clearTimeout(scrollTimeout);
            }
            scrollTimeout = setTimeout(function(){
                lastRender = null;

               self.scrolled();  
            },40); // redraw 40 milliseconds after scrolling stopped

        });


        this.scrollbarEl.on("mousewheel",function (e) {

      
            if(e.altKey || e.ctrlKey){
                if(e.deltaY < 0){
                    self.mouseWheelZoomed(self._zoomIn);
                }else{
                    self.mouseWheelZoomed(self._zoomOut);
                }
                e.preventDefault();
            }
            return true;
            
        });


        //saving mouse position for zooming 
        this.lastMouseEvent = null;

        this.scrollbarEl.on("mousemove mouseenter",function(e){
            self.lastMouseEvent = e;
        });


        this.cursor = null;





        this.handleMouseEnter = function(){
            if(self.mouseTimeout){
                clearTimeout(self.mouseTimeout);
            }
           self.isMouseOver = true;
        };

        this.handleMouseLeave = function(event){

            if(this.mouseTimeout){
                clearTimeout(this.mouseTimeout);            
            }
            self.mouseTimeout = setTimeout(function(){self.isMouseOver = false;},
            self.options.autoScrollTimeout);
        };

       this.scrollbarEl.on("mouseenter",this.handleMouseEnter).on('mouseleave',this.handleMouseLeave);




        var segmentFactory = function(container){
                var segment = new Segment(self.dataFile,container,self.internalHeight(),self.style);

                return segment;
        };

        segments = new SegmentCollection(this.dataFile,this.segmentsEl,segmentFactory,this.options.segmentWidth,self.style);
        var length;
        if(this.style.horizontal()){
            length = this.segmentsEl.width();
        }else{
            length = this.segmentsEl.height();
        }
        segments.setViewportLength(length);
        segments.updateSegments();



        this.segments = segments;

        this.setZoom(this.zoom,true); //updates segments



    };


    Outwave.prototype = {     

        /**
         * Get default options
         * @method getDefaultOoptions
         */
        getDefaultOptions: function(){
            return defaultOptions;

        },
        /**
         * Translate time to pixels
         *
         * @method timeToInternalX
         * @param  {[type]} time [description]
         * @return {[type]}      [description]
         */
        timeToInternalX: function(time){
            return this.dataFile.time2px(time,this.zoom);
        },
        timeToOuterX: function(time){
            return this.timeToInternalX(time)-this.scrollbarEl.scrollLeft();
        },
        /**
         * Translate pixels to time
         *
         * @method  internalXToTime
         * @param  {[type]} x [description]
         * @return {[type]}   [description]
         */
        internalXToTime: function(x){
            return this.dataFile.px2time(x,this.zoom);
        },
        outerXtoTime: function(x){
            return (this.scrollbarEl.scrollLeft()+x)*this.zoom/this.dataFile.getSampleRate();
        },
        internalWidth: function(){
            return Math.floor(this.dataFile.getFrameCnt() / this.zoom);
        },
        timelineHeight: function(){
            return Segment.getTimelineHeight(this.options.style);
        },
        waveformHeight: function(){
            return this.internalHeight() - this.timelineHeight();
        }, 
        internalHeight: function(){//height of element minus scrollbars
            var scrollbar = (this.style.horizontal()?Utils.getScrollbarDim().height:Utils.getScrollbarDim().width) + 4;
            return this.options.height - scrollbar;
        },
        /**
         * Internal, helper function forwarding scroll events to segment collection
         *
         * @method scrolled
         */
        scrolled: function(){
            var position;
            if(this.style.horizontal()){
                position = this.scrollbarEl.scrollLeft();
            }else{
                position = this.scrollbarEl.scrollTop();
            }
            this.segments.scrollTo(position);

        },
        /**
         * Update elements to reflect cursor position
         *
         * @method updateCursor
         */
        updateCursor: function(){
            var time = this.cursor;
            this.segments.setCursor(time);


            var css = {display: "block"};

            var px = this.timeToInternalX(time);

            if(this.options.style.horizontal()){
                css.left = px - this.cursorDim.w / 2;
            }else{
                css.top = px - this.cursorDim.h / 2;
            }

            this.cursorEl.css(css);
        },
        /**
         * Autmatically scroll viewport so that the waveform at time is visible
         *
         * @method autoScroll
         * @param  {Number} time Time in seconds
         */
        autoScroll: function(time){


            //if previous and current position are inside the viewport(visible area of waveform),
            //and cursor is left from center, nudge the scroll position twice the difference between the previous and current position

            var x = this.timeToInternalX(time);

            var width = ( this.style.horizontal() ? this.scrollbarEl.width() : this.scrollbarEl.height() );





            var self = this;


            var scrollFn;
            var scrollX;
            if(this.style.horizontal()){   
                scrollX = self.scrollbarEl.scrollLeft();
                scrollFn = function(val){
                    return self.scrollbarEl.scrollLeft(val);
                };
            }else{
                scrollX = self.scrollbarEl.scrollTop();
                scrollFn = function(val){
                    return self.scrollbarEl.scrollTop(val);
                };
            }


           var cursorX = this.timeToInternalX(this.cursor);

           var timeX = this.timeToInternalX(time);


            if(this.options.autoScrollType == 'smooth'){

                var targetScroll = Math.floor(x - width / 2);

                if(((cursorX >= scrollX && cursorX < scrollX + width)) && // cursor is outside of visible area
                    (timeX >= scrollX && timeX < scrollX + width)){
                    
                    var moved = Math.abs(timeX - cursorX);

                    moved = Math.max(moved,1); // 0 would disable scrolling

                    var scrollTo;



                    if(targetScroll > scrollX){
                       scrollTo = scrollX + moved * 2;
                       scrollTo = Math.min(scrollTo,targetScroll);

                    }else{
                       //do not scroll, let the cursor catch up with scroll position
                       scrollTo = scrollX;           
                    }
                    scrollFn(scrollTo);


                }else{
                    scrollFn(targetScroll);

                }
            }

            if(this.options.autoScrollType == 'jerky'){
                if(((cursorX >= scrollX && cursorX < scrollX + width)) && // cursor is inside of visible area
                    (timeX >= scrollX && timeX < scrollX + width)){
                    
                    
                    //waiting for cursor to get invisible




                }else{

                    scrollFn(timeX);
                }            
            }


        },
        /**
         * Set cursor position
         *
         * @method  setCursor
         * @param {Number} time Player position in seconds
         */
        setCursor: function(time){    
            var maxTime = this.dataFile.getLength();
            if(time > maxTime){
                this.removeCursor();
                return;
            }  
            if(!this.isMouseOver && !this.isScrollLocked){
                try{
                    this.autoScroll(time);
                }catch(e){
                   console.dir(e);
                }
            }

            this.cursor = time;
            this.updateCursor();
        },
        /**
         * Removes cursor, use when playback is stopped
         *
         * @method  removeCursor
         */   
        removeCursor: function(){
            this.cursor = null;
            this.updateCursor();
            this.segments.removeCursor();
            this.cursorEl.hide();
        },
        /**
         * Sets (replaces) click handler
         *
         * @method  onClick
         * @param  {Function} click handler accepting time in seconds as an argument
         */        
        onClick: function(fn){
            this.clickHnd = fn;
            return this;
        },
        /**
         * Fires configurable click handler
         *
         * @method  clicked
         * @param  {Number} time Position in seconds computed from mouse coordinates
         */
        clicked: function(time){
            if(this.clickHnd){
                this.clickHnd(time);
            }
        },
        /**
         * Updates dimensions of HTML elements
         *
         * @method  updateDimensions
         */
        updateDimensions: function(){
            if(this.options.style.horizontal()){
                this.backgroundEl.css({width: this.internalWidth(),height:this.waveformHeight()});
                this.foregroundEl.css({width: this.internalWidth(),height:this.waveformHeight()});
            }else{
                this.backgroundEl.css({height: this.internalWidth(),width:this.waveformHeight(),left:this.timelineHeight()});
                this.foregroundEl.css({height: this.internalWidth(),width:this.waveformHeight(),left:this.timelineHeight()});
            }
            if(this.internalDimensionsChangedFn){
                this.internalDimensionsChangedFn(this.internalWidth());
            }
        },
        /**
         * Set event handler for internal dimensions changes
         *
         * @method onInternalDimensionsChanged
         * @param  {Function} fn Function(intenalWidth)
         */
        onInternalDimensionsChanged: function(fn){
            this.internalDimensionsChangedFn = fn;
        },
        _zoomIn: function(mult){
            if(mult === undefined) mult = this.options.zoomChangeFactor;
            this._setZoom(this.getZoom()*mult);
        },
        _zoomOut: function(div){
            if(div === undefined) div = this.options.zoomChangeFactor;            
            this._setZoom(this.getZoom()/div);
        },

        /**
         * Zoom in
         *
         * @method  zoomIn
         * @param  {Number} mult Factor by which to multiply zoom
         */
        zoomIn: function(mult){
            var time = this.getTimeInMiddle();
            this._zoomIn(mult);
            
            this.setTimeInMiddle(time);
            

            this.handleZoomChanged();
        },
        /**
         * Zoom out
         *
         * @method  zoomOut
         * @param  {Number} div Factor by which to divide current zoom
         */
        zoomOut: function(div){
            var time = this.getTimeInMiddle();
            this._zoomOut(div);
            this.setTimeInMiddle(time);
            this.handleZoomChanged();
        },
        /**
         * Get zoom
         *
         * @method  getZoom
         * @return {Number} Pixels per second
         */
        getZoom: function(){
            return this.dataFile.getSampleRate()/this.getZoomFactor();
        },

        //internal use, doesn't fire event handlers
        _setZoom: function(zoom){
            var zoomFactor = this.dataFile.getSampleRate() / zoom; 
            this._setZoomFactor(zoomFactor);
        },
        /**
         * Set zoom
         *
         * @method  setZoom
         * @param {Number} zoom Pixels pre second
         * @param {Boolean} disableScroll Don't automatically update scroll position
         */
        setZoom: function(zoom){
            var zoomFactor = this.dataFile.getSampleRate() / zoom; 
            this.setZoomFactor(zoomFactor);
        },
        /**
         * Get current zoom value
         *
         * The zoom factor determines how many samples in the preprocessed file
         * are collapsed into one sample(pixel column) on the screen.
         *
         * The resulting zoom levels are therefore dependent on the sample rate of the data file.
         *
         * @method getZoomFactor
         * @return {Number} Zoom factor
         */
        getZoomFactor: function(){
            return this.zoom;
        },
        /**
         * Return position at mouse coodinates
         * @param  {Number} pageX X coordinate relative to page
         * @param  {Number} pageY Y coordinate relative to page
         * @return {Number}       Time in seconds
         */
        getTimeFromMouseCoords: function(pageX, pageY){
            var ofs = this.scrollbarEl.offset();   
            if(this.style.horizontal()){
                pos = this.scrollbarEl.scrollLeft() + pageX - ofs.left;
            }else{
                pos = this.scrollbarEl.scrollTop() + pageY - ofs.top;
            }

            return this.internalXToTime(pos);       
        },
        setTimeAtMouseCoords: function(time,pageX,pageY){
            var ofs = this.scrollbarEl.offset();  
            var x = this.timeToInternalX(time);
            var sc;
            if(this.style.horizontal()){

                sc = x - (pageX - ofs.left);

                this.scrollbarEl.scrollLeft(sc);

            }else{

                sc = x - (pageY - ofs.top);

                this.scrollbarEl.scrollTop(sc);
            }
        },
        /**
         * Return position in the middle of viewport
         * @return {Number} Time in seconds
         */
        getTimeInMiddle: function(){
            var pos;
            if(this.style.horizontal()){
                pos = this.scrollbarEl.scrollLeft() + this.scrollbarEl.width() / 2;
            }else{
                pos = this.scrollbarEl.scrollTop() + this.scrollbarEl.width() / 2;
            }

            return this.internalXToTime(pos);
        },
        /**
         * Scroll viewport so that the middle is on time
         * @param {setTimeInMiddle} time Time to set the middle to
         */
        setTimeInMiddle: function(time){
            var pos;
            if(this.style.horizontal()){
                pos = this.timeToInternalX(time) - this.scrollbarEl.width() / 2;
                this.scrollbarEl.scrollLeft(pos);           
            }else{
                pos = this.timeToInternalX(time) - this.scrollbarEl.height() / 2;
                this.scrollbarEl.scrollTop(pos);   
            }
        },
        mouseWheelZoomed: function(zoomFn){            

            //get time under cursor            
            var time = this.getTimeFromMouseCoords(this.lastMouseEvent.pageX, this.lastMouseEvent.pageY);  

            zoomFn.call(this);

            //set viewport scroll so that time is under cursor
            this.setTimeAtMouseCoords(time,this.lastMouseEvent.pageX, this.lastMouseEvent.pageY);

            this.handleZoomChanged();           
            
        },

        //internal use, doesn't fire event handlers
        _setZoomFactor: function(zoom){
            this.zoom = zoom;
            this.updateDimensions();
        },
        /**
         * Set zoom factor
         *
         * The zoom factor determines how many samples in the preprocessed file
         * are collapsed into one sample(pixel column) on the screen.
         *
         * The resulting zoom levels are therefore dependent on the sample rate of the data file.
         *
         * @method  setZoomFactor
         * @param {Number} zoom Zoom factor
         */
        setZoomFactor: function(zoom){

            this._setZoomFactor(zoom);

            this.handleZoomChanged();
        },
        /**
         * Set event handler for zoom changes
         *
         * @method  onZoomChanged
         * @param  {Function} fn Event handler accepting zoom(pixels per second) as argument
         */
        onZoomChanged: function(fn){
            this.zoomChangedHnd.push(fn);
        },
        /**
         * Fire zoom change events
         *
         * @method  handleZoomChanges
         */
        handleZoomChanged: function(){

            this.segments.setZoom(this.zoom); // changes container length

            if(this.zoomChangedHnd){
                for(i in this.zoomChangedHnd){
                    this.zoomChangedHnd[i](this.getZoom());
                }
            }
            if(this.zoomFactorChangedHnd){
                for(i in this.zoomFactorChangedHnd){
                    this.zoomFactorChangedHnd[i](this.getZoomFactor());
                }
            }
        },
        /**
         * Set event handler for zoom factor changes
         *
         * @method  onZoomChanged
         * @param  {Function} fn Event handler accepting zoom factor as argument
         */
        onZoomFactorChanged: function(fn){
            this.zoomFactorChangedHnd.push(fn);
        },
        /**
         * Enable or disable mono mode
         *
         * In mono mode, all channels are summarised into one
         *
         * @method  setMono
         * @param {Boolean} on on/off
         */
        setMono: function(on){
            if(on === undefined) on = true;
            this.options.mono = on;
            this.dataFile.setMono(on);
            this.segments.rebuild();
        }, 
        /**
         * Returns jQuery element which is used for native scrollbars
         *
         * @method  getViewportElement
         * @return {jQuery element} Viewport element with overflow: auto
         */
        getViewportElement: function(){
            return this.scrollbarEl;
        },
        /**
         * Returns container elements for time span markers
         *
         * @method getTimeSpanContainers
         * @return {[type]} Object {back: [element], front: [element]}
         */
        getTimeSpanContainers: function(){
            return {back: this.backgroundEl,front: this.timeSpanEl};
        },
        /**
         * Returns waveform data
         *
         * @method  getDataFile
         * @return {DataFile} DataFile instance of waveform being viewed
         */
        getDataFile: function(){
            return this.dataFile;
        },
        /**
         * Returns style options
         *
         * @method  getStyle
         * @return {OBject} style options
         */
        getStyle: function(){
            return this.options.style;
        }

    };

    return Outwave;

});

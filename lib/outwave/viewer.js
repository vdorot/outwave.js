/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/



/**
 * @module Outwave
 * @main  Outwave
 */


define([
    './vendor/jquery-mousewheel',
    './utils',
    './style',
    './segment',
    './segment-collection'
],function(_mouseWheel,Utils,Style,Segment,SegmentCollection){


    /**
     * Main waveform viewer object
     *
     * Width and height(x,y) dimensions are used as if for horizontal orientation.
     * If you are using Outwave vertically, exchange the dimensions. Eg. the height option means width on screen.
     * 
     * @class Viewer
     * @constructor
     * @param {HTMLElement|jQuery element} container The element which the viewer will reside in
     * @param {DataFile} file    Object containing preprocessed waveform data
     * @param {Object} options   Options
     */
    var Viewer = function(container,file,options){
        var self = this; // keep this in scope
        this.zoom = options.zoom;

        container = $(container);

        this.containerEl = container.eq(0); // get first element

        this.containerEl.empty();

        this.dataFile = file;

        this.options = options;

        this.dataFile.setMono(this.options.mono);

        this.style = this.options.style;

        this.zoomChangedHnd = [];
        this.zoomFactorChangedHnd = [];

        //element with scrollbars
        this.scrollbarEl = $('<div class="viewport"></div>');
        
        Utils.setDimBase(this.scrollbarEl);

        if(this.style.vertical()){
            this.scrollbarEl.css("height","100%");
        }

        this.containerEl.append(this.scrollbarEl);



        this.segmentsEl = $('<div style="position: relative;" class="segments"></div>');
        this.segmentsEl.height(this.internalHeight());

        this.scrollbarEl.append(this.segmentsEl);



        this.backgroundEl = $('<div style="position: absolute; z-index: 0;" class="background">');

        this.foregroundEl = $('<div style="position: absolute; z-index: 5;" class="foreground">');


        this.timeSpanEl = $('<div style="width: 100%; height: 100%; position: absolute;" class="timeSpans"></div>');
        
        this.foregroundEl.append(this.timeSpanEl);


        this.cursorEl = this.options.style.cursor();
        this.cursorDim = Utils.getElementDimensions(this.cursorEl);
        this.cursorEl.css({position: "absolute", display: "none", 'z-index': 10, pointerEvents: 'none'});
        this.foregroundEl.append(this.cursorEl);


        this.updateDimensions();


        //test for pointer events
        var element = document.createElement('x');
        element.style.cssText = 'pointer-events:auto';
        var eventsWorking = element.style.pointerEvents === 'auto';

        if(!eventsWorking){
            //no pointer-events support, disable hover
            this.options.hover = false;
        }


        this.hoverEl = this.options.style.hover();
        this.hoverDim = Utils.getElementDimensions(this.hoverEl);

        this.foregroundEl.append(this.hoverEl);

        this.setHoverDisplayed(this.options.hover);
        this.hoverEl.css({position: "absolute", display: "none"/*,'z-index': '100','pointer-events': 'none'*/});


        if(this.options.hover){
            this.foregroundEl.on("mouseenter mousemove", function(event){
                event.preventDefault(); // minimize accidental selection of elements
                var pos;
                if(self.options.style.horizontal()){
                    pos = event.pageX - self.internalOffset().left;
                    if(pos >= self.internalWidth()){
                        self.scrollbarEl.triggerHandler("mouseleave");
                        return;
                    }
                    self.hoverEl.css("left",Math.floor(pos-(self.hoverDim.w/2)));
                }else{
                    pos = event.pageY - self.internalOffset().top;
                    if(pos >= self.internalWidth()){
                        self.scrollbarEl.triggerHandler("mouseleave");
                        return;
                    }
                    self.hoverEl.css("top",Math.floor(pos-(self.hoverDim.h/2)));
                }




            }).on("mouseleave",function(){
                self.hoverEl.hide();
            }).on("mouseenter",function(){
                if(self.hoverDisplayed){
                    self.hoverEl.show();
                }
            });

        }

        var mouseIsDown = false;

        this.foregroundEl.on("mousedown",function(event){
            mouseIsDown = true;
        });

        this.clickTimer = null;

        this.foregroundEl.on("mouseup",function(event){
            event.preventDefault();

            if(!mouseIsDown){
                return;
            }
            mouseIsDown = false;

            var internX;

            if(self.options.style.horizontal()){
                internX = event.pageX - self.internalOffset().left;
            }else{
                internX = event.pageY - self.internalOffset().top;
            }

            if(internX >= self.internalWidth()){
                return;
            }
            
            if(self.clickTimer){
                clearTimeout(self.clickTimer);
                self.dblClicked(self.internalXToTime(internX),event);                    
                self.clickTimer = null;
            }else{
                if(self.dblClickHnd){
                    self.clickTimer = setTimeout(function(){
                        self.clickTimer = null;
                        self.clicked(self.internalXToTime(internX),event);    
                    },300);
                }else{
                    self.clicked(self.internalXToTime(internX),event);     
                }

            }


        });


        this.scrollbarEl.prepend(this.foregroundEl);
        this.scrollbarEl.prepend(this.backgroundEl);



        var scrollTimeout=null;
        var lastRender = null;

        this.scrollbarEl.scroll(function(){


            self.handleScrolled();

            if(scrollTimeout){
                clearTimeout(scrollTimeout);
            }
            scrollTimeout = setTimeout(function(){
                lastRender = null;

               self.updateSegments();  
            },40); // redraw 40 milliseconds after scrolling stopped

        });


        this.scrollbarEl.on("mousewheel",function (e) {

      
            if(e.altKey || e.ctrlKey){
                if(e.deltaY > 0){
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

        this.handleMouseLeave = function(){

            if(this.mouseTimeout){
                clearTimeout(this.mouseTimeout);            
            }
            self.mouseTimeout = setTimeout(function(){self.isMouseOver = false;},
            self.options.autoScrollTimeout);
        };



        if(this.options.autoScrollMouseLock){
            this.scrollbarEl.on("mouseenter",this.handleMouseEnter).on('mouseleave',this.handleMouseLeave);
        }





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

        this.zoom = null;

        this.setZoom(this.options.zoom); //updates segments

        this.scrollHnd = [];

        this.isScrollLocked = false;


        this.viewportOffset = function(){
            return this.getViewportElement().offset();
        };
        if(this.options.cacheOffset){
            var cachedOffset = this.viewportOffset();

            this.viewportOffset = function(){
                return cachedOffset;
            };
        }

        this.internalOffset = function(){
            var vfs = this.viewportOffset();
            var sfs = {left: 0, top: 0};
            if(this.style.horizontal()){
                sfs.left = - this.getViewportElement()[0].scrollLeft;
            }else{
                sfs.top = - this.getViewportElement()[0].scrollTop;
            }
            var ret = {left: vfs.left + sfs.left, top: vfs.top + sfs.top};

            return ret;
        };


    };


    Viewer.prototype = {  
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
        /**
         * Internal width
         *
         * @method  internalWidth
         * @return {Number}   Internal width in pixels
         */
        internalWidth: function(){
            return Math.floor(this.dataFile.getFrameCnt() / this.zoom);
        },
        timelineHeight: function(){
            return Segment.getTimelineHeight(this.options.style);
        },
        waveformHeight: function(){
            return this.internalHeight() - this.timelineHeight();
        }, 
        /**
         * height of element minus scrollbar
         *
         * @method  internalHeight
         * @return {Number}   Height in pixels
         */        
        internalHeight: function(){

            if(this.options.height !== null){
                return this.options.height;
            }
            var scrollbar = (this.style.horizontal()?Utils.getScrollbarDim().height:Utils.getScrollbarDim().width) + 4;
            return (this.style.horizontal() ? this.scrollbarEl.height() : this.scrollbarEl.width()) - scrollbar;
        },
        /**
         * Internal, helper function forwarding scroll events to segment collection
         *
         * @method updateSegments
         */
        updateSegments: function(){
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

            if(time !== null){
                var css = {display: "block"};

                var px = this.timeToInternalX(time);

                if(this.options.style.horizontal()){
                    css.left = px - this.cursorDim.w / 2;
                }else{
                    css.top = px - this.cursorDim.h / 2;
                }

                this.cursorEl.css(css);
            }else{
                this.cursorEl.hide();
            }
        },
        /**
         * Autmatically scroll viewport so that the waveform at time is visible
         *
         * @method autoScroll
         * @param  {Number} time Time(seconds) of the next cursor position
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
            }else{
                scrollX = self.scrollbarEl.scrollTop();
            }



            if(this.style.horizontal()){   
                scrollFn = function(val){
                    return self.scrollbarEl.scrollLeft(val);
                };
            }else{
                scrollFn = function(val){
                    return self.scrollbarEl.scrollTop(val);
                };
            }




            var cursorX = this.timeToInternalX(this.cursor);


            var timeX = this.timeToInternalX(time);

            if(this.cursor === null){
                this.cursorX = timeX;
            }


            if(this.options.autoScrollType == 'smooth'){

                var targetScroll = Math.floor(x - (width * this.options.autoScrollTarget));

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



            if(this.options.autoScrollType == 'jumpy' || this.options.autoScrollType == 'jumpy-animated'){


                var scrollTo = timeX - width * this.options.autoScrollTarget;


                var tooQuick = (timeX - cursorX > (width*0.1));




                if(cursorX >= scrollX && cursorX < scrollX + width && !tooQuick){ // cursor is inside of visible area

                    if((timeX >= scrollX && timeX < scrollX + (width * this.options.autoScrollThreshold))){
                    
                        //waiting for cursor to get invisible

                    }else{

                        //animate or jump
                        //
                        //
                        
                        
                        if(this.options.autoScrollType == 'jumpy'){
                            scrollFn(scrollTo);
                        }else{
                            self.scrollbarEl.stop(); 
                            var animVal; 
                            if(this.style.horizontal()){
                                animVal = {scrollLeft: scrollTo};
                            }else{
                                animVal = {scrollTop: scrollTo};
                            }   
                            self.scrollbarEl.animate(animVal,this.options.autoScrollAnimationDuration);
                        }

                    }


                }else{
                    //jump

                    scrollFn(scrollTo);
                }            
            }


        },
        /**
         * Scroll to a certain time
         *
         * This method should only be used when setCursor is not called periodically(the media player is stopped) or autoscroll is disabled.
         *
         * @method  scrollToTime
         * @param {Number} time Player position in seconds
         * @param {Number} [positionFraction=0.5] Fraction of the viewport width, to which the time will be scrolled. 0.3 means scrolling the time to 0.3 of viewport width.
         * @param {Number} [duration] Animation duration. If not set, options.autoScrollAnimationDuration will be used;
         */
        scrollToTime: function(time, positionFraction ,duration){
            if(typeof duration === "undefined"){
                duration = this.options.autoScrollAnimationDuration;
            }
            if(typeof positionFraction ==="undefined"){
                positionFraction = 0.5;
            }
            
            var x = this.timeToInternalX(time);
            var width = ( this.style.horizontal() ? this.scrollbarEl.width() : this.scrollbarEl.height() );
            var fracWidth = width * positionFraction;
            var scrollTo = x - fracWidth;
            var animVal; 
            if(this.style.horizontal()){
                animVal = {scrollLeft: scrollTo};
            }else{
                animVal = {scrollTop: scrollTo};
            }   
            this.scrollbarEl.stop(true,true).animate(animVal,duration);           
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
            if(this.options.autoScroll && !this.isMouseOver && !this.isScrollLocked){
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
        },
        /**
         * Fires configurable click handler
         *
         * @method  clicked
         * @param  {Number} time Position in seconds computed from mouse coordinates
         * @param {MouseEvent} mouseEvent Mouse event
         */
        clicked: function(time,mouseEvent){
            if(this.clickHnd){
                this.clickHnd(time,mouseEvent);
            }
        },
         /**
         * Sets (replaces) double click handler
         *
         * @method  onDblClick
         * @param  {Function} handler accepting time in seconds as an argument
         */       
        onDblClick: function(fn){
            this.dblClickHnd = fn;
        },
        /**
         * Fires configurable double click handler
         *
         * @method  dblClicked
         * @param  {Number} time Position in seconds computed from mouse coordinates
         * @param {MouseEvent} mouseEvent Mouse event
         */
        dblClicked: function(time,mouseEvent){
            if(this.dblClickHnd){
                this.dblClickHnd(time,mouseEvent);
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
        },
        /**
         * Set scroll position
         * @param  {Number} pos New scroll position in pixels
         */
        scroll: function(pos){
            if(this.style.horizontal()){
                this.scrollbarEl.scrollLeft(pos);
            }else{
                this.scrollbarEl.scrollTop(pos);
            }
        },
        /**
         * Add handler for scroll change
         * @method  onScroll
         * @param  {Function} fn Accepts 1 argument: scrollPos (pixels) 
         */
        onScroll: function(fn){
            this.scrollHnd.push(fn);
        },
        /**
         * Call scroll event handlers
         * @method  handleScrolled
         */
        handleScrolled: function(){
            var pos;

            

            
            if(this.style.horizontal()){
                pos = this.scrollbarEl.scrollLeft();
            }else{
                pos = this.scrollbarEl.scrollTop();
            }
            var i;
            for(i in this.scrollHnd){
                this.scrollHnd[i](pos);
            }
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
            var cur = this.zoom;
            this._zoomIn(mult);
            if(cur !== this.zoom){
                this.setTimeInMiddle(time);
            
                this.handleZoomed();
            }
        },
        /**
         * Zoom out
         *
         * @method  zoomOut
         * @param  {Number} div Factor by which to divide current zoom
         */
        zoomOut: function(div){

            var time = this.getTimeInMiddle();
            var cur = this.zoom;
            this._zoomOut(div);
            if(cur !== this.zoom){
                this.setTimeInMiddle(time);
                this.handleZoomed();
            }
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
        normalizeZoom: function(zoom){
            if(this.options.maxZoom !== null){
                zoom = Math.min(zoom,this.options.maxZoom);
            }

            if(this.options.minZoom !== null){
                zoom = Math.max(zoom,this.options.minZoom);
            }
            return zoom;
        },
        //internal use, doesn't fire event handlers
        _setZoom: function(zoom){
            zoom = this.normalizeZoom(zoom);
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
            zoom = this.normalizeZoom(zoom);
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
         * @method getTimeFromMouseCoords
         * @param  {Number} pageX X coordinate relative to page
         * @param  {Number} pageY Y coordinate relative to page
         * @return {Number}       Time in seconds
         */
        getTimeFromMouseCoords: function(pageX, pageY){
            var ofs = this.viewportOffset();  
            if(this.style.horizontal()){
                pos = this.scrollbarEl.scrollLeft() + pageX - ofs.left;
            }else{
                pos = this.scrollbarEl.scrollTop() + pageY - ofs.top;
            }

            return this.internalXToTime(pos);       
        },
        /**
         * Scroll to time at mouse coordinates
         * @method setTimeAtMouseCoords
         * @param  {Number} time Time in seconds
         * @param  {Number} pageX X coordinate relative to page
         * @param  {Number} pageY Y coordinate relative to page
         */
        setTimeAtMouseCoords: function(time,pageX,pageY){
            var ofs = this.viewportOffset();
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
         * @method getTimeInMiddle
         * @return {Number} Time in seconds
         */
        getTimeInMiddle: function(){
            var pos;
            if(this.style.horizontal()){
                pos = this.scrollbarEl.scrollLeft() + this.scrollbarEl.width() / 2;
            }else{
                pos = this.scrollbarEl.scrollTop() + this.scrollbarEl.height() / 2;
            }

            return this.internalXToTime(pos);
        },
        /**
         * Scroll viewport so that the middle is on time, no animation is used
         * @method setTimeInMiddle
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
            var cur = this.zoom;
            zoomFn.call(this);

            if(cur !== this.zoom){ // zoom value actually changed
                //set viewport scroll so that time is under cursor
                this.setTimeAtMouseCoords(time,this.lastMouseEvent.pageX, this.lastMouseEvent.pageY);

                this.handleZoomed();   

                this.handleScrolled();    
            }    
            
        },

        //internal use, doesn't fire event handlers
        _setZoomFactor: function(zoom){
            if(zoom === this.zoom){
                return;
            }
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
         * Min and max values are not considered
         * @method  setZoomFactor
         * @param {Number} zoom Zoom factor
         */
        setZoomFactor: function(zoom){
            if(zoom === this.zoom){
                return;
            }
            this._setZoomFactor(zoom);

            this.handleZoomed();
        },
        /**
         * Set event handler for zoom changes
         *
         * @method  onZoomed
         * @param  {Function} fn Event handler accepting zoom(pixels per second) and waveform length(pixels) as arguments
         */
        onZoomed: function(fn){
            this.zoomChangedHnd.push(fn);
        },
        /**
         * Fire zoom change events
         *
         * @method  handleZoomed
         */
        handleZoomed: function(){

            this.segments.setZoom(this.zoom); // changes container length
            this.updateCursor();
            var i;
            if(this.zoomChangedHnd){
                for(i in this.zoomChangedHnd){
                    this.zoomChangedHnd[i](this.getZoom(),this.internalWidth());
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
         * @method  onZoomFactorChanged
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
            if(this.options.mono === on){
                return;
            }
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
        },
        /**
         * Display position line under mouse cursor?
         * @method setHoverDisplayed
         * @param {Boolean} isDisplayed Whether to display hover or not
         */
        setHoverDisplayed: function(isDisplayed){
            this.hoverDisplayed = isDisplayed;
            if(!this.options.hover){
                //hover is disabled completely
                isDisplayed = false;
            }
            this.hoverEl.css({"display": isDisplayed ? 'block' : 'none'});
        },

        /**
         * Disable autoscroll
         *
         * @method setScrollLocked
         * @param {Boolean} locked Disable autoscroll?
         */
        setScrollLocked: function(locked){
            this.isScrollLocked = locked;
        }

    };

    return Viewer;

});
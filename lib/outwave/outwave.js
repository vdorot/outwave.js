/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
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
        autoScrollType: 'jerky', // smooth or jerky
        autoScrollTimeout: 800, // milliseconds
    };




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


        this.style = this.options.style;

        this.zoomChangedHnd = new Array();


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

        var scrollTimeout=null;
        var lastRender = 0;
        this.scrollbarEl.scroll(function(){
            if(!self.loaded){
                return;
            }
            if(scrollTimeout){
                clearTimeout(scrollTimeout);
            }

            scrollTimeout = setTimeout(function(){
                lastRender = (new Date()).getTime();

                self.scrolledTo(self.scrollbarEl.scrollLeft());    
            },30);

        });




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
            self.clicked(self.internalXtoTime(internX));     
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
                if(e.deltaY > 0){
                    self.zoomIn();
                }else{
                    self.zoomOut();
                }
                e.preventDefault();
            }
            return true;
            
        });



        this.cursor = null;





        this.handleMouseEnter = function(){
            if(self.mouseTimeout){
                clearTimeout(self.mouseTimeout);
            }
           self.isMouseOver = true;
        }

        this.handleMouseLeave = function(event){

            if(this.mouseTimeout){
                clearTimeout(this.mouseTimeout);            
            }
            self.mouseTimeout = setTimeout(function(){self.isMouseOver = false;},
            self.options.autoScrollTimeout);
        }

       this.scrollbarEl.on("mouseenter",this.handleMouseEnter).on('mouseleave',this.handleMouseLeave);




        var segmentFactory = function(container){
                var segment = new Segment(self.dataFile,container,self.internalHeight(),self.style);

                return segment;
        }

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

        this.setZoom(this.zoom);



    }


    Outwave.prototype = {

        getDefaultOptions: function(){


            return defaultOptions;

        },
        timeToInternalX: function(time){
            return Math.floor(time*this.dataFile.sampleRate/this.zoom);
        },
        timeToOuterX: function(time){
            return this.timeToInternalX(time)-this.scrollbarEl.scrollLeft();
        },
        internalXtoTime: function(x){
            return (x)*this.zoom/this.dataFile.sampleRate;
        },
        outerXtoTime: function(x){
            return (this.scrollbarEl.scrollLeft()+x)*this.zoom/this.dataFile.sampleRate;
        },
        internalWidth: function(){
            return Math.floor(this.dataFile.frames/this.zoom);
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
        scrolled: function(){
            var position;
            if(this.style.horizontal()){
                position = this.scrollbarEl.scrollLeft();
            }else{
                position = this.scrollbarEl.scrollTop();
            }
            this.segments.scrollTo(position);

        },
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

                if(((cursorX >= scrollX && cursorX < scrollX + width)) // cursor is outside of visible area
                    && (timeX >= scrollX && timeX < scrollX + width)){
                    
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

                    console.log('scrolledto ',scrollTo);


                }else{
                    //console.log('scrolling to',targetScroll);
                    scrollFn(targetScroll);

                }
            }

            if(this.options.autoScrollType == 'jerky'){
                if(((cursorX >= scrollX && cursorX < scrollX + width)) // cursor is inside of visible area
                    && (timeX >= scrollX && timeX < scrollX + width)){
                    
                    
                    //waiting for cursor to get invisible




                }else{

                    /* Bugs!
                    var anim = {};
                    if(this.style.horizontal()){
                        anim.scrollLeft = timeX;
                    }else{
                        anim.scrollTop = timeX;
                    }

                    this.scrollbarEl.stop().animate(anim,Math.abs(scrollX - timeX)/10,'linear');
                    */

                    scrollFn(timeX);
                }            
            }


        },

        setCursor: function(time){    
            var maxTime = this.dataFile.frames/this.dataFile.sampleRate;
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
        removeCursor: function(time){
            this.cursor = null;
            this.updateCursor();
            this.segments.removeCursor();
            this.cursorEl.hide();
        },
        onClick: function(fn){
            this.clickHnd = fn;
            return this;
        },
        clicked: function(time){
            if(this.clickHnd){
                this.clickHnd(time);
            }
        },
        zoomIn: function(){
            this.setZoom(Math.max(1,Math.ceil(this.zoom/2)));
        },
        zoomOut: function(){
            this.setZoom(this.zoom*2);
        },
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
        onInternalDimensionsChanged: function(fn){
            this.internalDimensionsChangedFn = fn;
        },
        getZoom: function(){
            return this.zoom;
        },
        setZoom: function(zoom){

            //TODO: if mouse is above element, zoom towards it
            if(this.style.horizontal()){
                var pos = this.scrollbarEl.scrollLeft() + this.scrollbarEl.width() / 2;
            }else{
                var pos = this.scrollbarEl.scrollTop() + this.scrollbarEl.height() / 2;
            }

            var time = this.internalXtoTime(pos);

            this.zoom = zoom;
            this.updateDimensions();


            this.segments.setZoom(this.zoom); // changes container length

            if(this.style.horizontal()){

                var pos = this.timeToInternalX(time) - this.scrollbarEl.width() / 2;

                this.scrollbarEl.scrollLeft(pos);

            }else{
                var pos = this.timeToInternalX(time) - this.scrollbarEl.height() / 2;
                this.scrollbarEl.scrollTop(pos);            
            }
            this.handleZoomChanged();
        },

        //add event handler for zoom change
        onZoomChanged: function(fn){
            this.zoomChangedHnd.push(fn);
        },
        handleZoomChanged: function(){
            if(this.zoomChangedHnd){
                for(i in this.zoomChangedHnd){
                    this.zoomChangedHnd[i](this.zoom);
                }
            }
        },
        getViewportElement: function(){
            return this.scrollbarEl;
        }
        ,getTimeSpanContainers: function(){
            return {back: this.backgroundEl,front: this.timeSpanEl};
        },
        getDataFile: function(){
            return this.dataFile;
        },
        getStyle: function(){
            return this.options.style;
        }

    };

    return Outwave;

});

/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/


define([
],function(){

    getOffset = function( elem ) {

        return $(elem).offset();
    };

    /**
     * @module TimeSpan
     */

    /**
     * Mixin that adds dragging capability to time spans
     *
     * @class Draggable
     * @extensionfor TimeSpan
     * @constructor
     * @param {TimeSpan} span            Time span
     * @param {Viewer} viewer Viewer instance
     * @param {Style} style           Style object
     */
    var Draggable = function(span,viewer,style){


        var viewportElement = viewer.getViewportElement();

        var ext = function(){

            var self = this;


            this.scrollingSpeed=0.5; // factor of distance per second

            this.setScrollingSpeed = function(speed){
                this.scrollingSpeed = speed;
            };


            this.scrollCursorX;
            this.scrollCursorY;

            this.scrollTimer = null;

            this.tickPeriod = 50;

            /*
            Auto scrolling when dragging outside of viewport
             */
            this.tickScroll = function(){

                var offset = getOffset(viewportElement);
                var width = viewportElement.width();
                var height = viewportElement.height();

                var diff = 0;

                if(style.horizontal()){
                    if(self.scrollCursorX < offset.left){
                        diff = self.scrollCursorX - offset.left;
                    } 

                    if(self.scrollCursorX > offset.left + width){
                        diff = self.scrollCursorX - (offset.left + width);
                    }

                    diff = diff * self.scrollingSpeed * self.tickPeriod / 1000;

                    viewportElement.scrollLeft(viewportElement.scrollLeft()+diff);

                }else{
                    if(self.scrollCursorY < offset.top){

                        diff = self.scrollCursorY - offset.top;
                    } 

                    if(self.scrollCursorY > offset.top + height){
                        diff = self.scrollCursorY - (offset.left + height);
                    }

                    diff = diff * self.scrollingSpeed * self.tickPeriod / 1000;

                    viewportElement.scrollTop(viewportElement.scrollTop()+diff);

                }

                self.scrollTimer = setTimeout(self.tickScroll,self.tickPeriod);
            };


            this.startAutoScroll = function(){
                if(this.scrollTimer!==null){
                    return;
                }
                this.scrollTimer=setTimeout(this.tickScroll,this.tickPeriod);
            };

            this.stopAutoScroll = function(){
                if(this.scrollTimer!==null){
                    clearTimeout(this.scrollTimer);
                }
                this.scrollTimer = null;
            };


            var dragHandler = function(e,isStart){

                e.preventDefault();

                var parent = $(this).parent();

                var ofs = getOffset(parent[0]);

                var startPos;
                if(self.style.horizontal()){
                    startPos = e.pageX - ofs.left;
                }else{
                    startPos = e.pageY - ofs.top;
                }


                if(self.style.horizontal()){
                    $('body').addClass('drag-horizontal');
                }else{
                    $('body').addClass('drag-vertical');
                }

                $('body').data('waveform-dragging',true);

                viewer.setHoverDisplayed(false);


                var prevPagePos = null;



                var lastMouseEvent;


                var moveHandler = function(e){
                    if(e.event){
                        e = $.event.fix(e);
                        e.stopPropagation();
                    }

                    lastMouseEvent = { // cursor position needed when updating on scrolling
                        pageX: e.pageX,
                        pageY: e.pageY
                    };

                    
                    self.scrollCursorX = e.pageX;
                    self.scrollCursorY = e.pageY;


                    var element = document.elementFromPoint(e.pageX - window.pageXOffset, e.pageY - window.pageYOffset);


                    if(element && (self.foregroundContainer[0] == element || self.foregroundContainer.has(element).length !== 0)){
                        self.stopAutoScroll();
                    }else{
                        self.startAutoScroll();
                    }



                    var ofs = getOffset(parent[0]);

                    var endPos;
                    if(typeof e.pageX == 'undefined'){
                        if(self.style.horizontal()){
                            endPos = prevPagePos - ofs.left;
                        }else{
                            endPos = prevPagePos - ofs.top;
                        }
                    }else{

                        if(self.style.horizontal()){
                            endPos = e.pageX - ofs.left;
                            prevPagePos = e.pageX;
                        }else{
                            endPos = e.pageY - ofs.top;
                            prevPagePos = e.pageY;
                        }
                    }
                    

                    var sDim = self.getStartDimensions();

                    var eDim = self.getEndDimensions();

                    var elemSize; // pixel size of starting and ending element

                    if(style.horizontal()){
                        elemSize = sDim.w + eDim.w;
                    }else{
                        elemSize = sDim.h + sDim.h;
                    }

                    elemSize = self.dataFile.px2time(elemSize,self.zoom);

                    var time = self.dataFile.px2time(endPos,self.zoom);

                    var limits;
                    if(isStart){
                        limits = self.getStartLimits();



                        if(self.getEnd() - limits.e < elemSize){
                            limits.e = self.getEnd() - elemSize;
                        }


                        if(limits.e < limits.s){
                            limits.e = limits.s;
                        }

                        time = self.applyInterval(limits,time);
                        if(time !==null){
                            self.setStart(time);
                        }
                    }else{
                        limits = self.getEndLimits();

                        if(limits.s - self.getStart() < elemSize){
                            limits.s = self.getStart() + elemSize;
                        }

                        if(limits.s > limits.e){
                            limits.s = limits.e;
                        }


                        time = self.applyInterval(limits,time);
                        if(time !==null){
                            self.setEnd(time);
                        }
                    }

                    return false;

                };

                viewportElement.on("scroll.spandragging",function(){
                    moveHandler(lastMouseEvent);
                });


                var scrollElement = $(this).closest(".waveform-viewport");
                scrollElement.on('scroll.timeSpan',moveHandler);

                $(document)[0].addEventListener('mousemove',moveHandler,true); // event capturing >=IE9


                var upHandler = function(e){

                    self.stopAutoScroll();
                    viewportElement.off("scroll.spandragging");

                    e = $.event.fix(e);
                    e.stopPropagation();
                    $(document)[0].removeEventListener('mouseup',upHandler,true);
                    $(document)[0].removeEventListener('mousemove',moveHandler,true);
                    $('body').removeClass('drag-horizontal').removeClass('drag-vertical');
                    scrollElement.off('scroll.timeSpan');
                    $('body').data('waveform-dragging',false);
                    viewer.setHoverDisplayed(true);
                };

                $(document)[0].addEventListener('mouseup',upHandler,true); // event capturing >=IE9
            };


            this.getStartElement().mousedown(function(e){dragHandler.call(this,e,true);});
            this.getEndElement().mousedown(function(e){dragHandler.call(this,e,false);});

            var hideHover = function(){
                if($('body').data('waveform-dragging')){
                    return;
                }
                viewer.setHoverDisplayed(false);
            };

            var showHover = function(){
                if($('body').data('waveform-dragging')){
                    return;
                }
                viewer.setHoverDisplayed(true);
            };

            $(this.getStartElement()).on('mouseenter',hideHover);
            $(this.getEndElement()).on('mouseenter',hideHover);

            $(this.getStartElement()).on('mouseleave',showHover);
            $(this.getEndElement()).on('mouseleave',showHover);


        };


        ext.call(span);


    };

    return Draggable;
});
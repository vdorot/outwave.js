/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/


define([
'jquery'
],function($){

    getOffset = function( elem ) {

        return $(elem).offset();
    };


    var Draggable = function(span,viewportElement,style){


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

            var self = this;

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

                if(self.style.horizontal()){
                    var startPos = e.pageX - ofs.left;
                }else{
                    var startPos = e.pageY - ofs.top;
                }


                if(self.style.horizontal()){
                    $('body').addClass('drag-horizontal');
                }else{
                    $('body').addClass('drag-vertical');
                }

                $('body').data('waveform-dragging',true);

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

                    //console.log(element == self.foregroundContainer[0]);

                    if(element && (self.foregroundContainer[0] == element || self.foregroundContainer.has(element).length != 0)){
                        self.stopAutoScroll();
                    }else{
                        self.startAutoScroll();
                    }



                    var ofs = getOffset(parent[0]);

                    if(typeof e.pageX == 'undefined'){
                        if(self.style.horizontal()){
                            var endPos = prevPagePos - ofs.left;
                        }else{
                            var endPos = prevPagePos - ofs.top;
                        }
                    }else{

                        if(self.style.horizontal()){
                            var endPos = e.pageX - ofs.left;
                            prevPagePos = e.pageX;
                        }else{
                            var endPos = e.pageY - ofs.top;
                            prevPagePos = e.pageY;
                        }
                    }
                    



                    var time = self.xToTime(endPos);

                    if(isStart){
                        var limits = self.getStartLimits();
                        time = self.applyInterval(limits,time);
                        if(time !==null){
                            self.setStart(time);
                        }
                    }else{
                        var limits = self.getEndLimits();
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

                //also suppress mouseneter event

                var upHandler = function(e){

                    self.stopAutoScroll();
                    viewportElement.off("scroll.spandragging");

                    e = $.event.fix(e);
                    e.stopPropagation();
                    $(document)[0].removeEventListener('mouseup',upHandler,true);
                    $(document)[0].removeEventListener('mousemove',moveHandler,true);
                    $('body').removeClass('drag-horizontal').removeClass('drag-vertical');
                    scrollElement.off('scroll.timeSpan');
                };

                $(document)[0].addEventListener('mouseup',upHandler,true); // event capturing >=IE9
            };


            this.getStartElement().mousedown(function(e){dragHandler.call(this,e,true);});
            this.getEndElement().mousedown(function(e){dragHandler.call(this,e,false);});


            //autoscrolling
            // use getelementfrompoint, check if foreground is parent of element below cursor
            // if not, check if cursor is above or below viewport, scroll accordingly


        };


        ext.call(span);


    };

    return Draggable;
});
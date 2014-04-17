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
     * Various utilities
     *
     * @class Utils
     * @static
     */
    var Utils = new function(){

        this.scrollbarDim = null;

        this.dimBase = null;

        this.setDimBase = function(element){ //set parent element for dimension measurement
            this.dimBase = $(element);
        }

        this.getElementDimensions = function(element){
            var e = $(element).clone();
            e.css({position: "absolute"/*,visibility: "hidden"*/});

            var base = $(document.body);
            if(this.dimBase){
                base = this.dimBase;
            }
            base.prepend(e);

            var dim = [];

            dim.h = e.outerHeight();
            dim.w = e.outerWidth();

            dim.push(dim.w);
            dim.push(dim.h);

            e.remove();
            return dim;
        };

        /*Calculate native scrollbar dimensions using the fact, taht you cannot scroll further than the element allows*/
        this.getScrollbarDim = function(){
            if(!this.scrollbarDim){
                var elem=$('<div style="position: absolute; width: 100px; height: 100px; overflow: auto; visibility: hidden;"><div style="width: 200px; height: 200px;"></div></div>');
                $(document.body).prepend(elem);
                elem.scrollTop(500);
                var vScroll = elem.scrollTop();
                elem.scrollLeft(500);
                var hScroll = elem.scrollLeft();
                elem.remove();
                //100 = parent.height - child.height
                this.scrollbarDim = {height: vScroll - 100, width: hScroll - 100};
            }
            return this.scrollbarDim;
        };

        this.zeroPaddedTime = function(time){


            var zeroPad = function(num, places) {
              var zero = places - num.toString().length + 1;
              return Array(+(zero > 0 && zero)).join("0") + num;
            }

            var hrs = Math.floor(time / 3600);

            var mins = Math.floor((time - hrs * 3600) / 60);

            var secs = Math.floor(time - hrs * 3600 - mins*60 );

            var millis = Math.floor((time - Math.floor(time))*10);

            return zeroPad(hrs,2)+':'+zeroPad(mins,2)+':'+zeroPad(secs,2)+'.'+zeroPad(millis,1);
          
        }

        this.formatTime = function(time){

            var zeroPad = function(num, places) {
              var zero = places - num.toString().length + 1;
              return Array(+(zero > 0 && zero)).join("0") + num;
            }

            //time = 59*60*60+59*60+59+0.999;


            var hrs = Math.floor(time / (60*60));

            var mins = Math.floor((time - hrs*60*60) / 60);

            var secs = Math.floor(time - hrs*60*60 - mins*60);

            var millis  = Math.round((time - Math.floor(time))*1000)/1000;


            var ret = '';

            if(hrs != 0){
                ret+=hrs+':';
            }

            if(mins!=0){
                var pad = 2;
                if(hrs == 0){
                    pad = 1;
                }
                ret+=zeroPad(mins,pad)+':';
            }

            var pad = 2;
            if(hrs == 0 && mins == 0){
                pad = 1;
            }
            ret+=zeroPad(secs,pad);

            millis = millis.toString().slice(2);

            if(millis != ''){
                ret+='.'+millis;
            }


            return ret;

        };


    }();

    return Utils;
});
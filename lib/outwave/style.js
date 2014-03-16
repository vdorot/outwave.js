/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

define(['jquery','./utils'],function($,Utils){

    var Style = function(){

        this.ORIENTATION_HORIZONTAL = 1;
        this.ORIENTATION_VERTICAL = 2;

        this.orientation = this.ORIENTATION_VERTICAL;
        //this.orientation = this.ORIENTATION_HORIZONTAL;

        this.horizontal = function(){return this.orientation == this.ORIENTATION_HORIZONTAL;};
        this.vertical = function(){return this.orientation == this.ORIENTATION_VERTICAL;};


        this.timelineMarker = function(time){
                var text = $("<span></span>").text(Utils.formatTime(time));
                return $('<div class="timeline-marker"></div>').append(text);
        };

        this.cursor = function(time){
                return $('<div class="cursor"></div>').click(function(){alert('cursor click');});
        };

        this.hover = function(time){
                return $('<div class="hover"></div>');
        };

        this.timeSpanStart = function(){
            return $('<div class="timespan-start"></div>');
        };

        this.timeSpanEnd = function(){
            return $('<div class="timespan-end"></div>');
        };

        this.timeSpanDividerElement = function(){
            return $('<div class="timespan-end"></div>');
        };    

        this.timeSpanBackground = function(){
            return $('<div class="timespan-back"><div></div></div>');
        };

        this.waveformFill = function(ctx,p1,p2,channel,played){

            //channel: channel id (0..n-1)
            //played: this part has been played, cursor is further
            var grad = ctx.createLinearGradient(p1.x,p1.y,p2.x,p2.y);
                if(played){
                    if(channel == 0){
                        grad.addColorStop(0, '#fff');
                        grad.addColorStop(1, '#ff0000');
                    }else{
                        grad.addColorStop(0, '#fff');
                        grad.addColorStop(1, '#0000ff');
                    }
                }else{
                    if(channel == 0){
                        grad.addColorStop(0, '#fff');
                        grad.addColorStop(1, '#00ABEB');
                    }else{
                        grad.addColorStop(0, '#fff');
                        grad.addColorStop(1, '#66CC00');
                    }               
                }
                return grad;
        };

        return this;
    };

    return Style;
});


/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

define(['./utils'],function(Utils){

    /**
     * @module Outwave
     */


    /**
     * Default styling options
     *
     *
     * @class Style
     * @constructor
     */
    var Style = function(){

        this.ORIENTATION_HORIZONTAL = 1;
        this.ORIENTATION_VERTICAL = 2;

        //this.orientation = this.ORIENTATION_VERTICAL;
        this.orientation = this.ORIENTATION_HORIZONTAL;

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

        this.waveformFill = function(ctx,p1,p2,channel,channelCnt,played){

            //channel: channel id (0..n-1)
            //played: this part has been played, cursor is further
            var grad = ctx.createLinearGradient(p1.x,p1.y,p2.x,p2.y);
                if(played){
                    if(channel === 0){
                        grad.addColorStop(0, '#6ED7FF');
                        grad.addColorStop(1, '#00A0DB');
                    }else{
                        grad.addColorStop(0, '#B0FF61');
                        grad.addColorStop(1, '#69D100');
                    }
                }else{
                    if(channel === 0){
                        grad.addColorStop(0, '#6ED7FF');
                        grad.addColorStop(1, '#0084B5');
                    }else{
                        grad.addColorStop(0, '#B0FF61');
                        grad.addColorStop(1, '#57AD00');
                    }               
                }
                return grad;
        };

        this.error = function(message){
            return ($('<div class="center"></div>').append($('<div class="centerm">').append($('<div class="error"></div>').text(message))));
        };

        this.loading = function(){
            return ($('<div class="center"></div>').append($('<div class="centerm">').append($('<div class="loading"></div>'))));            
        };

        this.zoomInControl = function(){
            return $('<div class="control zoom-in"><a title="Zoom In" href="#">+</a>');
        };

        this.zoomOutControl = function(){
            return $('<div class="control zoom-out"><a title="Zoom Out" href="#">-</a>');
        };

        this.lockPositionControl = function(){
            return $('<div class="control lock-position"><a href="#">Lock position</a>');
        };

        this.channelsControl = function(){
            return $('<div class="control channels"><a href="#">Channels</a>');
        };

        return this;
    };

    return Style;
});


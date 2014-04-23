/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

/**
 * @module Outwave
 * @main  Outwave
 */

define(
    [], //TODO: add timespans if necessary
    function(){


        /**
         * Adds control buttons to waveform viewer
         *
         * Use without new keyword
         * 
         * @class Controls
         * @constructor
         * @param {HTMLElement|jQuery element} container Container element
         * @param {Viewer} viewer    Waveform viewer instance
         * @param {Style} style     Style options
         */
        var Controls = function(container,viewer,style){

            var controls = $('<div class="controls"></div>');

            var zoomIn = style.zoomInControl();

            var zoomOut = style.zoomOutControl();

            var lockPosition = style.lockPositionControl();

            var channels = style.channelsControl();


            controls.append(zoomIn,zoomOut);


            if(viewer.options.autoScroll){
                controls.append(lockPosition);
            }

            if(viewer.getDataFile().getChannelCnt() > 1){
                controls.append(channels);
                channels.addClass('left-3');
                lockPosition.addClass('left-4');
            }

            container.prepend(controls);

            if(style.vertical()){
                var margin = viewer.timelineHeight();
                controls.css('left',margin);
            }



            var zoomInCont = zoomIn;
            if(zoomIn.find('a').length){
                zoomIn = zoomIn.find('a');
            }

            var zoomOutCont = zoomOut;
            if(zoomOut.find('a').length){
                zoomOut = zoomOut.find('a');
            }

            if(lockPosition.find('a').length){
                lockPosition = lockPosition.find('a');
            }

            if(channels.find('a').length){
                channels = channels.find('a');
            }


            zoomIn.click(function(event){
                event.preventDefault();
                viewer.zoomIn();
            });

            zoomOut.click(function(event){
                event.preventDefault();
                viewer.zoomOut();
            });


            viewer.onZoomed(function(zoomVal){

                zoomInCont.add(zoomOutCont).removeClass('disabled');
                if(viewer.options.maxZoom === zoomVal){
                    zoomInCont.addClass('disabled');
                }
                if(viewer.options.minZoom === zoomVal){
                    zoomOutCont.addClass('disabled');
                }
            });

            var channelsAll = "Mix channels to mono";
            var channelsMono = "Show all channels";

            if(viewer.options.mono){
                channels.attr('title',channelsMono).addClass('mono');
            }else{
                channels.attr('title',channelsAll);
            }



            channels.click(function(event){
                event.preventDefault();
                if($(this).hasClass('mono')){
                    $(this).removeClass('mono').attr('title',channelsAll);
                    viewer.setMono(false);
                }else{
                    $(this).addClass('mono').attr('title',channelsMono);
                    viewer.setMono(true);
                }
            });


            var lockTitle = "Autoscroll enabled";

            lockPosition.click(function(event){
                event.preventDefault();
               if($(this).hasClass('locked')){
                $(this).attr('title',lockTitle);
                viewer.setScrollLocked(false);
               }else{
                $(this).attr('title','Position locked');
                viewer.setScrollLocked(true);
               }
               $(this).toggleClass('locked');
            });

            lockPosition.attr('title',lockTitle);

            controls.children().on('mouseenter',function(){
                viewer.handleMouseEnter();
            });

            controls.children().on('mouseleave', function(){
                viewer.handleMouseLeave();
            });


        };

        return Controls;



    }
);
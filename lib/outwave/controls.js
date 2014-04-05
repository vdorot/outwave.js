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




            controls.append(zoomIn,zoomOut,lockPosition);

            container.prepend(controls);

            if(style.vertical()){
                var margin = viewer.timelineHeight();
                controls.css('left',margin);
            }




            if(zoomIn.find('a').length){
                zoomIn = zoomIn.find('a');
            }

            if(zoomOut.find('a').length){
                zoomOut = zoomOut.find('a');
            }

            if(lockPosition.find('a').length){
                lockPosition = lockPosition.find('a');
            }

            console.log(lockPosition);

            zoomIn.click(function(event){
                event.preventDefault();
                viewer.zoomIn();
            });

            zoomOut.click(function(event){
                event.preventDefault();
                viewer.zoomOut();
            });

            lockPosition.click(function(event){
                event.preventDefault();
               if($(this).hasClass('locked')){
                $(this).attr('title','Lock view');
                viewer.setScrollLocked(false);
               }else{
                $(this).attr('title','Unlock view');
                viewer.setScrollLocked(true);
               }
               $(this).toggleClass('locked');
            });

            lockPosition.attr('title','Lock view');

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
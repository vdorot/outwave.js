/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

define([
'../utils',
'./time-span-error'
],function(Utils,TimeSpanError){

    /**
     * Adds support for marking time spans(segments) of waveform
     * 
     * @module TimeSpan
     * @main TimeSpan
     */


    /**
     * Represents time span
     *
     * Abstract class - use subclasses
     *
     * @class TimeSpan
     * @constructor
     * @param {TimeSpanCollection} collection collection object
     * @param {DataFile} dataFile Waveform data
     * @param {jQuery element} backgroundContainer Container element behind waveform
     * @param {jQuery element} foregroundContainer Container element above waveform
     * @param {Style} style Style object
     */
    var TimeSpan = function(collection, dataFile, backgroundContainer, foregroundContainer, style){

        this.zoom = null;

        this.dataFile = dataFile;

        this.collection = collection;

        this.backgroundContainer = backgroundContainer;

        this.foregroundContainer = foregroundContainer;

        this.style = style;

        this.start = null;

        this.end = null;

        this.prev = null;
        this.next = null;

        this.rendered = false;

        this.startEl;
        this.endEl;
        this.backEl;

        this.utils = Utils; //TODO: refactor


        this.splitFn;

        this.mergedFn;

        this.minLength = 0;

        this.data = null;

    }


    TimeSpan.prototype = {
        /**
         * Get back reference to collection
         *
         * @method  getCollection
         * @return {TimeSpanCollection} Time span collection
         */
        getCollection: function(){
            return this.collection;
        },
        /**
         * adds arbitrary data to span
         *
         * @method  setData
         * @param {Object} data Any data
         */
        setData: function(data){
            this.data = data;
        },
        /**
         * Get data associated with this time span
         *
         * @method  getData
         * @return {Object} Saved data
         */
        getData: function(){
            return this.data;
        },
        /**
         * Set event handler for splitting time spans
         * 
         * prevSpan - Time span created to the left of splitting position
         * nextSpan - Time span created to the right of splitting position
         *
         * @method  onSplit
         * @param  {Function} fn Function(prevSpan, nextSpan)
         */
        onSplit: function(fn){
            this.splitFn = fn;
        },
        /**
         * Fire event handler
         *
         * @method  handleSplit
         * @param  {TimeSpan} prevSpan Time span created to the left of splitting position
         * @param  {TimeSpan} nextSpan Time span created to the right of splitting position
         */
        handleSplit: function(prevSpan,nextSpan){
            if(this.splitFn){
                this.splitFn(prevSpan,nextSpan);
            }
        },
        /**
         * Set event handler for merging
         *
         * prevSpan - Time span that was merged with this object
         * createdSpan - New time span created as a result of merging
         *
         * @method  onMerged
         * @param  {Function} fn Function(prevSpan,createdSpan)
         */
        onMerged: function(fn){
            this.mergedFn = fn;
        },
        /**
         * Fire event handler
         *
         * @method  handleMerged
         * @param  {[type]} prevSpan    Time span that was merged with this object
         * @param  {[type]} createdSpan New time span created as a result of merging
         */
        handleMerged: function(prevSpan,createdSpan){
            if(this.mergedFn){
                this.mergedFn(prevSpan,createdSpan);
            }
        },
        /**
         * Get minimum length of span
         *
         * @method  getMinLength
         * @return {[type]} [description]
         */
        getMinLength: function(){
            return this.minLength;
        },
        /**
         * Set minimum length of span
         * @method  setMinLength
         * @param {Number} length Length in seconds
         */
        setMinLength: function(length){
            this.minLength = length;
        },
        /**
         * Sets previous span in linked list
         *
         * This function should not be used directly, use collection methods instead
         *
         * @method  setPrev
         * @param {TimeSpan} prev Previous span
         */
        setPrev: function(prev){
            this.prev = prev;
        },
        /**
         * Sets next span in linked list
         *
         * This function should not be used directly, use collection methods instead
         * @method  setNext
         * @param {TimeSpan} next Next span
         */        
        setNext: function(next){
            this.next = next;
        },
        /**
         * Returns previous span in linked list
         *
         * @method  getPrev
         * @return {TimeSpan} Peevious span
         */
        getPrev: function(){
            return this.prev;
        },
        /**
         * Returns next span in linked list
         *
         * @method  getNext
         * @return {TimeSpan} Next span
         */
        getNext: function(){
            return this.next;
        },

        //interval: {s:0,e:1}
        /**
         * Compute the interseciton of 2 intervals
         *
         * Interval are represented as an object:
         *
         *  {s: Number, e: Number}
         *
         *  s - start
         *
         *  e - end
         *
         * @method  intersectIntervals
         * @param  {interval} a [description]
         * @param  {interval} b [description]
         * @return {[type]}   [description]
         */
        intersectIntervals: function(a,b){
            if(!a || !b){
                return null;
            }
            var s = Math.max(a.s,b.s);
            var e = Math.min(a.e,b.e);
            return (s<=e)? {s:s,e:e} : null;
        },
        /**
         * Limits value to range defined by interval
         *
         * @method  applyInterval
         * @param  {interval} interval Limiting interval
         * @param  {Number} value    Number
         * @return {Number}          Value inside interval
         */
        applyInterval: function(interval,value){ // limits vlaue range to interval
            if(!interval) return null;
            var val = Math.max(interval.s,value);
            val = Math.min(interval.e,val);
            return val;
        },
        /**
         * Check if value is inside interval
         *
         * If interval is not set, the value is not considered to be inside
         *
         * @method  inInterval
         * @param  {interval} interval Interval
         * @param  {Number} time     Number
         * @return {Boolean}         Result
         */
        inInterval: function(interval,time){
            return interval && (time >= interval.s && time<=interval.e);
        },
        /**
         * Get range of times this span can start at
         * @method getStartLimits
         * @return {interval} Start limits
         */
        getStartLimits: function(){
            if(this.getEnd() !== null){
                return {s:0,e:this.getEnd()-this.getMinLength()};
            }else{
                return {s:0,e:(this.dataFile.getLength())};
            }
        },
        /**
         * Get range of times this span can end at
         * @method  getEndLimits
         * @return {interval} End limits
         */
        getEndLimits: function(){
            if(this.getStart() !== null){
                return {s:this.getStart()+this.getMinLength(),e:(this.dataFile.getLength())}
            }else{     
                return {s:0,e:(this.dataFile.getLength())};
            }
        },
        /**
         * Can this span start at a given time?
         *
         * @method  canStart
         * @param  {Number} start Time in seconds to check
         * @return {Boolean}      Result
         */
        canStart: function(start){
            var limits = this.getStartLimits();
            return this.inInterval(limits,start);
        },
        /**
         * Can this span end at a given time?
         *
         * @method  canEnd
         * @param  {Number} end Time in seconds to check
         * @return {Boolean}     Result
         */
        canEnd: function(end){
            var limits = this.getEndLimits();
            return this.inInterval(limits,end);
        },
        /**
         * Sets start time of span
         *
         * @method  setStart
         * @param {Number} start Time in seconds
         */
        setStart: function(start){
            if(!this.canStart(start)){
                //console.log(this.getStartLimits(),end);               

                throw new TimeSpanError('set-start',"Cannot set starting position of time span, time span would overlap another or be shorter than the minimum length");
            }
            this.start = start;
            this.updatePosition();
        },

        /**
         * Sets end time of span
         *
         * @method  setEnd
         * @param {Number} end Time in seconds
         */
        setEnd: function(end){
            if(!this.canEnd(end)){

                throw new TimeSpanError('set-end',"Cannot set ending position of time span, time span would overlap another or be shorter than the minimum length");

            }
            this.end = end;
            this.updatePosition();
        },
        /**
         * Get start time
         *
         * @method  getStart
         * @return {Number} Time in seconds
         */
        getStart: function(){
            return this.start;
        },
        /**
         * Get starting position in pixels
         *
         * @method  getStartX
         * @return {Number} X-cordinate
         */
        getStartX: function(){
            return this.dataFile.time2px(this.start,this.zoom);
        },
        /**
         * Get ending position in pixels
         *
         * @method  getEndX
         * @return {Number} X-coordinate
         */
        getEndX: function(){
            return this.dataFile.time2px(this.end,this.zoom);
        },
        /**
         * Get end time
         *
         * @method  getEnd
         * @return {Number} Time in seconds
         */
        getEnd: function(){
            return this.end;
        },
        /**
         * Update element position on screen
         *
         * @method  updatePositon
         */
        updatePosition: function(){
            if(!this.rendered){
                return;
            }


            var startX = this.dataFile.time2px(this.start,this.zoom);

            var endX = this.dataFile.time2px(this.end,this.zoom);

            if(this.positionChangedFn) this.positionChangedFn(this.getStart(),this.getEnd());


            var startPos = startX;

            var startEl = this.getStartElement();
            var endEl = this.getEndElement();
            var backEl = this.getBackElement();

            startEl.css('position','absolute');

            endEl.css('position','absolute');

            backEl.css('position','absolute');

            if(this.style.horizontal()){

                backEl.css({'left': startPos, 'width': endX - startX});

                startEl.css('left',startPos);
                var endPos = endX - this.getEndDimensions().w;
                endEl.css('left',endPos);
            }else{
                backEl.css({'top': startPos, 'height': endX - startX});

                startEl.css('top',startPos);
                var endPos = endX - this.getEndDimensions().h;
                endEl.css('top',endPos);
            }


        },
        createStartElement: function(){
            return this.style.timeSpanStart();
        },
        createEndElement: function(){
            return this.style.timeSpanEnd();
        },
        createBackElement: function(){
            return this.style.timeSpanBackground();
        },
        getStartElement: function(){
            if(!this.startEl){
                this.startEl = this.createStartElement();
            }

            return this.startEl;
        },
        getEndElement: function(){
            if(!this.endEl){
                this.endEl = this.createEndElement();
            }

            return this.endEl;
        },
        getBackElement: function(){
            if(!this.backEl){
                this.backEl = this.createBackElement();
            }

            return this.backEl;       
        },
        getStartDimensions: function(){ // return dimensions of HTML element representing start of time span
            if(!this.startDim){
                this.startDim = this.utils.getElementDimensions(this.getStartElement());
            }
            return this.startDim;
        },
        getEndDimensions: function(){
            if(!this.endDim){
                this.endDim = this.utils.getElementDimensions(this.getEndElement());
            }
            return this.endDim;
        },
        /**
         * Render elements
         *
         * @method  render
         */
        render: function(){

            //generate element
            if(this.rendered){
                this.unRender();
            }


            if(this.start===null || this.end===null || this.zoom===null){
                return;
            }

            //check if start, end and zoom are available

            var startEl = this.getStartElement();

            //startEl.mousemove(function(e){$(e.target).parent().trigger('mouseleave'); e.stopPropagation();});

            var startDim = this.getStartDimensions();


            var endEl = this.getEndElement();

            /*endEl.mousemove(function(e){

                $(e.target).parent().trigger('mouseleave'); e.stopPropagation();

            });*/

            var endDim = this.getEndDimensions();

            this.foregroundContainer.append(startEl, endEl);

            var backEl = this.getBackElement();

            this.backgroundContainer.append(backEl);

            this.rendered = true;

            this.updatePosition();

            var self = this;


            


        },
        /**
         * Set zoom
         *
         * @method  setZoom
         * @param {Number} zoom Zoom factor
         */
        setZoom: function(zoom){

            this.zoom = zoom;
            this.updatePosition();
        },
        /**
         * Remove elements
         *
         * @method  unRender
         */
        unRender: function(){
            // possible optimization - keeping only visible annotations rendered
            if(!this.rendered){
                return;
            }
            if(this.startEl){
                this.startEl.remove();
                this.startEl = null;
            }

            if(this.endEl){
                this.endEl.remove();
                this.endEl = null;
            }
            if(this.backEl){
                this.backEl.remove();
                this.backEl = null;
            }
            this.startDim = null;
            this.endDim = null;

            this.rendered = false;
        },
        /**
         * Set event handler for position changes
         *
         * @method  onPositionChanged
         * @param  {Function} fn Function(start,end) start, end - seconds
         */
        onPositionChanged: function(fn){
            this.positionChangedFn = fn;
        },
        /**
         * Set event handler that is called after the span gets removed
         *
         * @method  onRemoved
         * @param  {Function} fn Function()
         */
        onRemoved: function(fn){
            this.removedFn = fn;
        },
        /**
         * Fire onRemoved handler
         *
         * @method  handleRemoved
         */
        handleRemoved: function(){
            this.unRender();
            if(this.removedFn) this.removedFn();
        },
        /**
         * Remove timespan from collection
         *
         * @method  remove
         */
        remove: function(){
            this.collection.removeTimeSpan(this);
        },
        /**
         * Adds active class to elements
         *
         * @method  activate
         */
        activate: function(){
            var elements = this.getStartElement().add(this.getEndElement()).add(this.getBackElement());
            elements.addClass('active');
        },
        /**
         * Removes active class from elements
         *
         * @method  deactivate
         */
        deactivate: function(){
            var elements = this.getStartElement().add(this.getEndElement()).add(this.getBackElement());
            elements.removeClass('active');
        }

    };

    return TimeSpan;

});
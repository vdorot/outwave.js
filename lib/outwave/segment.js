/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/




define(['jquery','./utils'],function($,Utils){

	//if vertical orientation is used, height refers to the x range
	var Segment = function(dataFile,container,height,style){

		this.style = style;

		this.isRendering = false;
		this.renderingTimer;
		this.xPos = 0;
		this.width = 0;
		this.height = height;
		this.zoom = 1;
		this.renderingXPos;
		this.renderingXEnd;
		this.isRecycled=true;
		this.isRendered=false;
		this.timelineMarkerFn = style.markerElement;

		this.container = jQuery(container);
		this.dataFile = dataFile;

		this.canvas = document.createElement('canvas');
		this.ctx = this.canvas.getContext("2d");


		
		if(style.horizontal()){
			$(this.canvas).attr({width: 0, height: height});
			this.timeline = $('<div class="timeline" style="position: absolute; border-top: 1px solid red; width: 100%;"></div>');
			this.element = $('<div class="segment"></div>').css({position: "absolute",width: 0, height: height});
		}else{
			$(this.canvas).attr({width: height, height: 0});
			this.timeline = $('<div class="timeline" style="position: absolute; border-top: 1px solid red; height: 100%;"></div>');
			this.element = $('<div class="segment"></div>').css({position: "absolute",width: height, height: 0})
		}
		this.element.append(this.timeline);


		this.element.append(this.canvas);
		this.container.append(this.element);


		var timelineInterval = this.getTimelineInterval();
		var testVal = 59*60*60+59*60+59;
		if(timelineInterval < 1){
			testVal +=0.999;
		}

		var markerFn = this.getTimelineMarkerElement();
		if(typeof(markerFn) != "function"){
			var error = new Error("Timeline marker(set in style options) should be a function returning an element");
			error.name = "InvalidOption";
			throw error;
		}
		var heightElem = markerFn(testVal); // maximum length
		heightElem.css({position: "absolute"});
		this.timeline.append(heightElem);
		this.markerHeight = heightElem.outerHeight(); //calculate time marker width and height
		this.markerWidth = heightElem.outerWidth();
		if(this.style.vertical()){
			var tmp = this.markerHeight;
			this.markerHeight = this.markerWidth;
			this.markerWidth = tmp;
		}


		var css = style.horizontal() ? {top: this.height-this.markerHeight} : {};

		this.timeline.empty().css(css);

		this.cursor = null; // position of cursor in pixels, relative to container, not segment 
	}



	Segment.getTimelineHeight = function(style){

		var fn = style.timelineMarker;

		var testVal = 59*60*60+59*60+59;	
		var elem = fn(testVal, Utils.formatTime(testVal));
		var dim = Utils.getElementDimensions(elem);

		return style.horizontal() ? dim.h : dim.w;
	}





	Segment.prototype = {


		setCursor: function(xPos){

			var prevCursor = this.cursor;
			this.cursor = xPos;

			if(this.isRendered){
				this.renderStyle();
			}

		},
		hasXPos: function(xPos){
			//return true if x position is inside segment
			return (xPos > this.xPos && xPos < (this.xPos + this.width));
		},
		getTimelineInterval: function(){
			var minPixels=this.markerWidth;
			var intervals = [
			0.1,0.2,0.5,
			1,2,5,10,15,30,60,
			60*2,60*5,60*10,60*15,60*30,60*60,
			60*60*2,60*60*3,60*60*4,60*60*6,60*60*12,60*60*24];

			var wanted = minPixels/this.dataFile.sampleRate*this.zoom;


			var interval = null;

			for(var i=0; i<intervals.length;i++){
				if(intervals[i]>wanted){
					interval = intervals[i];
					break;
				}
			}
			if(!interval){
				interval = intervals[intervals.length-1];
			}
			return interval;
		},
		getTimelineMarkerElement:function(){ 

			return this.style.timelineMarker;
		},
		updateTimeline: function(){

			this.timeline.empty();
			var interval = this.getTimelineInterval(); //seconds
			var startTime = this.xPos*this.zoom/this.dataFile.sampleRate;

			var endTime = (this.xPos+this.width)*this.zoom/this.dataFile.sampleRate;

			var next = Math.ceil(startTime / interval)*interval;
			if(next == 0){
				next += interval;
			}


			while(next<endTime){
				var fn = this.getTimelineMarkerElement();

				var elem = $(fn(next));
				this.timeline.append(elem);
				elem.css({position:"absolute"});
				var w = this.markerWidth;

				var pos = next*this.dataFile.sampleRate/this.zoom - this.xPos - w/2;

				var css = this.style.horizontal() ? {left: pos} : {top: pos};

				elem.css({position: "absolute"}).css(css);

				next = next + interval;
			}

		},

		setZoom: function(zoom){
			this.zoom = zoom;
		},
		setWidth: function(width){ //may clear canvas
			this.width = width;
			if(this.style.horizontal()){
				this.element.css({width:width});
				if(this.canvas.width!=width){
					this.canvas.width = width;
				}
			}else{
				this.element.css({height:width});
				if(this.canvas.height!=width){
					this.canvas.height = width;
				}
			}


			this.ctx = this.canvas.getContext("2d");
		},
		setPosWidth: function(xPos,width){
			$(this.element).show();
			$(this.canvas).hide();
			if(this.rendering){
				this.stopRendering();
			}
			this.isRecycled = false;
			this.xPos = xPos;
			this.setWidth(width);
			if(this.style.horizontal()){
				this.element.css({left: xPos});
			}else{
				this.element.css({top: xPos});
			}
			this.isRendered = false;
			this.updateTimeline();
		},
		getPos: function(){
			return this.xPos;
		},
		recycle: function(){
			this.cursor = null;
			$(this.element).hide();
			this.isRecycled = true;
			if(this.rendering){
				this.stopRendering();
			}		

		},
		recycled: function(){
			return this.isRecycled;
		},
		rendering: function(){
			return this.isRendering;
		},
		rendered: function(){
			return this.isRendered;
		},
		channelYRange: function(channel){ // return range of vertical pixels for channel
			var channelHeight = Math.floor((this.height-this.markerHeight)/this.dataFile.channels);

			var s = channelHeight*channel;
			var e = channelHeight*(channel+1);


			return [s,e,channelHeight];	
		},
		/*Applies transformation to canvas so that rendering can proceed as if it was horizontal*/
		rotateCanvas: function(){
			this.ctx.rotate(Math.PI/2);
			this.ctx.translate(0,-this.height);
		},
		renderStyle: function(){

			    this.ctx.globalCompositeOperation = 'source-atop'; // only affect pixels, which are already non-transparent

	    		this.ctx.save();
	    		if(this.style.vertical()){
					this.rotateCanvas();
	    		}

				var styleFn = this.style.waveformFill;

				if(typeof(styleFn)!="function"){
					var error = new Error("waveformFill(in options) should be a function returning a value that is applicable to canvas fillStyle");
					error.name = "InvalidOption";
					throw error;
				}
				
			    for(var channel = 0; channel<this.dataFile.channels;channel++){
			    	var yRange = this.channelYRange(channel);
		    		var p1 = {x:0,y:yRange[0]};
		    		var p2 = {x:0,y:yRange[1]};

		    		var styleChannel = channel;
					if(this.style.vertical()){ 
						//reverse channels when rendering vertically
						//so tat channels are show in correct order 
						styleChannel = this.dataFile.channels - styleChannel -1;
					}



			    	if(this.cursor!=null && this.cursor >= this.xPos && this.cursor < this.xPos+this.width){


						this.ctx.fillStyle = styleFn(this.ctx,p1,p2,styleChannel,true);
						this.ctx.fillRect(0,yRange[0],this.cursor-this.xPos,yRange[1]);

						this.ctx.fillStyle = styleFn(this.ctx,p1,p2,styleChannel,false);

						this.ctx.fillRect(this.cursor-this.xPos,yRange[0],this.width,yRange[1]);



			    	}else{

			    		var played = this.cursor && (this.cursor > this.xPos);

					    this.ctx.fillStyle = styleFn(this.ctx,p1,p2,styleChannel,played);

					    this.ctx.fillRect(0,yRange[0],this.width,yRange[1]);
					}


			    }
				this.ctx.restore();

			    this.ctx.globalCompositeOperation = 'source-over'; // revert to default
		},
		renderingFinished: function(){
			this.renderStyle();

			this.isRendering = false;
			this.isRendered = true;
			//$(this.canvas).fadeIn('quick');
			$(this.canvas).show();
			if(this.renderingDone){
				this.renderingDone(true); // true = rendering was finished
			}
		},
		stopRendering: function(){
			this.unschedule();
			if(this.isRendering){
				this.isRendering = false;
				if(this.renderingDone){
					this.renderingDone(false); // false = rendering was interrupted
				}
			}
		},
		tyCoord: function(amplitude, channel){

			var channelHeight = Math.floor(this.height-this.markerHeight)/this.dataFile.channels;

			amplitude = (-amplitude+1)/2*channelHeight;
			return channelHeight*channel+amplitude;
		},
		txCoord: function(x){
			return x - this.xPos;
		},
		renderPiece: function(){

			var x = this.renderingXPos;

			var maxTime = Math.ceil(20); // max 20ms of freeze

			var startTime = Date.now();

			this.ctx.save();
			if(this.style.vertical()){
				this.rotateCanvas();
			}
			while(x < this.renderingXEnd & ((Date.now() - startTime) < maxTime)){


				for(var channel = 0;channel < this.dataFile.channels; channel++){

					var dataChannel = channel;
					if(this.style.vertical()){ 
						//reverse channels when rendering vertically
						//so that channels are show in correct order 
						dataChannel = this.dataFile.channels - dataChannel -1;
					}
					//console.log(x,dataChannel,this.zoom);
					var sample = this.dataFile.getSample(x,dataChannel,this.zoom);
					var ctx = this.ctx;
					ctx.beginPath();
					var y1 = this.tyCoord(sample.min, channel)+0.5;
					var y2 = this.tyCoord(sample.max, channel)+0.5;
					var x1 = this.txCoord(x)+0.5;
					var x2 = x1; 
					if(y1==y2){ // if y coords are the same, draw horizontal line (zero length lines do not get drawn)
						x2+=1;
					}
					ctx.moveTo(x1,y1);
					ctx.lineTo(x2,y2);
					//console.log(x1,y1,x2,y2);
					ctx.stroke();
	 
				}

				x++;
			}

			this.ctx.restore();


			this.renderingXPos = x;
			if(this.renderingXPos < this.renderingXEnd){
				this.scheduleRendering();
			}else{
				this.renderingFinished();
			}
		},

		render: function(done){
			this.isRendered = false;
			this.renderingDone = done;
			if(this.style.horizontal()){
				this.ctx.clearRect(0, 0, this.width,this.height);
			}else{
				this.ctx.clearRect(0, 0, this.height,this.width);
			}

			this.ctx.strokeStyle = "#ffffff";
			this.renderingXPos = this.xPos;
			this.renderingXEnd = this.xPos+this.width;
			this.isRendering = true;
			$(this.canvas).hide();

			this.scheduleRendering();
		},
		destroy: function(){
			if(this.element){
				this.element.remove();
			}
			if(this.rendering){
				this.unschedule();
			}
		},
		scheduleRendering: function(){
			var self = this;
			this.renderingTimer = setTimeout(function(){self.renderPiece();},0)
		},
		unschedule: function(){
			if(this.renderingTimer){
				clearTimeout(this.renderingTimer);
			}
		}

	};

	return Segment;

});


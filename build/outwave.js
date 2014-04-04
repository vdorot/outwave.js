!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Outwave=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var _jDataView = _dereq_('./vendor/jdataview');
var DataFile = function (dataView, byteLen) {
    this.data = dataView;
    var ofs = 0;
    this.version = dataView.getUint8(ofs);
    ofs++;
    this.channels = dataView.getUint8(ofs);
    ofs++;
    this.sampleSize = dataView.getUint8(ofs);
    ofs += 1;
    this.sampleRate = dataView.getUint32(ofs, false);
    ofs += 4;
    this.summery1;
    this.summary2;
    if (this.version == 2) {
        this.summary1 = dataView.getUint8(ofs, false);
        ofs += 1;
        this.summary2 = dataView.getUint8(ofs, false);
        ofs += 1;
    }
    this.headerLen = ofs;
    if (this.version == 1) {
        this.frames = Math.floor((byteLen - this.headerLen) / (this._getChannelCnt() * this.getSampleSize() * 2));
    } else {
        this.frames = dataView.getUint32(byteLen - 4);
    }
    this.byteLen = byteLen;
    console.log(this);
    this.mono;
    this.sampleSource;
    this.setMono(false);
};
DataFile.prototype = {
    setMono: function (on) {
        if (on === undefined)
            on = true;
        this.mono = on;
        if (this.mono) {
            this.sampleSource = this.getRawSampleMono;
        } else {
            this.sampleSource = this.getRawSample;
        }
    },
    getVersion: function () {
        return this.version;
    },
    getChannelCnt: function () {
        if (this.mono) {
            return 1;
        } else {
            return this.channels;
        }
    },
    _getChannelCnt: function () {
        return this.channels;
    },
    getSampleSize: function () {
        return this.sampleSize;
    },
    getSampleRate: function () {
        return this.sampleRate;
    },
    getFrameCnt: function () {
        return this.frames;
    },
    getLength: function () {
        return this.getFrameCnt() / this.getSampleRate();
    },
    px2time: function (x, zoom) {
        if (!zoom) {
            throw new Error();
        }
        return x / this.getSampleRate() * zoom;
    },
    time2px: function (time, zoom) {
        if (!zoom) {
            throw new Error();
        }
        return Math.floor(time * this.getSampleRate() / zoom);
    },
    sampleStart: function (x, zoom) {
        return Math.floor(x * zoom);
    },
    sampleEnd: function (x, zoom) {
        return Math.min(Math.ceil((x + 1) * zoom - 1), this.getFrameCnt() - 1);
    },
    getRawSample: function (sample, channel) {
        var seekTo;
        if (this.version == 2) {
            seekTo = this.headerLen + sample * this._getChannelCnt() * this.getSampleSize() * 2 + channel * this.getSampleSize() * 2 + (sample >> this.summary1) * this._getChannelCnt() * this.getSampleSize() * 2 + (sample >> this.summary2) * this._getChannelCnt() * this.getSampleSize() * 2;
        } else {
            seekTo = this.headerLen + sample * this._getChannelCnt() * this.getSampleSize() * 2 + channel * this.getSampleSize() * 2;
        }
        var min;
        var max;
        if (this.getSampleSize() == 2) {
            min = this.data.getInt16(seekTo) / 65535;
            max = this.data.getInt16(seekTo + 2) / 65535;
        } else {
            min = this.data.getInt8(seekTo) / 128;
            max = this.data.getInt8(seekTo + 1) / 128;
        }
        return [
            min,
            max
        ];
    },
    getRawSampleMono: function (sample) {
        var min = Number.POSITIVE_INFINITY;
        var max = Number.NEGATIVE_INFINITY;
        var i;
        for (i = 0; i < this._getChannelCnt(); i++) {
            var s = this.getRawSample(sample, i);
            min = Math.min(min, s[0]);
            max = Math.max(max, s[1]);
        }
        return [
            min,
            max
        ];
    },
    getSample: function (x, channel, zoom) {
        var min = Number.POSITIVE_INFINITY;
        var max = Number.NEGATIVE_INFINITY;
        var start = this.sampleStart(x, zoom);
        var end = this.sampleEnd(x, zoom);
        for (var sample = start; sample <= end; sample++) {
            var s = this.sampleSource(sample, channel);
            min = Math.min(min, s[0]);
            max = Math.max(max, s[1]);
        }
        return [
            min,
            max
        ];
    }
};
DataFile.loadUrl = function (url, done) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    if ('responseType' in xhr) {
        console.log('AJAX response: arraybuffer');
        xhr.responseType = 'arraybuffer';
    } else if ('overrideMimeType' in xhr) {
        xhr.overrideMimeType('text/plain; charset=x-user-defined');
    } else {
        console.log('AJAX response: IE9');
        xhr.setRequestHeader('Accept-Charset', 'x-user-defined');
    }
    xhr.onload = function (event) {
        if (!('response' in this)) {
            var bytes = new VBArray(this.responseBody).toArray();
            this.response = '';
            for (var i = 0; i < bytes.length; i++) {
                this.response += String.fromCharCode(bytes[i]);
            }
        }
        var dataView;
        var length;
        if (this.response.constructor == ArrayBuffer) {
            dataView = new DataView(this.response);
            length = this.response.byteLength;
        } else {
            if (typeof jDataView == 'undefined') {
                done(false, 'jDataView not found');
                return;
            }
            dataView = new jDataView(this.response);
            length = dataView.byteLength;
        }
        var dataFile = new DataFile(dataView, length);
        done(true, null, dataFile);
    };
    xhr.send();
};
module.exports = DataFile;
},{"./vendor/jdataview":15}],2:[function(_dereq_,module,exports){
var DataFile = _dereq_('./data-file'), Viewer = _dereq_('./viewer'), SegmentCollection = _dereq_('./segment-collection'), Segment = _dereq_('./segment'), Style = _dereq_('./style'), utils = _dereq_('./utils'), TimeSpan = _dereq_('./time-span/time-span'), SparseTimeSpan = _dereq_('./time-span/sparse-time-span'), ContinuousTimeSpan = _dereq_('./time-span/continuous-time-span'), Draggable = _dereq_('./time-span/draggable'), TimeSpanCollection = _dereq_('./time-span/time-span-collection'), SparseTimeSpanCollection = _dereq_('./time-span/sparse-time-span-collection'), ContinuousTimeSpanCollection = _dereq_('./time-span/continuous-time-span-collection');
var api = {
        DataFile: DataFile,
        Viewer: Viewer,
        SegmentCollection: SegmentCollection,
        Segment: Segment,
        Style: Style,
        utils: utils,
        timeSpans: {
            TimeSpan: TimeSpan,
            SparseTimeSpan: SparseTimeSpan,
            ContinuousTimeSpan: ContinuousTimeSpan,
            Draggable: Draggable,
            TimeSpanCollection: TimeSpanCollection,
            SparseTimeSpanCollection: SparseTimeSpanCollection,
            ContinuousTimeSpanCollection: ContinuousTimeSpanCollection
        }
    };
var Outwave = function (dataFileUrl, container, options, done) {
    container = $(container);
    var showError = function (message) {
        container.empty().append($('<div class="error"></div>').text(message));
    };
    $(container).text('Loading...');
    DataFile.loadUrl(dataFileUrl, function (success, errorMessage, dataFile) {
        if (!success) {
            showError(errorMessage);
        }
        var viewer = new Viewer(container, dataFile, options);
        done(viewer);
    });
};
Outwave.api = api;
module.exports = Outwave;
},{"./data-file":1,"./segment":4,"./segment-collection":3,"./style":5,"./time-span/continuous-time-span":7,"./time-span/continuous-time-span-collection":6,"./time-span/draggable":8,"./time-span/sparse-time-span":10,"./time-span/sparse-time-span-collection":9,"./time-span/time-span":13,"./time-span/time-span-collection":11,"./utils":14,"./viewer":17}],3:[function(_dereq_,module,exports){
var SegmentCollection = function (dataFile, container, segmentFactory, segmentWidth, style) {
    this.container = jQuery(container);
    this.container.empty();
    this.viewportLength;
    this.segmentFactory = segmentFactory;
    this.dataFile = dataFile;
    this.segmentWidth = segmentWidth;
    this.segmentCnt = null;
    this.zoom = 1;
    var self = this;
    this.segments = [];
    this.cursorTime = null;
    this.cursorTime = 0;
    this.position = null;
    this.scrollPos = 0;
    this.style = style;
};
SegmentCollection.prototype = {
    updateDimensions: function () {
        this.segmentCnt = Math.ceil(this.dataFile.getFrameCnt() / this.zoom / this.segmentWidth);
        this.containerLength = Math.floor(this.dataFile.getFrameCnt() / this.zoom);
        if (this.style.horizontal()) {
            this.container.width(this.containerLength);
        } else {
            this.container.height(this.containerLength);
        }
    },
    setCursorX: function (x) {
        if (!x) {
            this.removeCursor();
        } else {
            this.setCursor(this.dataFile.px2time(x, zoom));
        }
    },
    setViewportLength: function (ln) {
        this.viewportLength = ln;
        this.updateDimensions();
    },
    setCursor: function (time) {
        if (time === null || time === false) {
            return this.removeCursor();
        }
        if (this.cursorTime == time) {
            return;
        }
        this.cursorTime = time;
        for (var i = 0; i < this.segments.length; i++) {
            this.segments[i].setCursor(this.dataFile.time2px(time, this.zoom));
        }
    },
    removeCursor: function () {
        if (this.cursorTime) {
            for (var i = 0; i < this.segments.length; i++) {
                this.segments[i].setCursor(null);
            }
        }
        this.cursorTime = null;
    },
    setZoom: function (zoom) {
        this.zoom = zoom;
        this.updateDimensions();
        this.rebuild();
    },
    scrollTo: function (xPos) {
        this.scrollPos = xPos;
        this.updateSegments();
    },
    getAvailableSegment: function () {
        for (var i = 0; i < this.segments.length; i++) {
            if (this.segments[i].recycled()) {
                return this.segments[i];
            }
        }
    },
    createSegment: function () {
        var segment = this.segmentFactory(this.container);
        this.segments.push(segment);
        return segment;
    },
    rebuild: function () {
        this.segments = [];
        this.container.empty();
        this.updateSegments();
    },
    ensureSegment: function (s) {
        var f = false;
        for (var i = 0; i < this.segments.length; i++) {
            if (this.segments[i].getPos() == s * this.segmentWidth && !this.segments[i].recycled()) {
                f = true;
                break;
            }
        }
        if (!f) {
            var segment = this.getAvailableSegment();
            if (!segment) {
                segment = this.createSegment();
            }
            var width = Math.min(this.containerLength - s * this.segmentWidth, this.segmentWidth);
            var xCursor = this.dataFile.time2px(this.cursorTime, this.zoom);
            segment.setZoom(this.zoom);
            segment.setCursor(xCursor);
            segment.setPosWidth(s * this.segmentWidth, width);
        }
    },
    updateSegments: function () {
        if (!this.viewportLength) {
            var error = new Error('Viewport length undefined, call setViewportLength before updateSegments');
            error.name = 'InvalidState';
            throw error;
        }
        var startW = this.scrollPos - this.viewportLength;
        var endW = this.scrollPos + 2 * this.viewportLength;
        var startS = Math.floor(startW / this.segmentWidth);
        var endS = Math.ceil(endW / this.segmentWidth);
        startS = Math.max(startS, 0);
        endS = Math.min(endS, this.segmentCnt - 1);
        var startX = startS * this.segmentWidth;
        var endX = endS * this.segmentWidth;
        for (var i = 0; i < this.segments.length; i++) {
            if (this.segments[i].getPos() < startX || this.segments[i].getPos() > endX) {
                this.segments[i].recycle();
            }
        }
        for (var i = startS; i <= endS; i++) {
            this.ensureSegment(i);
        }
        this.segments.sort(function (a, b) {
            return a.getPos() - b.getPos();
        });
        this.render();
    },
    render: function () {
        var self = this;
        var doRender = function () {
            self.render();
        };
        var i;
        var seg;
        for (i = 0; i < this.segments.length; i++) {
            seg = this.segments[i];
            if (!seg.recycled() && !seg.rendering() && !seg.rendered() && seg.getPos() >= this.scrollPos && seg.getPos() <= this.scrollPos + this.viewportLength) {
                this.segments[i].render(doRender);
                return;
            }
        }
        for (i = 0; i < this.segments.length; i++) {
            seg = this.segments[i];
            if (!seg.recycled() && !seg.rendering() && !seg.rendered()) {
                this.segments[i].render(doRender);
                return;
            }
        }
    }
};
module.exports = SegmentCollection;
},{}],4:[function(_dereq_,module,exports){
var Utils = _dereq_('./utils');
var Segment = function (dataFile, container, height, style) {
    this.style = style;
    this.isRendering = false;
    this.renderingTimer;
    this.xPos = 0;
    this.width = 0;
    this.height = height;
    this.zoom = 1;
    this.renderingXPos;
    this.renderingXEnd;
    this.isRecycled = true;
    this.isRendered = false;
    this.timelineMarkerFn = style.markerElement;
    this.container = jQuery(container);
    this.dataFile = dataFile;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    if (style.horizontal()) {
        $(this.canvas).attr({
            width: 0,
            height: height
        });
        this.timeline = $('<div class="timeline" style="position: absolute; border-top: 1px solid red; width: 100%;"></div>');
        this.element = $('<div class="segment"></div>').css({
            position: 'absolute',
            width: 0,
            height: height
        });
    } else {
        $(this.canvas).attr({
            width: height,
            height: 0
        });
        this.timeline = $('<div class="timeline" style="position: absolute; border-top: 1px solid red; height: 100%;"></div>');
        this.element = $('<div class="segment"></div>').css({
            position: 'absolute',
            width: height,
            height: 0
        });
    }
    this.element.append(this.timeline);
    this.element.append(this.canvas);
    this.container.append(this.element);
    var timelineInterval = this.getTimelineInterval();
    var testVal = 59 * 60 * 60 + 59 * 60 + 59;
    if (timelineInterval < 1) {
        testVal += 0.999;
    }
    var markerFn = this.getTimelineMarkerElement();
    if (typeof markerFn != 'function') {
        var error = new Error('Timeline marker(set in style options) should be a function returning an element');
        error.name = 'InvalidOption';
        throw error;
    }
    var heightElem = markerFn(testVal);
    heightElem.css({ position: 'absolute' });
    this.timeline.append(heightElem);
    this.markerHeight = heightElem.outerHeight();
    this.markerWidth = heightElem.outerWidth();
    if (this.style.vertical()) {
        var tmp = this.markerHeight;
        this.markerHeight = this.markerWidth;
        this.markerWidth = tmp;
    }
    var css = style.horizontal() ? { top: this.height - this.markerHeight } : {};
    this.timeline.empty().css(css);
    this.cursor = null;
};
Segment.getTimelineHeight = function (style) {
    var fn = style.timelineMarker;
    var testVal = 59 * 60 * 60 + 59 * 60 + 59;
    var elem = fn(testVal, Utils.formatTime(testVal));
    var dim = Utils.getElementDimensions(elem);
    return style.horizontal() ? dim.h : dim.w;
};
Segment.prototype = {
    setCursor: function (xPos) {
        var prevCursor = this.cursor;
        this.cursor = xPos;
        if (this.isRendered) {
            this.renderStyle();
        }
    },
    hasXPos: function (xPos) {
        return xPos > this.xPos && xPos < this.xPos + this.width;
    },
    getTimelineInterval: function () {
        var minPixels = this.markerWidth;
        var intervals = [
                0.1,
                0.2,
                0.5,
                1,
                2,
                5,
                10,
                15,
                30,
                60,
                60 * 2,
                60 * 5,
                60 * 10,
                60 * 15,
                60 * 30,
                60 * 60,
                60 * 60 * 2,
                60 * 60 * 3,
                60 * 60 * 4,
                60 * 60 * 6,
                60 * 60 * 12,
                60 * 60 * 24
            ];
        var wanted = this.dataFile.px2time(minPixels, this.zoom);
        var interval = null;
        for (var i = 0; i < intervals.length; i++) {
            if (intervals[i] > wanted) {
                interval = intervals[i];
                break;
            }
        }
        if (!interval) {
            interval = intervals[intervals.length - 1];
        }
        return interval;
    },
    getTimelineMarkerElement: function () {
        return this.style.timelineMarker;
    },
    updateTimeline: function () {
        this.timeline.empty();
        var interval = this.getTimelineInterval();
        var startTime = this.dataFile.px2time(this.xPos, this.zoom);
        var endTime = this.dataFile.px2time(this.xPos + this.width, this.zoom);
        var next = Math.ceil(startTime / interval) * interval;
        if (next === 0) {
            next += interval;
        }
        while (next < endTime) {
            var fn = this.getTimelineMarkerElement();
            var elem = $(fn(next));
            this.timeline.append(elem);
            elem.css({ position: 'absolute' });
            var w = this.markerWidth;
            var pos = this.dataFile.time2px(next, this.zoom) - this.xPos - w / 2;
            var css = this.style.horizontal() ? { left: pos } : { top: pos };
            elem.css({ position: 'absolute' }).css(css);
            next = next + interval;
        }
    },
    setZoom: function (zoom) {
        this.zoom = zoom;
    },
    setWidth: function (width) {
        this.width = width;
        if (this.style.horizontal()) {
            this.element.css({ width: width });
            if (this.canvas.width != width) {
                this.canvas.width = width;
            }
        } else {
            this.element.css({ height: width });
            if (this.canvas.height != width) {
                this.canvas.height = width;
            }
        }
        this.ctx = this.canvas.getContext('2d');
    },
    setPosWidth: function (xPos, width) {
        $(this.element).show();
        $(this.canvas).hide();
        if (this.rendering) {
            this.stopRendering();
        }
        this.isRecycled = false;
        this.xPos = xPos;
        this.setWidth(width);
        if (this.style.horizontal()) {
            this.element.css({ left: xPos });
        } else {
            this.element.css({ top: xPos });
        }
        this.isRendered = false;
        this.updateTimeline();
    },
    getPos: function () {
        return this.xPos;
    },
    recycle: function () {
        this.cursor = null;
        $(this.element).hide();
        this.isRecycled = true;
        if (this.rendering) {
            this.stopRendering();
        }
    },
    recycled: function () {
        return this.isRecycled;
    },
    rendering: function () {
        return this.isRendering;
    },
    rendered: function () {
        return this.isRendered;
    },
    channelYRange: function (channel) {
        var channelHeight = Math.floor((this.height - this.markerHeight) / this.dataFile.getChannelCnt());
        var s = channelHeight * channel;
        var e = channelHeight * (channel + 1);
        return [
            s,
            e,
            channelHeight
        ];
    },
    rotateCanvas: function () {
        this.ctx.rotate(Math.PI / 2);
        this.ctx.translate(0, -this.height);
    },
    renderStyle: function () {
        this.ctx.globalCompositeOperation = 'source-atop';
        this.ctx.save();
        if (this.style.vertical()) {
            this.rotateCanvas();
        }
        var styleFn = this.style.waveformFill;
        if (typeof styleFn != 'function') {
            var error = new Error('waveformFill(in options) should be a function returning a value that is applicable to canvas fillStyle');
            error.name = 'InvalidOption';
            throw error;
        }
        for (var channel = 0; channel < this.dataFile.getChannelCnt(); channel++) {
            var yRange = this.channelYRange(channel);
            var p1 = {
                    x: 0,
                    y: yRange[0]
                };
            var p2 = {
                    x: 0,
                    y: yRange[1]
                };
            var styleChannel = channel;
            if (this.style.vertical()) {
                styleChannel = this.dataFile.getChannelCnt() - styleChannel - 1;
            }
            if (this.cursor !== null && this.cursor >= this.xPos && this.cursor < this.xPos + this.width) {
                this.ctx.fillStyle = styleFn(this.ctx, p1, p2, styleChannel, true);
                this.ctx.fillRect(0, yRange[0], this.cursor - this.xPos, yRange[1]);
                this.ctx.fillStyle = styleFn(this.ctx, p1, p2, styleChannel, false);
                this.ctx.fillRect(this.cursor - this.xPos, yRange[0], this.width, yRange[1]);
            } else {
                var played = this.cursor && this.cursor > this.xPos;
                this.ctx.fillStyle = styleFn(this.ctx, p1, p2, styleChannel, played);
                this.ctx.fillRect(0, yRange[0], this.width, yRange[1]);
            }
        }
        this.ctx.restore();
        this.ctx.globalCompositeOperation = 'source-over';
    },
    renderingFinished: function () {
        this.renderStyle();
        this.isRendering = false;
        this.isRendered = true;
        $(this.canvas).show();
        if (this.renderingDone) {
            this.renderingDone(true);
        }
    },
    stopRendering: function () {
        this.unschedule();
        if (this.isRendering) {
            this.isRendering = false;
            if (this.renderingDone) {
                this.renderingDone(false);
            }
        }
    },
    tyCoord: function (amplitude, channel) {
        var channelHeight = Math.floor(this.height - this.markerHeight) / this.dataFile.getChannelCnt();
        amplitude = (-amplitude + 1) / 2 * channelHeight;
        return channelHeight * channel + amplitude;
    },
    txCoord: function (x) {
        return x - this.xPos;
    },
    renderPiece: function () {
        var x = this.renderingXPos;
        var maxTime = Math.ceil(20);
        var startTime = Date.now();
        this.ctx.save();
        if (this.style.vertical()) {
            this.rotateCanvas();
        }
        while (x < this.renderingXEnd & Date.now() - startTime < maxTime) {
            for (var channel = 0; channel < this.dataFile.getChannelCnt(); channel++) {
                var dataChannel = channel;
                if (this.style.vertical()) {
                    dataChannel = this.dataFile.getChannelCnt() - dataChannel - 1;
                }
                var sample = this.dataFile.getSample(x, dataChannel, this.zoom);
                var ctx = this.ctx;
                ctx.beginPath();
                var y1 = this.tyCoord(sample[0], channel) + 0.5;
                var y2 = this.tyCoord(sample[1], channel) + 0.5;
                var x1 = this.txCoord(x) + 0.5;
                var x2 = x1;
                if (y1 == y2) {
                    x2 += 1;
                }
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            x++;
        }
        this.ctx.restore();
        this.renderingXPos = x;
        if (this.renderingXPos < this.renderingXEnd) {
            this.scheduleRendering();
        } else {
            this.renderingFinished();
        }
    },
    render: function (done) {
        this.isRendered = false;
        this.renderingDone = done;
        if (this.style.horizontal()) {
            this.ctx.clearRect(0, 0, this.width, this.height);
        } else {
            this.ctx.clearRect(0, 0, this.height, this.width);
        }
        this.ctx.strokeStyle = '#ffffff';
        this.renderingXPos = this.xPos;
        this.renderingXEnd = this.xPos + this.width;
        this.isRendering = true;
        $(this.canvas).hide();
        this.scheduleRendering();
    },
    scheduleRendering: function () {
        var self = this;
        this.renderingTimer = setTimeout(function () {
            self.renderPiece();
        }, 0);
    },
    unschedule: function () {
        if (this.renderingTimer) {
            clearTimeout(this.renderingTimer);
        }
    },
    destroy: function () {
        if (this.element) {
            this.element.remove();
        }
        if (this.rendering) {
            this.unschedule();
        }
    }
};
module.exports = Segment;
},{"./utils":14}],5:[function(_dereq_,module,exports){
var Utils = _dereq_('./utils');
var Style = function () {
    this.ORIENTATION_HORIZONTAL = 1;
    this.ORIENTATION_VERTICAL = 2;
    this.orientation = this.ORIENTATION_VERTICAL;
    this.horizontal = function () {
        return this.orientation == this.ORIENTATION_HORIZONTAL;
    };
    this.vertical = function () {
        return this.orientation == this.ORIENTATION_VERTICAL;
    };
    this.timelineMarker = function (time) {
        var text = $('<span></span>').text(Utils.formatTime(time));
        return $('<div class="timeline-marker"></div>').append(text);
    };
    this.cursor = function (time) {
        return $('<div class="cursor"></div>').click(function () {
            alert('cursor click');
        });
    };
    this.hover = function (time) {
        return $('<div class="hover"></div>');
    };
    this.timeSpanStart = function () {
        return $('<div class="timespan-start"></div>');
    };
    this.timeSpanEnd = function () {
        return $('<div class="timespan-end"></div>');
    };
    this.timeSpanDividerElement = function () {
        return $('<div class="timespan-end"></div>');
    };
    this.timeSpanBackground = function () {
        return $('<div class="timespan-back"><div></div></div>');
    };
    this.waveformFill = function (ctx, p1, p2, channel, played) {
        var grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        if (played) {
            if (channel == 0) {
                grad.addColorStop(0, '#fff');
                grad.addColorStop(1, '#ff0000');
            } else {
                grad.addColorStop(0, '#fff');
                grad.addColorStop(1, '#0000ff');
            }
        } else {
            if (channel == 0) {
                grad.addColorStop(0, '#fff');
                grad.addColorStop(1, '#00ABEB');
            } else {
                grad.addColorStop(0, '#fff');
                grad.addColorStop(1, '#66CC00');
            }
        }
        return grad;
    };
    return this;
};
module.exports = Style;
},{"./utils":14}],6:[function(_dereq_,module,exports){
var TimeSpanCollection = _dereq_('./time-span-collection'), ContinuousTimeSpan = _dereq_('./continuous-time-span');
var ContinuousTimeSpanCollection = function (viewer, options) {
    var collection = new TimeSpanCollection(viewer, options);
    collection.spanFactory = function () {
        var span = new ContinuousTimeSpan(this, this.dataFile, this.backgroundContainer, this.foregroundContainer, this.style);
        return span;
    };
    collection.addTimeSpan = function (end) {
        if (end < 0 || end > this.dataFile.getLength()) {
            var error = new Error('Invalid end time');
            error.name = 'TimeSpanError';
            throw error;
        }
        var span = this.createSpan();
        if (this.timespans.length) {
            var prevSpan = this.timespans[this.timespans.length - 1];
            if (end < prevSpan.getEnd()) {
                var error = new Error('Time spans would overlap');
                error.name = 'TimeSpanError';
                throw error;
            }
            span.setStart(prevSpan.getEnd());
            span.setEnd(end);
            span.setPrev(prevSpan);
            span.setNext(null);
            prevSpan.setNext(span);
        } else {
            span.setStart(0);
            span.setEnd(end);
            span.setPrev(null);
            span.setNext(null);
        }
        this.timespans.splice(this.timespans.length, 0, span);
        span.setZoom(this.zoom);
        span.render();
        if (this.timeSpanCreatedFn)
            this.timeSpanCreatedFn(span);
        return span;
    };
    collection.removeTimeSpan = function (timespan) {
        var i;
        for (i in this.timespans) {
            if (this.timespans[i] == timespan) {
                if (timespan.getPrev() !== null) {
                    timespan.getPrev().setNext(timespan.getNext());
                }
                if (timespan.getNext() !== null) {
                    timespan.getNext().setPrev(timespan.getPrev());
                    timespan.getNext().setStart(timespan.getStart());
                }
                timespan.handleRemoved();
                this.timespans.splice(i, 1);
                break;
            }
        }
    };
    return collection;
};
module.exports = ContinuousTimeSpanCollection;
},{"./continuous-time-span":7,"./time-span-collection":11}],7:[function(_dereq_,module,exports){
var TimeSpan = _dereq_('./time-span');
var ContinuousTimeSpan = function (collection, dataFile, backgroundContainer, foregroundContainer, style) {
    var span = new TimeSpan(collection, dataFile, backgroundContainer, foregroundContainer, style);
    var getStartLimits = span.getStartLimits;
    span.getStartLimits = function () {
        var limits = getStartLimits.call(this);
        if (this.getPrev()) {
            limits = this.intersectIntervals(limits, {
                s: this.getPrev().getStart() + this.getPrev().getMinLength(),
                e: this.getEnd()
            });
        }
        return limits;
    };
    var getEndLimits = span.getEndLimits;
    span.getEndLimits = function () {
        var limits = getEndLimits.call(this);
        if (this.getNext()) {
            limits = this.intersectIntervals(limits, {
                s: this.getStart(),
                e: this.getNext().getEnd() - this.getNext().getMinLength()
            });
        }
        return limits;
    };
    var setStart = span.setStart;
    span.setStart = function (time) {
        var prevTime = this.getStart();
        setStart.call(this, time);
        if (time != prevTime && this.getPrev())
            this.getPrev().setEnd(time);
    };
    var setEnd = span.setEnd;
    span.setEnd = function (time) {
        prevTime = this.getEnd();
        setEnd.call(this, time);
        if (time != prevTime && this.getNext())
            this.getNext().setStart(time);
    };
    var setPrev = span.setPrev;
    span.setPrev = function (prev) {
        setPrev.call(this, prev);
        if (prev) {
            this.getStartElement().addClass('continuous');
        } else {
            this.getStartElement().removeClass('continuous');
        }
    };
    var setNext = span.setNext;
    span.setNext = function (next) {
        setNext.call(this, next);
        if (next) {
            this.getEndElement().addClass('continuous');
        } else {
            this.getEndElement().removeClass('continuous');
        }
    };
    return span;
};
module.exports = ContinuousTimeSpan;
},{"./time-span":13}],8:[function(_dereq_,module,exports){
getOffset = function (elem) {
    return $(elem).offset();
};
var Draggable = function (span, viewer, style) {
    var viewportElement = viewer.getViewportElement();
    var ext = function () {
        var self = this;
        this.scrollingSpeed = 0.5;
        this.setScrollingSpeed = function (speed) {
            this.scrollingSpeed = speed;
        };
        this.scrollCursorX;
        this.scrollCursorY;
        this.scrollTimer = null;
        this.tickPeriod = 50;
        this.tickScroll = function () {
            var offset = getOffset(viewportElement);
            var width = viewportElement.width();
            var height = viewportElement.height();
            var diff = 0;
            if (style.horizontal()) {
                if (self.scrollCursorX < offset.left) {
                    diff = self.scrollCursorX - offset.left;
                }
                if (self.scrollCursorX > offset.left + width) {
                    diff = self.scrollCursorX - (offset.left + width);
                }
                diff = diff * self.scrollingSpeed * self.tickPeriod / 1000;
                viewportElement.scrollLeft(viewportElement.scrollLeft() + diff);
            } else {
                if (self.scrollCursorY < offset.top) {
                    diff = self.scrollCursorY - offset.top;
                }
                if (self.scrollCursorY > offset.top + height) {
                    diff = self.scrollCursorY - (offset.left + height);
                }
                diff = diff * self.scrollingSpeed * self.tickPeriod / 1000;
                viewportElement.scrollTop(viewportElement.scrollTop() + diff);
            }
            self.scrollTimer = setTimeout(self.tickScroll, self.tickPeriod);
        };
        this.startAutoScroll = function () {
            if (this.scrollTimer !== null) {
                return;
            }
            this.scrollTimer = setTimeout(this.tickScroll, this.tickPeriod);
        };
        this.stopAutoScroll = function () {
            if (this.scrollTimer !== null) {
                clearTimeout(this.scrollTimer);
            }
            this.scrollTimer = null;
        };
        var dragHandler = function (e, isStart) {
            e.preventDefault();
            var parent = $(this).parent();
            var ofs = getOffset(parent[0]);
            var startPos;
            if (self.style.horizontal()) {
                startPos = e.pageX - ofs.left;
            } else {
                startPos = e.pageY - ofs.top;
            }
            if (self.style.horizontal()) {
                $('body').addClass('drag-horizontal');
            } else {
                $('body').addClass('drag-vertical');
            }
            $('body').data('waveform-dragging', true);
            var prevPagePos = null;
            var lastMouseEvent;
            var moveHandler = function (e) {
                if (e.event) {
                    e = $.event.fix(e);
                    e.stopPropagation();
                }
                lastMouseEvent = {
                    pageX: e.pageX,
                    pageY: e.pageY
                };
                self.scrollCursorX = e.pageX;
                self.scrollCursorY = e.pageY;
                var element = document.elementFromPoint(e.pageX - window.pageXOffset, e.pageY - window.pageYOffset);
                if (element && (self.foregroundContainer[0] == element || self.foregroundContainer.has(element).length !== 0)) {
                    self.stopAutoScroll();
                } else {
                    self.startAutoScroll();
                }
                var ofs = getOffset(parent[0]);
                var endPos;
                if (typeof e.pageX == 'undefined') {
                    if (self.style.horizontal()) {
                        endPos = prevPagePos - ofs.left;
                    } else {
                        endPos = prevPagePos - ofs.top;
                    }
                } else {
                    if (self.style.horizontal()) {
                        endPos = e.pageX - ofs.left;
                        prevPagePos = e.pageX;
                    } else {
                        endPos = e.pageY - ofs.top;
                        prevPagePos = e.pageY;
                    }
                }
                var sDim = self.getStartDimensions();
                var eDim = self.getEndDimensions();
                var elemSize;
                if (style.horizontal()) {
                    elemSize = sDim.w + eDim.w;
                } else {
                    elemSize = sDim.h + sDim.h;
                }
                elemSize = self.dataFile.px2time(elemSize, self.zoom);
                var time = self.dataFile.px2time(endPos, self.zoom);
                var limits;
                if (isStart) {
                    limits = self.getStartLimits();
                    if (self.getEnd() - limits.e < elemSize) {
                        limits.e = self.getEnd() - elemSize;
                    }
                    if (limits.e < limits.s) {
                        limits.e = limits.s;
                    }
                    time = self.applyInterval(limits, time);
                    if (time !== null) {
                        self.setStart(time);
                    }
                } else {
                    limits = self.getEndLimits();
                    if (limits.s - self.getStart() < elemSize) {
                        limits.s = self.getStart() + elemSize;
                    }
                    if (limits.s > limits.e) {
                        limits.s = limits.e;
                    }
                    time = self.applyInterval(limits, time);
                    if (time !== null) {
                        self.setEnd(time);
                    }
                }
                return false;
            };
            viewportElement.on('scroll.spandragging', function () {
                moveHandler(lastMouseEvent);
            });
            var scrollElement = $(this).closest('.waveform-viewport');
            scrollElement.on('scroll.timeSpan', moveHandler);
            $(document)[0].addEventListener('mousemove', moveHandler, true);
            var upHandler = function (e) {
                self.stopAutoScroll();
                viewportElement.off('scroll.spandragging');
                e = $.event.fix(e);
                e.stopPropagation();
                $(document)[0].removeEventListener('mouseup', upHandler, true);
                $(document)[0].removeEventListener('mousemove', moveHandler, true);
                $('body').removeClass('drag-horizontal').removeClass('drag-vertical');
                scrollElement.off('scroll.timeSpan');
            };
            $(document)[0].addEventListener('mouseup', upHandler, true);
        };
        this.getStartElement().mousedown(function (e) {
            dragHandler.call(this, e, true);
        });
        this.getEndElement().mousedown(function (e) {
            dragHandler.call(this, e, false);
        });
        var hideHover = function () {
            viewer.setHoverDisplayed(false);
        };
        var showHover = function () {
            viewer.setHoverDisplayed(true);
        };
        $(this.getStartElement()).on('mouseenter', hideHover);
        $(this.getEndElement()).on('mouseenter', hideHover);
        $(this.getStartElement()).on('mouseleave', showHover);
        $(this.getEndElement()).on('mouseleave', showHover);
    };
    ext.call(span);
};
module.exports = Draggable;
},{}],9:[function(_dereq_,module,exports){
var TimeSpanCollection = _dereq_('./time-span-collection'), SparseTimeSpan = _dereq_('./sparse-time-span');
var SparseTimeSpanCollection = function (viewer, options) {
    var collection = new TimeSpanCollection(viewer, options);
    collection.spanFactory = function () {
        var span = new SparseTimeSpan(this, this.dataFile, this.backgroundContainer, this.foregroundContainer, this.style);
        return span;
    };
    collection.addTimeSpan = function (start, end) {
        var prevI = null;
        for (var i = this.timespans.length - 1; i >= 0; i--) {
            var span = this.timespans[i];
            if (span.getEnd() <= start) {
                prevI = i;
                break;
            }
        }
        var prev = null;
        var next = null;
        if (prevI !== null) {
            prev = this.timespans[prevI];
        }
        if (prev) {
            next = prev.getNext();
        } else {
            if (this.timespans.length) {
                next = this.timespans[0];
            } else {
                next = null;
            }
        }
        if (next && next.getStart() < end) {
            var error = new Error('Time spans would overlap');
            error.name = 'TimeSpanError';
            throw error;
        }
        var timespan = this.createSpan();
        var nextI;
        if (prev) {
            nextI = prevI + 1;
        } else {
            nextI = 0;
        }
        this.timespans.splice(nextI, 0, timespan);
        timespan.setStart(start);
        timespan.setEnd(end);
        timespan.setPrev(prev);
        timespan.setNext(next);
        if (prev) {
            prev.setNext(timespan);
        }
        if (next) {
            next.setPrev(timespan);
        }
        timespan.setZoom(this.zoom);
        timespan.render();
        if (this.timeSpanCreatedFn)
            this.timeSpanCreatedFn(timespan);
        return timespan;
    };
    collection.removeTimeSpan = function (timespan) {
        var i;
        for (i in this.timespans) {
            if (this.timespans[i] == timespan) {
                if (timespan.getPrev() !== null) {
                    timespan.getPrev().setNext(timespan.getNext());
                }
                if (timespan.getNext() !== null) {
                    timespan.getNext().setPrev(timespan.getPrev());
                }
                timespan.handleRemoved();
                this.timespans.splice(i, 1);
                break;
            }
        }
    };
    return collection;
};
module.exports = SparseTimeSpanCollection;
},{"./sparse-time-span":10,"./time-span-collection":11}],10:[function(_dereq_,module,exports){
var TimeSpan = _dereq_('./time-span');
var SparseTimeSpan = function (collection, dataFile, backgroundContainer, foregroundContainer, style) {
    var span = new TimeSpan(collection, dataFile, backgroundContainer, foregroundContainer, style);
    var getStartLimits = span.getStartLimits;
    span.getStartLimits = function () {
        var limits = getStartLimits.call(this);
        if (this.getPrev()) {
            limits = this.intersectIntervals(limits, {
                s: this.getPrev().getEnd(),
                e: this.getEnd()
            });
        }
        return limits;
    };
    var getEndLimits = span.getEndLimits;
    span.getEndLimits = function () {
        var limits = getEndLimits.call(this);
        if (this.getNext()) {
            limits = this.intersectIntervals(limits, {
                s: this.getStart(),
                e: this.getNext().getStart()
            });
        }
        return limits;
    };
    return span;
};
module.exports = SparseTimeSpan;
},{"./time-span":13}],11:[function(_dereq_,module,exports){
var ContinuousTimeSpan = _dereq_('./continuous-time-span'), SparseTimeSpan = _dereq_('./sparse-time-span'), Draggable = _dereq_('./draggable'), TimeSpanError = _dereq_('./time-span-error');
var defaultOptions = { minSpanLength: 0 };
var TimeSpanCollection = function (viewer, options) {
    var self = this;
    this.viewer = viewer;
    this.options = $.extend({}, defaultOptions, options);
    this.zoom = 1;
    this.dataFile = outwave.getDataFile();
    var containers = outwave.getTimeSpanContainers();
    this.backgroundContainer = containers.back;
    this.foregroundContainer = containers.front;
    this.style = outwave.getStyle();
    this.timespans = [];
    this.draggableMixin = function (span) {
        Draggable(span, self.viewer, self.style);
        span.setScrollingSpeed(4);
        return span;
    };
    this.spanMixin = null;
    this.setZoom(outwave.getZoomFactor());
    outwave.onZoomFactorChanged(function (zoom) {
        self.setZoom(zoom);
    });
};
TimeSpanCollection.prototype = {
    getAll: function () {
        return this.timespans;
    },
    spanFactory: function () {
        var error = new Error('spanFactory is an abstract method, please use a subclass instead');
        error.name = 'AbstractMethodException';
        throw error;
    },
    createSpan: function () {
        var span = this.spanFactory();
        span.setMinLength(this.options.minSpanLength);
        this.applySpanMixins(span);
        return span;
    },
    applySpanMixins: function (span) {
        this.draggableMixin(span);
        if (this.spanMixin) {
            this.spanMixin(span);
        }
    },
    mergeWithPrev: function (mergingSpan) {
        var spanI = null;
        for (var i = this.timespans.length - 1; i >= 0; i--) {
            var span = this.timespans[i];
            if (span == mergingSpan) {
                spanI = i;
                break;
            }
        }
        if (spanI === null || merginSpan.getPrev() === null) {
            return;
        }
        var prevSpan = mergingSpan.getPrev();
        this.timespans.splice(spanI - 1, 2);
        var createdSpan = this.createSpan();
        if (prevSpan.getPrev())
            prevSpan.getPrev().setNext(createdSpan);
        createdSpan.setStart(prevSpan.getStart());
        createdSpan.setEnd(mergingSpan.getEnd());
        createdSpan.setPrev(prevSpan.getPrev());
        createdSpan.setNext(mergingSpan.getNext());
        if (mergingSpan.getNext())
            mergingSpan.getNext().setPrev(createdSpan);
        this.timespans.splice(spanI - 1, 0, createdSpan);
        createdSpan.render();
        if (this.timeSpanCreatedFn)
            this.timeSpanCreatedFn(createdSpan);
        mergingSpan.handleMerged(prevSpan, createdSpan);
        prevSpan.handleRemoved();
        mergingSpan.handleRemoved();
    },
    split: function (time) {
        var spanI = null;
        for (var i = this.timespans.length - 1; i >= 0; i--) {
            var span = this.timespans[i];
            if (span.getStart() <= time && span.getEnd() >= time) {
                spanI = i;
            }
        }
        if (spanI === null) {
            return;
        }
        var splitSpan = this.timespans[spanI];
        if (time - splitSpan.getStart() < this.options.minSpanLength || splitSpan.getEnd() - time < this.options.minSpanLength) {
            throw new TimeSpanError('split', 'Cannot split annotations here, a time span would be shorter than minimum length');
        }
        this.timespans.splice(spanI, 1);
        var prevSpan = this.createSpan();
        prevSpan.setStart(splitSpan.getStart());
        prevSpan.setEnd(time);
        prevSpan.setPrev(splitSpan.getPrev());
        if (splitSpan.getPrev())
            splitSpan.getPrev().setNext(prevSpan);
        var nextSpan = this.createSpan();
        nextSpan.setStart(time);
        nextSpan.setEnd(splitSpan.getEnd());
        nextSpan.setPrev(prevSpan);
        prevSpan.setNext(nextSpan);
        nextSpan.setNext(splitSpan.getNext());
        if (splitSpan.getNext())
            splitSpan.getNext().setPrev(nextSpan);
        this.timespans.splice(spanI, 0, prevSpan, nextSpan);
        prevSpan.setZoom(this.zoom);
        prevSpan.render();
        nextSpan.setZoom(this.zoom);
        nextSpan.render();
        if (this.timeSpanCreatedFn) {
            this.timeSpanCreatedFn(prevSpan);
            this.timeSpanCreatedFn(nextSpan);
        }
        splitSpan.handleSplit(prevSpan, nextSpan);
        splitSpan.handleRemoved();
    },
    removeTimeSpan: function (timespan) {
        var error = new Error('removeTimeSpan is an abstract method, please use a subclass instead');
        error.name = 'AbstractMethodException';
        throw error;
    },
    setZoom: function (zoom) {
        this.zoom = zoom;
        var i;
        for (i in this.timespans) {
            this.timespans[i].setZoom(this.zoom);
        }
    },
    onTimeSpanCreated: function (fn) {
        this.timeSpanCreatedFn = fn;
    }
};
module.exports = TimeSpanCollection;
},{"./continuous-time-span":7,"./draggable":8,"./sparse-time-span":10,"./time-span-error":12}],12:[function(_dereq_,module,exports){
function TimeSpanError(type, message) {
    this.name = 'TimeSpanError';
    this.message = message;
    this.type = type;
    this.getType = function () {
        return this.type;
    };
}
TimeSpanError.prototype = new Error();
TimeSpanError.prototype.constructor = TimeSpanError;
module.exports = TimeSpanError;
},{}],13:[function(_dereq_,module,exports){
var Utils = _dereq_('../utils'), TimeSpanError = _dereq_('./time-span-error');
var TimeSpan = function (collection, dataFile, backgroundContainer, foregroundContainer, style) {
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
    this.utils = Utils;
    this.splitFn;
    this.mergedFn;
    this.minLength = 0;
    this.data = null;
};
TimeSpan.prototype = {
    getCollection: function () {
        return this.collection;
    },
    setData: function (data) {
        this.data = data;
    },
    getData: function () {
        return this.data;
    },
    onSplit: function (fn) {
        this.splitFn = fn;
    },
    handleSplit: function (prevSpan, nextSpan) {
        if (this.splitFn) {
            this.splitFn(prevSpan, nextSpan);
        }
    },
    onMerged: function (fn) {
        this.mergedFn = fn;
    },
    handleMerged: function (prevSpan, createdSpan) {
        if (this.mergedFn) {
            this.mergedFn(prevSpan, createdSpan);
        }
    },
    getMinLength: function () {
        return this.minLength;
    },
    setMinLength: function (length) {
        this.minLength = length;
    },
    setPrev: function (prev) {
        this.prev = prev;
    },
    setNext: function (next) {
        this.next = next;
    },
    getPrev: function () {
        return this.prev;
    },
    getNext: function () {
        return this.next;
    },
    intersectIntervals: function (a, b) {
        if (!a || !b) {
            return null;
        }
        var s = Math.max(a.s, b.s);
        var e = Math.min(a.e, b.e);
        return s <= e ? {
            s: s,
            e: e
        } : null;
    },
    applyInterval: function (interval, value) {
        if (!interval)
            return null;
        var val = Math.max(interval.s, value);
        val = Math.min(interval.e, val);
        return val;
    },
    inInterval: function (interval, time) {
        return interval && (time >= interval.s && time <= interval.e);
    },
    getStartLimits: function () {
        if (this.getEnd() !== null) {
            return {
                s: 0,
                e: this.getEnd() - this.getMinLength()
            };
        } else {
            return {
                s: 0,
                e: this.dataFile.getLength()
            };
        }
    },
    getEndLimits: function () {
        if (this.getStart() !== null) {
            return {
                s: this.getStart() + this.getMinLength(),
                e: this.dataFile.getLength()
            };
        } else {
            return {
                s: 0,
                e: this.dataFile.getLength()
            };
        }
    },
    canStart: function (start) {
        var limits = this.getStartLimits();
        return this.inInterval(limits, start);
    },
    canEnd: function (end) {
        var limits = this.getEndLimits();
        return this.inInterval(limits, end);
    },
    setStart: function (start) {
        if (!this.canStart(start)) {
            throw new TimeSpanError('set-start', 'Cannot set starting position of time span, time span would overlap another or be shorter than the minimum length');
        }
        this.start = start;
        this.updatePosition();
    },
    setEnd: function (end) {
        if (!this.canEnd(end)) {
            throw new TimeSpanError('set-end', 'Cannot set ending position of time span, time span would overlap another or be shorter than the minimum length');
        }
        this.end = end;
        this.updatePosition();
    },
    getStart: function () {
        return this.start;
    },
    getStartX: function () {
        return this.dataFile.time2px(this.start, this.zoom);
    },
    getEndX: function () {
        return this.dataFile.time2px(this.end, this.zoom);
    },
    getEnd: function () {
        return this.end;
    },
    updatePosition: function () {
        if (!this.rendered) {
            return;
        }
        var startX = this.dataFile.time2px(this.start, this.zoom);
        var endX = this.dataFile.time2px(this.end, this.zoom);
        if (this.positionChangedFn)
            this.positionChangedFn(this.getStart(), this.getEnd());
        var startPos = startX;
        var startEl = this.getStartElement();
        var endEl = this.getEndElement();
        var backEl = this.getBackElement();
        startEl.css('position', 'absolute');
        endEl.css('position', 'absolute');
        backEl.css('position', 'absolute');
        if (this.style.horizontal()) {
            backEl.css({
                'left': startPos,
                'width': endX - startX
            });
            startEl.css('left', startPos);
            var endPos = endX - this.getEndDimensions().w;
            endEl.css('left', endPos);
        } else {
            backEl.css({
                'top': startPos,
                'height': endX - startX
            });
            startEl.css('top', startPos);
            var endPos = endX - this.getEndDimensions().h;
            endEl.css('top', endPos);
        }
    },
    createStartElement: function () {
        return this.style.timeSpanStart();
    },
    createEndElement: function () {
        return this.style.timeSpanEnd();
    },
    createBackElement: function () {
        return this.style.timeSpanBackground();
    },
    getStartElement: function () {
        if (!this.startEl) {
            this.startEl = this.createStartElement();
        }
        return this.startEl;
    },
    getEndElement: function () {
        if (!this.endEl) {
            this.endEl = this.createEndElement();
        }
        return this.endEl;
    },
    getBackElement: function () {
        if (!this.backEl) {
            this.backEl = this.createBackElement();
        }
        return this.backEl;
    },
    getStartDimensions: function () {
        if (!this.startDim) {
            this.startDim = this.utils.getElementDimensions(this.getStartElement());
        }
        return this.startDim;
    },
    getEndDimensions: function () {
        if (!this.endDim) {
            this.endDim = this.utils.getElementDimensions(this.getEndElement());
        }
        return this.endDim;
    },
    render: function () {
        if (this.rendered) {
            this.unRender();
        }
        if (this.start === null || this.end === null || this.zoom === null) {
            return;
        }
        var startEl = this.getStartElement();
        var startDim = this.getStartDimensions();
        var endEl = this.getEndElement();
        var endDim = this.getEndDimensions();
        this.foregroundContainer.append(startEl, endEl);
        var backEl = this.getBackElement();
        this.backgroundContainer.append(backEl);
        this.rendered = true;
        this.updatePosition();
        var self = this;
    },
    setZoom: function (zoom) {
        this.zoom = zoom;
        this.updatePosition();
    },
    unRender: function () {
        if (!this.rendered) {
            return;
        }
        if (this.startEl) {
            this.startEl.remove();
            this.startEl = null;
        }
        if (this.endEl) {
            this.endEl.remove();
            this.endEl = null;
        }
        if (this.backEl) {
            this.backEl.remove();
            this.backEl = null;
        }
        this.startDim = null;
        this.endDim = null;
        this.rendered = false;
    },
    onPositionChanged: function (fn) {
        this.positionChangedFn = fn;
    },
    onRemoved: function (fn) {
        this.removedFn = fn;
    },
    handleRemoved: function () {
        this.unRender();
        if (this.removedFn)
            this.removedFn();
    },
    remove: function () {
        this.collection.removeTimeSpan(this);
    }
};
module.exports = TimeSpan;
},{"../utils":14,"./time-span-error":12}],14:[function(_dereq_,module,exports){
var Utils = new function () {
        this.scrollbarDim = null;
        this.dimBase = null;
        this.setDimBase = function (element) {
            this.dimBase = $(element);
        };
        this.getElementDimensions = function (element) {
            var e = $(element).clone();
            e.css({ position: 'absolute' });
            var base = $(document.body);
            if (this.dimBase) {
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
        this.getScrollbarDim = function () {
            if (!this.scrollbarDim) {
                var elem = $('<div style="position: absolute; width: 100px; height: 100px; overflow: auto; visibility: hidden;"><div style="width: 200px; height: 200px;"></div></div>');
                $(document.body).prepend(elem);
                elem.scrollTop(500);
                var vScroll = elem.scrollTop();
                elem.scrollLeft(500);
                var hScroll = elem.scrollLeft();
                elem.remove();
                this.scrollbarDim = {
                    height: vScroll - 100,
                    width: hScroll - 100
                };
            }
            return this.scrollbarDim;
        };
        this.formatTime = function (time) {
            var zeroPad = function (num, places) {
                var zero = places - num.toString().length + 1;
                return Array(+(zero > 0 && zero)).join('0') + num;
            };
            var hrs = Math.floor(time / (60 * 60));
            var mins = Math.floor((time - hrs * 60 * 60) / 60);
            var secs = Math.floor(time - hrs * 60 * 60 - mins * 60);
            var millis = Math.round((time - Math.floor(time)) * 1000) / 1000;
            var ret = '';
            if (hrs != 0) {
                ret += hrs + ':';
            }
            if (mins != 0) {
                var pad = 2;
                if (hrs == 0) {
                    pad = 1;
                }
                ret += zeroPad(mins, pad) + ':';
            }
            var pad = 2;
            if (hrs == 0 && mins == 0) {
                pad = 1;
            }
            ret += zeroPad(secs, pad);
            millis = millis.toString().slice(2);
            if (millis != '') {
                ret += '.' + millis;
            }
            return ret;
        };
    }();
module.exports = Utils;
},{}],15:[function(_dereq_,module,exports){
(function (Buffer){
//
// jDataView by Vjeux <vjeuxx@gmail.com> - Jan 2010
// Continued by RReverser <me@rreverser.com> - Feb 2013
//
// A unique way to work with a binary file in the browser
// http://github.com/jDataView/jDataView
// http://jDataView.github.io/

	(function (global) {

	'use strict';

	var compatibility = {
		// NodeJS Buffer in v0.5.5 and newer
		NodeBuffer: 'Buffer' in global && 'readInt16LE' in Buffer.prototype,
		DataView: 'DataView' in global && (
			'getFloat64' in DataView.prototype ||            // Chrome
			'getFloat64' in new DataView(new ArrayBuffer(1)) // Node
		),
		ArrayBuffer: 'ArrayBuffer' in global,
		PixelData: 'CanvasPixelArray' in global && 'ImageData' in global && 'document' in global
	};

	// we don't want to bother with old Buffer implementation
	if (compatibility.NodeBuffer) {
		(function (buffer) {
			try {
				buffer.writeFloatLE(Infinity, 0);
			} catch (e) {
				compatibility.NodeBuffer = false;
			}
		})(new Buffer(4));
	}

	if (compatibility.PixelData) {
		var createPixelData = function (byteLength, buffer) {
			var data = createPixelData.context2d.createImageData((byteLength + 3) / 4, 1).data;
			data.byteLength = byteLength;
			if (buffer !== undefined) {
				for (var i = 0; i < byteLength; i++) {
					data[i] = buffer[i];
				}
			}
			return data;
		};
		createPixelData.context2d = document.createElement('canvas').getContext('2d');
	}

	var dataTypes = {
		'Int8': 1,
		'Int16': 2,
		'Int32': 4,
		'Uint8': 1,
		'Uint16': 2,
		'Uint32': 4,
		'Float32': 4,
		'Float64': 8
	};

	var nodeNaming = {
		'Int8': 'Int8',
		'Int16': 'Int16',
		'Int32': 'Int32',
		'Uint8': 'UInt8',
		'Uint16': 'UInt16',
		'Uint32': 'UInt32',
		'Float32': 'Float',
		'Float64': 'Double'
	};

	function arrayFrom(arrayLike, forceCopy) {
		return (!forceCopy && (arrayLike instanceof Array)) ? arrayLike : Array.prototype.slice.call(arrayLike);
	}

	function defined(value, defaultValue) {
		return value !== undefined ? value : defaultValue;
	}

	function jDataView(buffer, byteOffset, byteLength, littleEndian) {
		/* jshint validthis:true */

		if (buffer instanceof jDataView) {
			var result = buffer.slice(byteOffset, byteOffset + byteLength);
			result._littleEndian = defined(littleEndian, result._littleEndian);
			return result;
		}

		if (!(this instanceof jDataView)) {
			return new jDataView(buffer, byteOffset, byteLength, littleEndian);
		}

		this.buffer = buffer = jDataView.wrapBuffer(buffer);

		// Check parameters and existing functionnalities
		this._isArrayBuffer = compatibility.ArrayBuffer && buffer instanceof ArrayBuffer;
		this._isPixelData = compatibility.PixelData && buffer instanceof CanvasPixelArray;
		this._isDataView = compatibility.DataView && this._isArrayBuffer;
		this._isNodeBuffer = compatibility.NodeBuffer && buffer instanceof Buffer;

		// Handle Type Errors
		if (!this._isNodeBuffer && !this._isArrayBuffer && !this._isPixelData && !(buffer instanceof Array)) {
			throw new TypeError('jDataView buffer has an incompatible type');
		}

		// Default Values
		this._littleEndian = !!littleEndian;

		var bufferLength = 'byteLength' in buffer ? buffer.byteLength : buffer.length;
		this.byteOffset = byteOffset = defined(byteOffset, 0);
		this.byteLength = byteLength = defined(byteLength, bufferLength - byteOffset);

		if (!this._isDataView) {
			this._checkBounds(byteOffset, byteLength, bufferLength);
		} else {
			this._view = new DataView(buffer, byteOffset, byteLength);
		}

		// Create uniform methods (action wrappers) for the following data types

		this._engineAction =
			this._isDataView
				? this._dataViewAction
			: this._isNodeBuffer
				? this._nodeBufferAction
			: this._isArrayBuffer
				? this._arrayBufferAction
			: this._arrayAction;
	}

	function getCharCodes(string) {
		if (compatibility.NodeBuffer) {
			return new Buffer(string, 'binary');
		}

		var Type = compatibility.ArrayBuffer ? Uint8Array : Array,
			codes = new Type(string.length);

		for (var i = 0, length = string.length; i < length; i++) {
			codes[i] = string.charCodeAt(i) & 0xff;
		}
		return codes;
	}

	// mostly internal function for wrapping any supported input (String or Array-like) to best suitable buffer format
	jDataView.wrapBuffer = function (buffer) {
		switch (typeof buffer) {
			case 'number':
				if (compatibility.NodeBuffer) {
					buffer = new Buffer(buffer);
					buffer.fill(0);
				} else
				if (compatibility.ArrayBuffer) {
					buffer = new Uint8Array(buffer).buffer;
				} else
				if (compatibility.PixelData) {
					buffer = createPixelData(buffer);
				} else {
					buffer = new Array(buffer);
					for (var i = 0; i < buffer.length; i++) {
						buffer[i] = 0;
					}
				}
				return buffer;

			case 'string':
				buffer = getCharCodes(buffer);
				/* falls through */
			default:
				if ('length' in buffer && !((compatibility.NodeBuffer && buffer instanceof Buffer) || (compatibility.ArrayBuffer && buffer instanceof ArrayBuffer) || (compatibility.PixelData && buffer instanceof CanvasPixelArray))) {
					if (compatibility.NodeBuffer) {
						buffer = new Buffer(buffer);
					} else
					if (compatibility.ArrayBuffer) {
						if (!(buffer instanceof ArrayBuffer)) {
							buffer = new Uint8Array(buffer).buffer;
							// bug in Node.js <= 0.8:
							if (!(buffer instanceof ArrayBuffer)) {
								buffer = new Uint8Array(arrayFrom(buffer, true)).buffer;
							}
						}
					} else
					if (compatibility.PixelData) {
						buffer = createPixelData(buffer.length, buffer);
					} else {
						buffer = arrayFrom(buffer);
					}
				}
				return buffer;
		}
	};

	function pow2(n) {
		return (n >= 0 && n < 31) ? (1 << n) : (pow2[n] || (pow2[n] = Math.pow(2, n)));
	}

	// left for backward compatibility
	jDataView.createBuffer = function () {
		return jDataView.wrapBuffer(arguments);
	};

	function Uint64(lo, hi) {
		this.lo = lo;
		this.hi = hi;
	}

	jDataView.Uint64 = Uint64;

	Uint64.prototype = {
		valueOf: function () {
			return this.lo + pow2(32) * this.hi;
		},

		toString: function () {
			return Number.prototype.toString.apply(this.valueOf(), arguments);
		}
	};

	Uint64.fromNumber = function (number) {
		var hi = Math.floor(number / pow2(32)),
			lo = number - hi * pow2(32);

		return new Uint64(lo, hi);
	};

	function Int64(lo, hi) {
		Uint64.apply(this, arguments);
	}

	jDataView.Int64 = Int64;

	Int64.prototype = 'create' in Object ? Object.create(Uint64.prototype) : new Uint64();

	Int64.prototype.valueOf = function () {
		if (this.hi < pow2(31)) {
			return Uint64.prototype.valueOf.apply(this, arguments);
		}
		return -((pow2(32) - this.lo) + pow2(32) * (pow2(32) - 1 - this.hi));
	};

	Int64.fromNumber = function (number) {
		var lo, hi;
		if (number >= 0) {
			var unsigned = Uint64.fromNumber(number);
			lo = unsigned.lo;
			hi = unsigned.hi;
		} else {
			hi = Math.floor(number / pow2(32));
			lo = number - hi * pow2(32);
			hi += pow2(32);
		}
		return new Int64(lo, hi);
	};

	jDataView.prototype = {
		_offset: 0,
		_bitOffset: 0,

		compatibility: compatibility,

		_checkBounds: function (byteOffset, byteLength, maxLength) {
			// Do additional checks to simulate DataView
			if (typeof byteOffset !== 'number') {
				throw new TypeError('Offset is not a number.');
			}
			if (typeof byteLength !== 'number') {
				throw new TypeError('Size is not a number.');
			}
			if (byteLength < 0) {
				throw new RangeError('Length is negative.');
			}
			if (byteOffset < 0 || byteOffset + byteLength > defined(maxLength, this.byteLength)) {
				throw new RangeError('Offsets are out of bounds.');
			}
		},

		_action: function (type, isReadAction, byteOffset, littleEndian, value) {
			return this._engineAction(
				type,
				isReadAction,
				defined(byteOffset, this._offset),
				defined(littleEndian, this._littleEndian),
				value
			);
		},

		_dataViewAction: function (type, isReadAction, byteOffset, littleEndian, value) {
			// Move the internal offset forward
			this._offset = byteOffset + dataTypes[type];
			return isReadAction ? this._view['get' + type](byteOffset, littleEndian) : this._view['set' + type](byteOffset, value, littleEndian);
		},

		_nodeBufferAction: function (type, isReadAction, byteOffset, littleEndian, value) {
			// Move the internal offset forward
			this._offset = byteOffset + dataTypes[type];
			var nodeName = nodeNaming[type] + ((type === 'Int8' || type === 'Uint8') ? '' : littleEndian ? 'LE' : 'BE');
			byteOffset += this.byteOffset;
			return isReadAction ? this.buffer['read' + nodeName](byteOffset) : this.buffer['write' + nodeName](value, byteOffset);
		},

		_arrayBufferAction: function (type, isReadAction, byteOffset, littleEndian, value) {
			var size = dataTypes[type], TypedArray = global[type + 'Array'], typedArray;

			littleEndian = defined(littleEndian, this._littleEndian);

			// ArrayBuffer: we use a typed array of size 1 from original buffer if alignment is good and from slice when it's not
			if (size === 1 || ((this.byteOffset + byteOffset) % size === 0 && littleEndian)) {
				typedArray = new TypedArray(this.buffer, this.byteOffset + byteOffset, 1);
				this._offset = byteOffset + size;
				return isReadAction ? typedArray[0] : (typedArray[0] = value);
			} else {
				var bytes = new Uint8Array(isReadAction ? this.getBytes(size, byteOffset, littleEndian, true) : size);
				typedArray = new TypedArray(bytes.buffer, 0, 1);

				if (isReadAction) {
					return typedArray[0];
				} else {
					typedArray[0] = value;
					this._setBytes(byteOffset, bytes, littleEndian);
				}
			}
		},

		_arrayAction: function (type, isReadAction, byteOffset, littleEndian, value) {
			return isReadAction ? this['_get' + type](byteOffset, littleEndian) : this['_set' + type](byteOffset, value, littleEndian);
		},

		// Helpers

		_getBytes: function (length, byteOffset, littleEndian) {
			littleEndian = defined(littleEndian, this._littleEndian);
			byteOffset = defined(byteOffset, this._offset);
			length = defined(length, this.byteLength - byteOffset);

			this._checkBounds(byteOffset, length);

			byteOffset += this.byteOffset;

			this._offset = byteOffset - this.byteOffset + length;

			var result = this._isArrayBuffer
						 ? new Uint8Array(this.buffer, byteOffset, length)
						 : (this.buffer.slice || Array.prototype.slice).call(this.buffer, byteOffset, byteOffset + length);

			return littleEndian || length <= 1 ? result : arrayFrom(result).reverse();
		},

		// wrapper for external calls (do not return inner buffer directly to prevent it's modifying)
		getBytes: function (length, byteOffset, littleEndian, toArray) {
			var result = this._getBytes(length, byteOffset, defined(littleEndian, true));
			return toArray ? arrayFrom(result) : result;
		},

		_setBytes: function (byteOffset, bytes, littleEndian) {
			var length = bytes.length;

			// needed for Opera
			if (length === 0) {
				return;
			}

			littleEndian = defined(littleEndian, this._littleEndian);
			byteOffset = defined(byteOffset, this._offset);

			this._checkBounds(byteOffset, length);

			if (!littleEndian && length > 1) {
				bytes = arrayFrom(bytes, true).reverse();
			}

			byteOffset += this.byteOffset;

			if (this._isArrayBuffer) {
				new Uint8Array(this.buffer, byteOffset, length).set(bytes);
			}
			else {
				if (this._isNodeBuffer) {
					// workaround for Node.js v0.11.6 (`new Buffer(bufferInstance)` call corrupts original data)
					(bytes instanceof Buffer ? bytes : new Buffer(bytes)).copy(this.buffer, byteOffset);
				} else {
					for (var i = 0; i < length; i++) {
						this.buffer[byteOffset + i] = bytes[i];
					}
				}
			}

			this._offset = byteOffset - this.byteOffset + length;
		},

		setBytes: function (byteOffset, bytes, littleEndian) {
			this._setBytes(byteOffset, bytes, defined(littleEndian, true));
		},

		getString: function (byteLength, byteOffset, encoding) {
			if (this._isNodeBuffer) {
				byteOffset = defined(byteOffset, this._offset);
				byteLength = defined(byteLength, this.byteLength - byteOffset);

				this._checkBounds(byteOffset, byteLength);

				this._offset = byteOffset + byteLength;
				return this.buffer.toString(encoding || 'binary', this.byteOffset + byteOffset, this.byteOffset + this._offset);
			}
			var bytes = this._getBytes(byteLength, byteOffset, true), string = '';
			byteLength = bytes.length;
			for (var i = 0; i < byteLength; i++) {
				string += String.fromCharCode(bytes[i]);
			}
			if (encoding === 'utf8') {
				string = decodeURIComponent(escape(string));
			}
			return string;
		},

		setString: function (byteOffset, subString, encoding) {
			if (this._isNodeBuffer) {
				byteOffset = defined(byteOffset, this._offset);
				this._checkBounds(byteOffset, subString.length);
				this._offset = byteOffset + this.buffer.write(subString, this.byteOffset + byteOffset, encoding || 'binary');
				return;
			}
			if (encoding === 'utf8') {
				subString = unescape(encodeURIComponent(subString));
			}
			this._setBytes(byteOffset, getCharCodes(subString), true);
		},

		getChar: function (byteOffset) {
			return this.getString(1, byteOffset);
		},

		setChar: function (byteOffset, character) {
			this.setString(byteOffset, character);
		},

		tell: function () {
			return this._offset;
		},

		seek: function (byteOffset) {
			this._checkBounds(byteOffset, 0);
			/* jshint boss: true */
			return this._offset = byteOffset;
		},

		skip: function (byteLength) {
			return this.seek(this._offset + byteLength);
		},

		slice: function (start, end, forceCopy) {
			function normalizeOffset(offset, byteLength) {
				return offset < 0 ? offset + byteLength : offset;
			}

			start = normalizeOffset(start, this.byteLength);
			end = normalizeOffset(defined(end, this.byteLength), this.byteLength);

			return forceCopy
				   ? new jDataView(this.getBytes(end - start, start, true, true), undefined, undefined, this._littleEndian)
				   : new jDataView(this.buffer, this.byteOffset + start, end - start, this._littleEndian);
		},

		// Compatibility functions

		_getFloat64: function (byteOffset, littleEndian) {
			var b = this._getBytes(8, byteOffset, littleEndian),

				sign = 1 - (2 * (b[7] >> 7)),
				exponent = ((((b[7] << 1) & 0xff) << 3) | (b[6] >> 4)) - ((1 << 10) - 1),

			// Binary operators such as | and << operate on 32 bit values, using + and Math.pow(2) instead
				mantissa = ((b[6] & 0x0f) * pow2(48)) + (b[5] * pow2(40)) + (b[4] * pow2(32)) +
							(b[3] * pow2(24)) + (b[2] * pow2(16)) + (b[1] * pow2(8)) + b[0];

			if (exponent === 1024) {
				if (mantissa !== 0) {
					return NaN;
				} else {
					return sign * Infinity;
				}
			}

			if (exponent === -1023) { // Denormalized
				return sign * mantissa * pow2(-1022 - 52);
			}

			return sign * (1 + mantissa * pow2(-52)) * pow2(exponent);
		},

		_getFloat32: function (byteOffset, littleEndian) {
			var b = this._getBytes(4, byteOffset, littleEndian),

				sign = 1 - (2 * (b[3] >> 7)),
				exponent = (((b[3] << 1) & 0xff) | (b[2] >> 7)) - 127,
				mantissa = ((b[2] & 0x7f) << 16) | (b[1] << 8) | b[0];

			if (exponent === 128) {
				if (mantissa !== 0) {
					return NaN;
				} else {
					return sign * Infinity;
				}
			}

			if (exponent === -127) { // Denormalized
				return sign * mantissa * pow2(-126 - 23);
			}

			return sign * (1 + mantissa * pow2(-23)) * pow2(exponent);
		},

		_get64: function (Type, byteOffset, littleEndian) {
			littleEndian = defined(littleEndian, this._littleEndian);
			byteOffset = defined(byteOffset, this._offset);

			var parts = littleEndian ? [0, 4] : [4, 0];

			for (var i = 0; i < 2; i++) {
				parts[i] = this.getUint32(byteOffset + parts[i], littleEndian);
			}

			this._offset = byteOffset + 8;

			return new Type(parts[0], parts[1]);
		},

		getInt64: function (byteOffset, littleEndian) {
			return this._get64(Int64, byteOffset, littleEndian);
		},

		getUint64: function (byteOffset, littleEndian) {
			return this._get64(Uint64, byteOffset, littleEndian);
		},

		_getInt32: function (byteOffset, littleEndian) {
			var b = this._getBytes(4, byteOffset, littleEndian);
			return (b[3] << 24) | (b[2] << 16) | (b[1] << 8) | b[0];
		},

		_getUint32: function (byteOffset, littleEndian) {
			return this._getInt32(byteOffset, littleEndian) >>> 0;
		},

		_getInt16: function (byteOffset, littleEndian) {
			return (this._getUint16(byteOffset, littleEndian) << 16) >> 16;
		},

		_getUint16: function (byteOffset, littleEndian) {
			var b = this._getBytes(2, byteOffset, littleEndian);
			return (b[1] << 8) | b[0];
		},

		_getInt8: function (byteOffset) {
			return (this._getUint8(byteOffset) << 24) >> 24;
		},

		_getUint8: function (byteOffset) {
			return this._getBytes(1, byteOffset)[0];
		},

		_getBitRangeData: function (bitLength, byteOffset) {
			var startBit = (defined(byteOffset, this._offset) << 3) + this._bitOffset,
				endBit = startBit + bitLength,
				start = startBit >>> 3,
				end = (endBit + 7) >>> 3,
				b = this._getBytes(end - start, start, true),
				wideValue = 0;

			/* jshint boss: true */
			if (this._bitOffset = endBit & 7) {
				this._bitOffset -= 8;
			}

			for (var i = 0, length = b.length; i < length; i++) {
				wideValue = (wideValue << 8) | b[i];
			}

			return {
				start: start,
				bytes: b,
				wideValue: wideValue
			};
		},

		getSigned: function (bitLength, byteOffset) {
			var shift = 32 - bitLength;
			return (this.getUnsigned(bitLength, byteOffset) << shift) >> shift;
		},

		getUnsigned: function (bitLength, byteOffset) {
			var value = this._getBitRangeData(bitLength, byteOffset).wideValue >>> -this._bitOffset;
			return bitLength < 32 ? (value & ~(-1 << bitLength)) : value;
		},

		_setBinaryFloat: function (byteOffset, value, mantSize, expSize, littleEndian) {
			var signBit = value < 0 ? 1 : 0,
				exponent,
				mantissa,
				eMax = ~(-1 << (expSize - 1)),
				eMin = 1 - eMax;

			if (value < 0) {
				value = -value;
			}

			if (value === 0) {
				exponent = 0;
				mantissa = 0;
			} else if (isNaN(value)) {
				exponent = 2 * eMax + 1;
				mantissa = 1;
			} else if (value === Infinity) {
				exponent = 2 * eMax + 1;
				mantissa = 0;
			} else {
				exponent = Math.floor(Math.log(value) / Math.LN2);
				if (exponent >= eMin && exponent <= eMax) {
					mantissa = Math.floor((value * pow2(-exponent) - 1) * pow2(mantSize));
					exponent += eMax;
				} else {
					mantissa = Math.floor(value / pow2(eMin - mantSize));
					exponent = 0;
				}
			}

			var b = [];
			while (mantSize >= 8) {
				b.push(mantissa % 256);
				mantissa = Math.floor(mantissa / 256);
				mantSize -= 8;
			}
			exponent = (exponent << mantSize) | mantissa;
			expSize += mantSize;
			while (expSize >= 8) {
				b.push(exponent & 0xff);
				exponent >>>= 8;
				expSize -= 8;
			}
			b.push((signBit << expSize) | exponent);

			this._setBytes(byteOffset, b, littleEndian);
		},

		_setFloat32: function (byteOffset, value, littleEndian) {
			this._setBinaryFloat(byteOffset, value, 23, 8, littleEndian);
		},

		_setFloat64: function (byteOffset, value, littleEndian) {
			this._setBinaryFloat(byteOffset, value, 52, 11, littleEndian);
		},

		_set64: function (Type, byteOffset, value, littleEndian) {
			if (!(value instanceof Type)) {
				value = Type.fromNumber(value);
			}

			littleEndian = defined(littleEndian, this._littleEndian);
			byteOffset = defined(byteOffset, this._offset);

			var parts = littleEndian ? {lo: 0, hi: 4} : {lo: 4, hi: 0};

			for (var partName in parts) {
				this.setUint32(byteOffset + parts[partName], value[partName], littleEndian);
			}

			this._offset = byteOffset + 8;
		},

		setInt64: function (byteOffset, value, littleEndian) {
			this._set64(Int64, byteOffset, value, littleEndian);
		},

		setUint64: function (byteOffset, value, littleEndian) {
			this._set64(Uint64, byteOffset, value, littleEndian);
		},

		_setUint32: function (byteOffset, value, littleEndian) {
			this._setBytes(byteOffset, [
				value & 0xff,
				(value >>> 8) & 0xff,
				(value >>> 16) & 0xff,
				value >>> 24
			], littleEndian);
		},

		_setUint16: function (byteOffset, value, littleEndian) {
			this._setBytes(byteOffset, [
				value & 0xff,
				(value >>> 8) & 0xff
			], littleEndian);
		},

		_setUint8: function (byteOffset, value) {
			this._setBytes(byteOffset, [value & 0xff]);
		},

		setUnsigned: function (byteOffset, value, bitLength) {
			var data = this._getBitRangeData(bitLength, byteOffset),
				wideValue = data.wideValue,
				b = data.bytes;

			wideValue &= ~(~(-1 << bitLength) << -this._bitOffset); // clearing bit range before binary "or"
			wideValue |= (bitLength < 32 ? (value & ~(-1 << bitLength)) : value) << -this._bitOffset; // setting bits

			for (var i = b.length - 1; i >= 0; i--) {
				b[i] = wideValue & 0xff;
				wideValue >>>= 8;
			}

			this._setBytes(data.start, b, true);
		}
	};

	var proto = jDataView.prototype;

	for (var type in dataTypes) {
		(function (type) {
			proto['get' + type] = function (byteOffset, littleEndian) {
				return this._action(type, true, byteOffset, littleEndian);
			};
			proto['set' + type] = function (byteOffset, value, littleEndian) {
				this._action(type, false, byteOffset, littleEndian, value);
			};
		})(type);
	}

	proto._setInt32 = proto._setUint32;
	proto._setInt16 = proto._setUint16;
	proto._setInt8 = proto._setUint8;
	proto.setSigned = proto.setUnsigned;

	for (var method in proto) {
		if (method.slice(0, 3) === 'set') {
			(function (type) {
				proto['write' + type] = function () {
					Array.prototype.unshift.call(arguments, undefined);
					this['set' + type].apply(this, arguments);
				};
			})(method.slice(3));
		}
	}

	if (typeof module !== 'undefined' && typeof module.exports === 'object') {
		module.exports = jDataView;
	} else
	if (typeof define === 'function' && define.amd) {
		define([], function () { return jDataView });
	} else {
		var oldGlobal = global.jDataView;
		(global.jDataView = jDataView).noConflict = function () {
			global.jDataView = oldGlobal;
			return this;
		};
	}

	})((function () { /* jshint strict: false */ return this })())
}).call(this,_dereq_("buffer").Buffer)
},{"buffer":18}],16:[function(_dereq_,module,exports){
/*! Copyright (c) 2013 Brandon Aaron (http://brandon.aaron.sh)
 * Licensed under the MIT License (LICENSE.txt).
 *
 * Version: 3.1.9
 *
 * Requires: jQuery 1.2.2+
 */

(function (factory) {
    if ( typeof define === 'function' && define.amd ) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS style for Browserify
        module.exports = factory;
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {

    var toFix  = ['wheel', 'mousewheel', 'DOMMouseScroll', 'MozMousePixelScroll'],
        toBind = ( 'onwheel' in document || document.documentMode >= 9 ) ?
                    ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'],
        slice  = Array.prototype.slice,
        nullLowestDeltaTimeout, lowestDelta;

    if ( $.event.fixHooks ) {
        for ( var i = toFix.length; i; ) {
            $.event.fixHooks[ toFix[--i] ] = $.event.mouseHooks;
        }
    }

    var special = $.event.special.mousewheel = {
        version: '3.1.9',

        setup: function() {
            if ( this.addEventListener ) {
                for ( var i = toBind.length; i; ) {
                    this.addEventListener( toBind[--i], handler, false );
                }
            } else {
                this.onmousewheel = handler;
            }
            // Store the line height and page height for this particular element
            $.data(this, 'mousewheel-line-height', special.getLineHeight(this));
            $.data(this, 'mousewheel-page-height', special.getPageHeight(this));
        },

        teardown: function() {
            if ( this.removeEventListener ) {
                for ( var i = toBind.length; i; ) {
                    this.removeEventListener( toBind[--i], handler, false );
                }
            } else {
                this.onmousewheel = null;
            }
        },

        getLineHeight: function(elem) {
            return parseInt($(elem)['offsetParent' in $.fn ? 'offsetParent' : 'parent']().css('fontSize'), 10);
        },

        getPageHeight: function(elem) {
            return $(elem).height();
        },

        settings: {
            adjustOldDeltas: true
        }
    };

    $.fn.extend({
        mousewheel: function(fn) {
            return fn ? this.bind('mousewheel', fn) : this.trigger('mousewheel');
        },

        unmousewheel: function(fn) {
            return this.unbind('mousewheel', fn);
        }
    });


    function handler(event) {
        var orgEvent   = event || window.event,
            args       = slice.call(arguments, 1),
            delta      = 0,
            deltaX     = 0,
            deltaY     = 0,
            absDelta   = 0;
        event = $.event.fix(orgEvent);
        event.type = 'mousewheel';

        // Old school scrollwheel delta
        if ( 'detail'      in orgEvent ) { deltaY = orgEvent.detail * -1;      }
        if ( 'wheelDelta'  in orgEvent ) { deltaY = orgEvent.wheelDelta;       }
        if ( 'wheelDeltaY' in orgEvent ) { deltaY = orgEvent.wheelDeltaY;      }
        if ( 'wheelDeltaX' in orgEvent ) { deltaX = orgEvent.wheelDeltaX * -1; }

        // Firefox < 17 horizontal scrolling related to DOMMouseScroll event
        if ( 'axis' in orgEvent && orgEvent.axis === orgEvent.HORIZONTAL_AXIS ) {
            deltaX = deltaY * -1;
            deltaY = 0;
        }

        // Set delta to be deltaY or deltaX if deltaY is 0 for backwards compatabilitiy
        delta = deltaY === 0 ? deltaX : deltaY;

        // New school wheel delta (wheel event)
        if ( 'deltaY' in orgEvent ) {
            deltaY = orgEvent.deltaY * -1;
            delta  = deltaY;
        }
        if ( 'deltaX' in orgEvent ) {
            deltaX = orgEvent.deltaX;
            if ( deltaY === 0 ) { delta  = deltaX * -1; }
        }

        // No change actually happened, no reason to go any further
        if ( deltaY === 0 && deltaX === 0 ) { return; }

        // Need to convert lines and pages to pixels if we aren't already in pixels
        // There are three delta modes:
        //   * deltaMode 0 is by pixels, nothing to do
        //   * deltaMode 1 is by lines
        //   * deltaMode 2 is by pages
        if ( orgEvent.deltaMode === 1 ) {
            var lineHeight = $.data(this, 'mousewheel-line-height');
            delta  *= lineHeight;
            deltaY *= lineHeight;
            deltaX *= lineHeight;
        } else if ( orgEvent.deltaMode === 2 ) {
            var pageHeight = $.data(this, 'mousewheel-page-height');
            delta  *= pageHeight;
            deltaY *= pageHeight;
            deltaX *= pageHeight;
        }

        // Store lowest absolute delta to normalize the delta values
        absDelta = Math.max( Math.abs(deltaY), Math.abs(deltaX) );

        if ( !lowestDelta || absDelta < lowestDelta ) {
            lowestDelta = absDelta;

            // Adjust older deltas if necessary
            if ( shouldAdjustOldDeltas(orgEvent, absDelta) ) {
                lowestDelta /= 40;
            }
        }

        // Adjust older deltas if necessary
        if ( shouldAdjustOldDeltas(orgEvent, absDelta) ) {
            // Divide all the things by 40!
            delta  /= 40;
            deltaX /= 40;
            deltaY /= 40;
        }

        // Get a whole, normalized value for the deltas
        delta  = Math[ delta  >= 1 ? 'floor' : 'ceil' ](delta  / lowestDelta);
        deltaX = Math[ deltaX >= 1 ? 'floor' : 'ceil' ](deltaX / lowestDelta);
        deltaY = Math[ deltaY >= 1 ? 'floor' : 'ceil' ](deltaY / lowestDelta);

        // Add information to the event object
        event.deltaX = deltaX;
        event.deltaY = deltaY;
        event.deltaFactor = lowestDelta;
        // Go ahead and set deltaMode to 0 since we converted to pixels
        // Although this is a little odd since we overwrite the deltaX/Y
        // properties with normalized deltas.
        event.deltaMode = 0;

        // Add event and delta to the front of the arguments
        args.unshift(event, delta, deltaX, deltaY);

        // Clearout lowestDelta after sometime to better
        // handle multiple device types that give different
        // a different lowestDelta
        // Ex: trackpad = 3 and mouse wheel = 120
        if (nullLowestDeltaTimeout) { clearTimeout(nullLowestDeltaTimeout); }
        nullLowestDeltaTimeout = setTimeout(nullLowestDelta, 200);

        return ($.event.dispatch || $.event.handle).apply(this, args);
    }

    function nullLowestDelta() {
        lowestDelta = null;
    }

    function shouldAdjustOldDeltas(orgEvent, absDelta) {
        // If this is an older event and the delta is divisable by 120,
        // then we are assuming that the browser is treating this as an
        // older mouse wheel event and that we should divide the deltas
        // by 40 to try and get a more usable deltaFactor.
        // Side note, this actually impacts the reported scroll distance
        // in older browsers and can cause scrolling to be slower than native.
        // Turn this off by setting $.event.special.mousewheel.settings.adjustOldDeltas to false.
        return special.settings.adjustOldDeltas && orgEvent.type === 'mousewheel' && absDelta % 120 === 0;
    }

}));
},{}],17:[function(_dereq_,module,exports){
var _mouseWheel = _dereq_('./vendor/jquery-mousewheel'), Utils = _dereq_('./utils'), Style = _dereq_('./style'), Segment = _dereq_('./segment'), SegmentCollection = _dereq_('./segment-collection');
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
        hover: true,
        mono: false,
        autoScrollType: 'jerky',
        autoScrollTimeout: 800,
        zoomChangeFactor: 2
    };
var Viewer = function (container, file, options) {
    var self = this;
    this.zoom = 40;
    container = $(container);
    this.containerEl = container.eq(0);
    this.containerEl.empty();
    this.dataFile = file;
    this.options = $.extend(this.getDefaultOptions(), options);
    this.options.style = new Style();
    if (options.style) {
        $.extend(this.options.style, options.style);
    }
    this.dataFile.setMono(this.options.mono);
    this.style = this.options.style;
    this.zoomChangedHnd = [];
    this.zoomFactorChangedHnd = [];
    this.scrollbarEl = $('<div class="outwave"></div>').css(this.style.horizontal() ? 'height' : 'width', this.options.height);
    Utils.setDimBase(this.scrollbarEl);
    this.scrollbarEl.addClass(this.style.vertical() ? 'vertical' : 'horizontal');
    if (this.style.vertical()) {
        this.scrollbarEl.css('height', '100%');
    }
    this.containerEl.append(this.scrollbarEl);
    var self = this;
    this.width = this.scrollbarEl.width();
    this.segmentsEl = $('<div style="position: relative";></div>');
    this.segmentsEl.height(this.internalHeight());
    this.scrollbarEl.append(this.segmentsEl);
    this.backgroundEl = $('<div style="position: absolute; z-index: 0;" class="background">');
    this.foregroundEl = $('<div style="position: absolute; z-index: 5;" class="foreground">');
    this.timeSpanEl = $('<div style="width: 100%; height: 100%; position: absolute;" class="timeSpans"></div>');
    this.foregroundEl.append(this.timeSpanEl);
    this.cursorEl = this.options.style.cursor();
    this.cursorDim = Utils.getElementDimensions(this.cursorEl);
    this.cursorEl.css({
        position: 'absolute',
        display: 'none',
        'z-index': 10
    });
    this.foregroundEl.append(this.cursorEl);
    this.updateDimensions();
    var element = document.createElement('x');
    element.style.cssText = 'pointer-events:auto';
    var eventsWorking = element.style.pointerEvents === 'auto';
    if (!eventsWorking) {
        this.options.hover = false;
    }
    this.hoverEl = this.options.style.hover();
    this.hoverDim = Utils.getElementDimensions(this.hoverEl);
    this.hoverEl.css({
        position: 'absolute',
        display: 'block',
        'z-index': '100',
        'pointer-events': 'none'
    });
    this.foregroundEl.append(this.hoverEl);
    this.setHoverDisplayed(this.options.hover);
    if (this.options.hover) {
        this.foregroundEl.on('mouseenter mousemove', function (event) {
            event.preventDefault();
            var pos;
            if (self.options.style.horizontal()) {
                pos = event.pageX - self.backgroundEl.offset().left;
                if (pos >= self.internalWidth()) {
                    self.scrollbarEl.triggerHandler('mouseleave');
                    return;
                }
                self.hoverEl.css('left', Math.floor(pos - self.hoverDim.w / 2));
            } else {
                pos = event.pageY - self.backgroundEl.offset().top;
                if (pos >= self.internalWidth()) {
                    self.scrollbarEl.triggerHandler('mouseleave');
                    return;
                }
                self.hoverEl.css('top', Math.floor(pos - self.hoverDim.h / 2));
            }
        }).on('mouseleave', function () {
            self.setHoverDisplayed(false);
        }).on('mouseenter', function () {
            self.setHoverDisplayed(true);
        });
        if (this.options.style.horizontal()) {
            this.foregroundEl.css('cursor', 'text');
        } else {
            this.foregroundEl.css('cursor', 'vertical-text');
        }
    }
    this.foregroundEl.on('mouseup', function (event) {
        event.preventDefault();
        var internX;
        if (self.options.style.horizontal()) {
            internX = event.pageX - $(this).offset().left;
        } else {
            internX = event.pageY - $(this).offset().top;
        }
        if (internX >= self.internalWidth()) {
            return;
        }
        self.clicked(self.internalXToTime(internX));
    });
    this.scrollbarEl.prepend(this.foregroundEl);
    this.scrollbarEl.prepend(this.backgroundEl);
    var scrollTimeout = null;
    var lastRender = null;
    this.scrollbarEl.scroll(function () {
        self.handleScrolled();
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(function () {
            lastRender = null;
            self.updateSegments();
        }, 40);
    });
    this.scrollbarEl.on('mousewheel', function (e) {
        if (e.altKey || e.ctrlKey) {
            if (e.deltaY > 0) {
                self.mouseWheelZoomed(self._zoomIn);
            } else {
                self.mouseWheelZoomed(self._zoomOut);
            }
            e.preventDefault();
        }
        return true;
    });
    this.lastMouseEvent = null;
    this.scrollbarEl.on('mousemove mouseenter', function (e) {
        self.lastMouseEvent = e;
    });
    this.cursor = null;
    this.handleMouseEnter = function () {
        if (self.mouseTimeout) {
            clearTimeout(self.mouseTimeout);
        }
        self.isMouseOver = true;
    };
    this.handleMouseLeave = function (event) {
        if (this.mouseTimeout) {
            clearTimeout(this.mouseTimeout);
        }
        self.mouseTimeout = setTimeout(function () {
            self.isMouseOver = false;
        }, self.options.autoScrollTimeout);
    };
    this.scrollbarEl.on('mouseenter', this.handleMouseEnter).on('mouseleave', this.handleMouseLeave);
    var segmentFactory = function (container) {
        var segment = new Segment(self.dataFile, container, self.internalHeight(), self.style);
        return segment;
    };
    segments = new SegmentCollection(this.dataFile, this.segmentsEl, segmentFactory, this.options.segmentWidth, self.style);
    var length;
    if (this.style.horizontal()) {
        length = this.segmentsEl.width();
    } else {
        length = this.segmentsEl.height();
    }
    segments.setViewportLength(length);
    segments.updateSegments();
    this.segments = segments;
    this.setZoom(this.zoom, true);
    this.scrollHnd = [];
};
Viewer.prototype = {
    getDefaultOptions: function () {
        return defaultOptions;
    },
    timeToInternalX: function (time) {
        return this.dataFile.time2px(time, this.zoom);
    },
    timeToOuterX: function (time) {
        return this.timeToInternalX(time) - this.scrollbarEl.scrollLeft();
    },
    internalXToTime: function (x) {
        return this.dataFile.px2time(x, this.zoom);
    },
    outerXtoTime: function (x) {
        return (this.scrollbarEl.scrollLeft() + x) * this.zoom / this.dataFile.getSampleRate();
    },
    internalWidth: function () {
        return Math.floor(this.dataFile.getFrameCnt() / this.zoom);
    },
    timelineHeight: function () {
        return Segment.getTimelineHeight(this.options.style);
    },
    waveformHeight: function () {
        return this.internalHeight() - this.timelineHeight();
    },
    internalHeight: function () {
        var scrollbar = (this.style.horizontal() ? Utils.getScrollbarDim().height : Utils.getScrollbarDim().width) + 4;
        return this.options.height - scrollbar;
    },
    updateSegments: function () {
        var position;
        if (this.style.horizontal()) {
            position = this.scrollbarEl.scrollLeft();
        } else {
            position = this.scrollbarEl.scrollTop();
        }
        this.segments.scrollTo(position);
    },
    updateCursor: function () {
        var time = this.cursor;
        this.segments.setCursor(time);
        var css = { display: 'block' };
        var px = this.timeToInternalX(time);
        if (this.options.style.horizontal()) {
            css.left = px - this.cursorDim.w / 2;
        } else {
            css.top = px - this.cursorDim.h / 2;
        }
        this.cursorEl.css(css);
    },
    autoScroll: function (time) {
        var x = this.timeToInternalX(time);
        var width = this.style.horizontal() ? this.scrollbarEl.width() : this.scrollbarEl.height();
        var self = this;
        var scrollFn;
        var scrollX;
        if (this.style.horizontal()) {
            scrollX = self.scrollbarEl.scrollLeft();
            scrollFn = function (val) {
                return self.scrollbarEl.scrollLeft(val);
            };
        } else {
            scrollX = self.scrollbarEl.scrollTop();
            scrollFn = function (val) {
                return self.scrollbarEl.scrollTop(val);
            };
        }
        var cursorX = this.timeToInternalX(this.cursor);
        var timeX = this.timeToInternalX(time);
        if (this.options.autoScrollType == 'smooth') {
            var targetScroll = Math.floor(x - width / 2);
            if (cursorX >= scrollX && cursorX < scrollX + width && (timeX >= scrollX && timeX < scrollX + width)) {
                var moved = Math.abs(timeX - cursorX);
                moved = Math.max(moved, 1);
                var scrollTo;
                if (targetScroll > scrollX) {
                    scrollTo = scrollX + moved * 2;
                    scrollTo = Math.min(scrollTo, targetScroll);
                } else {
                    scrollTo = scrollX;
                }
                scrollFn(scrollTo);
            } else {
                scrollFn(targetScroll);
            }
        }
        if (this.options.autoScrollType == 'jerky') {
            if (cursorX >= scrollX && cursorX < scrollX + width && (timeX >= scrollX && timeX < scrollX + width)) {
            } else {
                scrollFn(timeX);
            }
        }
    },
    setCursor: function (time) {
        var maxTime = this.dataFile.getLength();
        if (time > maxTime) {
            this.removeCursor();
            return;
        }
        if (!this.isMouseOver && !this.isScrollLocked) {
            try {
                this.autoScroll(time);
            } catch (e) {
                console.dir(e);
            }
        }
        this.cursor = time;
        this.updateCursor();
    },
    removeCursor: function () {
        this.cursor = null;
        this.updateCursor();
        this.segments.removeCursor();
        this.cursorEl.hide();
    },
    onClick: function (fn) {
        this.clickHnd = fn;
        return this;
    },
    clicked: function (time) {
        if (this.clickHnd) {
            this.clickHnd(time);
        }
    },
    updateDimensions: function () {
        if (this.options.style.horizontal()) {
            this.backgroundEl.css({
                width: this.internalWidth(),
                height: this.waveformHeight()
            });
            this.foregroundEl.css({
                width: this.internalWidth(),
                height: this.waveformHeight()
            });
        } else {
            this.backgroundEl.css({
                height: this.internalWidth(),
                width: this.waveformHeight(),
                left: this.timelineHeight()
            });
            this.foregroundEl.css({
                height: this.internalWidth(),
                width: this.waveformHeight(),
                left: this.timelineHeight()
            });
        }
    },
    scroll: function (pos) {
        if (this.style.horizontal()) {
            this.scrollbarEl.scrollLeft(pos);
        } else {
            this.scrollbarEl.scrollTop(pos);
        }
    },
    onScroll: function (fn) {
        this.scrollHnd.push(fn);
    },
    handleScrolled: function () {
        var pos;
        if (this.style.horizontal()) {
            pos = this.scrollbarEl.scrollLeft();
        } else {
            pos = this.scrollbarEl.scrollTop();
        }
        var i;
        for (i in this.scrollHnd) {
            this.scrollHnd[i](pos);
        }
    },
    _zoomIn: function (mult) {
        if (mult === undefined)
            mult = this.options.zoomChangeFactor;
        this._setZoom(this.getZoom() * mult);
    },
    _zoomOut: function (div) {
        if (div === undefined)
            div = this.options.zoomChangeFactor;
        this._setZoom(this.getZoom() / div);
    },
    zoomIn: function (mult) {
        var time = this.getTimeInMiddle();
        this._zoomIn(mult);
        this.setTimeInMiddle(time);
        this.handleZoomed();
    },
    zoomOut: function (div) {
        var time = this.getTimeInMiddle();
        this._zoomOut(div);
        this.setTimeInMiddle(time);
        this.handleZoomed();
    },
    getZoom: function () {
        return this.dataFile.getSampleRate() / this.getZoomFactor();
    },
    _setZoom: function (zoom) {
        var zoomFactor = this.dataFile.getSampleRate() / zoom;
        this._setZoomFactor(zoomFactor);
    },
    setZoom: function (zoom) {
        var zoomFactor = this.dataFile.getSampleRate() / zoom;
        this.setZoomFactor(zoomFactor);
    },
    getZoomFactor: function () {
        return this.zoom;
    },
    getTimeFromMouseCoords: function (pageX, pageY) {
        var ofs = this.scrollbarEl.offset();
        if (this.style.horizontal()) {
            pos = this.scrollbarEl.scrollLeft() + pageX - ofs.left;
        } else {
            pos = this.scrollbarEl.scrollTop() + pageY - ofs.top;
        }
        return this.internalXToTime(pos);
    },
    setTimeAtMouseCoords: function (time, pageX, pageY) {
        var ofs = this.scrollbarEl.offset();
        var x = this.timeToInternalX(time);
        var sc;
        if (this.style.horizontal()) {
            sc = x - (pageX - ofs.left);
            this.scrollbarEl.scrollLeft(sc);
        } else {
            sc = x - (pageY - ofs.top);
            this.scrollbarEl.scrollTop(sc);
        }
    },
    getTimeInMiddle: function () {
        var pos;
        if (this.style.horizontal()) {
            pos = this.scrollbarEl.scrollLeft() + this.scrollbarEl.width() / 2;
        } else {
            pos = this.scrollbarEl.scrollTop() + this.scrollbarEl.width() / 2;
        }
        return this.internalXToTime(pos);
    },
    setTimeInMiddle: function (time) {
        var pos;
        if (this.style.horizontal()) {
            pos = this.timeToInternalX(time) - this.scrollbarEl.width() / 2;
            this.scrollbarEl.scrollLeft(pos);
        } else {
            pos = this.timeToInternalX(time) - this.scrollbarEl.height() / 2;
            this.scrollbarEl.scrollTop(pos);
        }
    },
    mouseWheelZoomed: function (zoomFn) {
        var time = this.getTimeFromMouseCoords(this.lastMouseEvent.pageX, this.lastMouseEvent.pageY);
        zoomFn.call(this);
        this.setTimeAtMouseCoords(time, this.lastMouseEvent.pageX, this.lastMouseEvent.pageY);
        this.handleZoomed();
        this.handleScrolled();
    },
    _setZoomFactor: function (zoom) {
        this.zoom = zoom;
        this.updateDimensions();
    },
    setZoomFactor: function (zoom) {
        this._setZoomFactor(zoom);
        this.handleZoomed();
    },
    onZoomed: function (fn) {
        this.zoomChangedHnd.push(fn);
    },
    handleZoomed: function () {
        this.segments.setZoom(this.zoom);
        var i;
        if (this.zoomChangedHnd) {
            for (i in this.zoomChangedHnd) {
                this.zoomChangedHnd[i](this.getZoom(), this.internalWidth());
            }
        }
        if (this.zoomFactorChangedHnd) {
            for (i in this.zoomFactorChangedHnd) {
                this.zoomFactorChangedHnd[i](this.getZoomFactor());
            }
        }
    },
    onZoomFactorChanged: function (fn) {
        this.zoomFactorChangedHnd.push(fn);
    },
    setMono: function (on) {
        if (on === undefined)
            on = true;
        this.options.mono = on;
        this.dataFile.setMono(on);
        this.segments.rebuild();
    },
    getViewportElement: function () {
        return this.scrollbarEl;
    },
    getTimeSpanContainers: function () {
        return {
            back: this.backgroundEl,
            front: this.timeSpanEl
        };
    },
    getDataFile: function () {
        return this.dataFile;
    },
    getStyle: function () {
        return this.options.style;
    },
    setHoverDisplayed: function (isDisplayed) {
        if (!this.options.hover) {
            isDisplayed = false;
        }
        this.hoverEl.css({ 'display': isDisplayed ? 'block' : 'none' });
    }
};
module.exports = Viewer;
},{"./segment":4,"./segment-collection":3,"./style":5,"./utils":14,"./vendor/jquery-mousewheel":16}],18:[function(_dereq_,module,exports){
/**
 * The buffer module from node.js, for the browser.
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 * `npm install buffer`
 */

var base64 = _dereq_('base64-js')
var ieee754 = _dereq_('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
   // Detect if browser supports Typed Arrays. Supported browsers are IE 10+,
   // Firefox 4+, Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+.
  if (typeof Uint8Array !== 'function' || typeof ArrayBuffer !== 'function')
    return false

  // Does the browser support adding properties to `Uint8Array` instances? If
  // not, then that's the same as no `Uint8Array` support. We need to be able to
  // add all the node Buffer API methods.
  // Bug in Firefox 4-29, now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var arr = new Uint8Array(0)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // Assume object is an array
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof Uint8Array === 'function' &&
      subject instanceof Uint8Array) {
    // Speed optimization -- use set if we're copying from a Uint8Array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  // copy!
  for (var i = 0; i < end - start; i++)
    target[i + target_start] = this[i + start]
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array === 'function') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment the Uint8Array *instance* (not the class!) with Buffer methods
 */
function augment (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":19,"ieee754":20}],19:[function(_dereq_,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var ZERO   = '0'.charCodeAt(0)
	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	module.exports.toByteArray = b64ToByteArray
	module.exports.fromByteArray = uint8ToBase64
}())

},{}],20:[function(_dereq_,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}]},{},[2])
(2)
});;
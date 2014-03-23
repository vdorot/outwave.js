/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

define(['jquery','./vendor/jdataview'],function($,_jDataView){

    /**
     * Waveform data and methods for getting samples
     *
     * Use static method loadUrl for getting a DataFile from a URL directly
     * 
     * @class  DataFile
     * @constructor
     * @param {Dataview} dataView DataView or compatible (jDataView) of waveform file
     * @param {Number} byteLen Length in bytes
     */
    var DataFile = function(dataView,byteLen){


        this.data = dataView;

        var ofs = 0;

        this.version = dataView.getUint8(ofs); ofs++;

        this.channels = dataView.getUint8(ofs); ofs++

        this.sampleSize = dataView.getUint8(ofs); ofs+=1;

        this.sampleRate = dataView.getUint32(ofs,false); ofs+=4; //false => big endian

        this.summery1;
        this.summary2;

        if(this.version == 2){
            this.summary1 = dataView.getUint8(ofs,false); ofs += 1;
            this.summary2 = dataView.getUint8(ofs,false); ofs += 1;
        }

        this.headerLen = ofs;

        if(this.version == 1){
            this.frames = Math.floor((byteLen-this.headerLen)/(this.channels*this.sampleSize*2)); // 2 = min+max
        }else{
            this.frames = dataView.getUint32(byteLen-4);
        }

        this.byteLen = byteLen;

        console.log(this);
    };


    DataFile.prototype = {
        /**
         * Get version of loaded waveform file
         * @return {Number} Version
         */
        getVersion: function(){
            return this.version;
        },
        /**
         * Get number of channels in file
         * @return {Number} # of channels
         */
        getChannels: function(){
            return this.channels;
        },
        /**
         * Get sample size
         * @return {Number} Sample size in bytes (1 or 2)
         */
        getSampleSize: function(){
            return this.sampleSize;
        },
        /**
         * Get sample rate
         * @return {Number} Sample rate
         */
        getSampleRate: function(){
            return this.sampleRate;
        },
        getFrameCount: function(){
            return this.frames;
        },
        /**
         * Get length of waveform
         * @return {Number} Length in seconds
         */
        getLength: function(){
            return this.frames / this.sampleRate;
        },
        /**
         * Translate pixel position to time
         * @param  {Number} x    Pixel position from start of waveform
         * @param  {Number} zoom Zoom-value
         * @return {Number}      Time in seconds
         */
        px2time: function(x,zoom){
            return x / this.getSampleRate() * zoom;
        },
        /**
         * Translate time into pixel position
         * @param  {Number} time Time in seconds
         * @param  {Number} zoom Zoom-value
         * @return {Number}      Pixel position from start of waveform
         */
        time2px: function(time, zoom){
                return Math.floor(time * this.getSampleRate() / zoom);   
        },
        /**
         * Get start of region being summarised
         *
         * Used for getting samples with dofferent zoom levels
         * @param  {Number} x    Index of sample in zoomed waveform
         * @param  {Number} zoom Zoom-value
         * @return {Number}      Index of starting frame
         */
        sampleStart: function(x,zoom){
            return Math.floor(x*zoom);
        },
        /**
         * Get end of region being summarised
         *
         * Used for getting samples with dofferent zoom levels
         * @param  {Number} x    Index of sample in zoomed waveform
         * @param  {Number} zoom Zoom-value
         * @return {Number}      Index of starting frame
         */        
        sampleEnd: function(x,zoom){
            return Math.min(Math.ceil((x+1)*zoom -1 ),this.frames-1);
        },
        /**
         * Get sample in zoomed waveform
         * 
         * @param  {Number} x       Sample index in zoomed waveform
         * @param  {Number} channel Channel id
         * @param  {Number} zoom    Zoom-value
         * @return {Number}         Summarized sample {min: Number, max: Number}
         */
        getSample: function(x,channel,zoom){

            var min = Number.POSITIVE_INFINITY;
            var max = Number.NEGATIVE_INFINITY;

            var start = this.sampleStart(x,zoom);
            var end = this.sampleEnd(x,zoom);

            //TODO: implement optimalisation fo high zoom-values

            for(var sample = start; sample<=end;sample++){
                var seekTo;
                if(this.version == 2){
                    seekTo = this.headerLen+(sample*this.channels*this.sampleSize*2)+channel*this.sampleSize*2 + (sample >> this.summary1)*this.channels*this.sampleSize*2 + (sample >> this.summary2)*this.channels*this.sampleSize*2;
                }else{
                    seekTo = this.headerLen+(sample*this.channels*this.sampleSize*2)+channel*this.sampleSize*2;
                }

                var miin;
                var maax;
                if(this.samplesize == 2 ){
                    miin = this.data.getInt16(seekTo) / 65535;
                    maax = this.data.getInt16(seekTo+2) / 65535;
                }else{
                    miin = this.data.getInt8(seekTo) / 128;
                    maax = this.data.getInt8(seekTo+1) / 128;               
                }
                min = Math.min(min,miin);
                max = Math.max(max,maax);
            }
            ret = {min: min,max:max};
            return ret;

        }
    };




    /**
     * Load waveform file from URL and return DataFile instance
     *
     * Uses jQuery AJAX
     *
     * If DataView is not available in the browser, it tries to look for jDataView, which can be used as a compatibility layer.
     * jDataView is a lot slower though.
     * 
     * @param  {String}   url  URL of file containing preprocessed waveform data
     * @param  {Function} done Callback done(Boolean success,String errorMessage,DataFile dataFile)
     */
    DataFile.loadUrl = function(url, done){

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

       // new browsers (XMLHttpRequest2-compliant)
        if ('responseType' in xhr) {
            console.log("AJAX response: arraybuffer");
            xhr.responseType = 'arraybuffer';
        }
        // old browsers (XMLHttpRequest-compliant)
        else if ('overrideMimeType' in xhr) {
            xhr.overrideMimeType('text/plain; charset=x-user-defined');
        }
        // IE9 (Microsoft.XMLHTTP-compliant)
        else {
            console.log("AJAX response: IE9");
            xhr.setRequestHeader('Accept-Charset', 'x-user-defined');
        }


        xhr.onload = function(event){
            //this = xhr
            if (!('response' in this)) { //IE9 compatibility
                var bytes = new VBArray(this.responseBody).toArray();
                this.response = '';
                for (var i = 0; i < bytes.length; i++) {
                    this.response += String.fromCharCode(bytes[i]);
                }
            }   


            var dataView;
            var length;

            if(this.response.constructor == ArrayBuffer){
                dataView = new DataView(this.response); //native DataView
                length = this.response.byteLength;
            }else{
                if(typeof jDataView == 'undefined'){
                    done(false,"jDataView not found");
                    return;

                }
                dataView = new jDataView(this.response); // compatibility layer
                length = dataView.byteLength;
            }

            var dataFile = new DataFile(dataView,length);
            done(true,null,dataFile);
        };

        xhr.send(); //fire!    

    };
    return DataFile;
});

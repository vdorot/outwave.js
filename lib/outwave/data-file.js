/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

define(['./vendor/jdataview'],function(_jDataView){


    /**
     * @module Outwave
     */

    /**
     * Waveform data and methods for getting samples
     *
     * Use static method loadUrl for getting a DataFile from a URL directly
     *
     * @class  DataFile
     * @constructor
     * @param {Dataview} dataView DataView or compatible(jDataView) of waveform file
     * @param {Number} byteLen Length in bytes
     */
    var DataFile = function(dataView,byteLen){


        this.data = dataView;

        var ofs = 0;

        this.version = dataView.getUint8(ofs); ofs++;

        this.channels = dataView.getUint8(ofs); ofs++;

        this.sampleSize = dataView.getUint8(ofs); ofs+=1;

        this.sampleRate = dataView.getUint32(ofs,false); ofs+=4; //false => big endian

        this.summary1;
        this.summary2;

        if(this.version == 2){
            this.summary1 = dataView.getUint8(ofs,false); ofs += 1;
            this.summary2 = dataView.getUint8(ofs,false); ofs += 1;

            this.sum1p = Math.pow(2,this.summary1);
            this.sum2p = Math.pow(2,this.summary2);
        }

        this.headerLen = ofs;

        if(this.version == 1){
            this.frames = Math.floor((byteLen-this.headerLen)/(this._getChannelCnt()*this.getSampleSize()*2)); // 2 = min+max
        }else{
            this.frames = dataView.getUint32(byteLen-4);
        }

        this.byteLen = byteLen;


        this.mono;
        this.sampleSource;
        this.setMono(false);
    };


    DataFile.prototype = {
        /**
         * Enable or disable mono mode
         *
         * In mono mode, the DataFile acts as if there was only one channel, summarising channels together
         *
         * @method setMono
         * @param {Boolean} on on/off
         */
        setMono: function(on){
            if(on === undefined) on = true;
            this.mono = on;
            if(this.mono){
                this.sampleSource = this.getRawSampleMono;
            }else{
                this.sampleSource = this.getRawSample;
            }
        },
        /**
         * Get version of loaded waveform file
         *
         * @method  getVersion
         * @return {Number} Version
         */
        getVersion: function(){
            return this.version;
        },
        /**
         * Get number of channels in file
         *
         * @method  getChannelCnt
         * @return {Number} # of channels
         */
        getChannelCnt: function(){
            if(this.mono){
                return 1;
            }else{
                return this.channels;
            }
        },

        _getChannelCnt: function(){
            return this.channels;
        },
        /**
         * Get sample size
         * @method  getSampleSize
         * @return {Number} Sample size in bytes (1 or 2)
         */
        getSampleSize: function(){
            return this.sampleSize;
        },
        /**
         * Get sample rate
         *
         * @method  getSampleRate
         * @return {Number} Sample rate
         */
        getSampleRate: function(){
            return this.sampleRate;
        },
        /**
         * Get number of frames in file
         *
         * Frame - samples(min,max) for all channels
         *
         * @method  getFrameCnt
         * @return {Number} Number of frames
         */
        getFrameCnt: function(){
            return this.frames;
        },
        /**
         * Get length of waveform
         *
         * @method  getLength
         * @return {Number} Length in seconds
         */
        getLength: function(){
            return this.getFrameCnt() / this.getSampleRate();
        },
        /**
         * Translate pixel position to time
         *
         * @method  px2time
         * @param  {Number} x    Pixel position from start of waveform
         * @param  {Number} zoom Zoom factor
         * @return {Number}      Time in seconds
         */
        px2time: function(x,zoom){
            if(!zoom){
                throw new Error();
            }
            return x / this.getSampleRate() * zoom;
        },
        /**
         * Translate time into pixel position
         *
         * @method  time2px
         * @param  {Number} time Time in seconds
         * @param  {Number} zoom Zoom factor
         * @return {Number}      Pixel position from start of waveform
         */
        time2px: function(time, zoom){
            if(!zoom){
                throw new Error();
            }
            return Math.floor(time * this.getSampleRate() / zoom);   
            
        },
        /**
         * Get start of region being summarized
         *
         * Used for getting samples with different zoom levels
         *
         * @method  sampleStart
         * @param  {Number} x    Index of sample in zoomed waveform
         * @param  {Number} zoom Zoom factor
         * @return {Number}      Index of starting frame
         */
        sampleStart: function(x,zoom){
            return Math.floor(x*zoom);
        },
        /**
         * Get end of region being summarized
         *
         * Used for getting samples with different zoom levels
         *
         * @method  sampleEnd
         * @param  {Number} x    Index of sample in zoomed waveform
         * @param  {Number} zoom Zoom factor
         * @return {Number}      Index of starting frame
         */        
        sampleEnd: function(x,zoom){
            return Math.min(Math.ceil((x+1)*zoom -1 ),this.getFrameCnt()-1);
        },



        /**
         * Get n-th summarized sample from level 1 summarization
         *
         * @method  getRawSample
         * @param  {Number} sample  Index of level 1 summarization sample
         * @param  {Number} channel Channel index
         * @return {Array}  [min,max]
         * */
        getSum1Sample: function(sample,channel){

            var target = (sample + 1) * (this.sum1p + 1) - 1 + (((sample+1) * this.sum1p - 1) >> this.summary2);

            return this.sampleSource(target,channel);

        },

        /**
         * Get n-th summarized sample from level 2 summarization
         *
         * @method  getRawSample
         * @param  {Number} sample  Index of level 2 summarization sample
         * @param  {Number} channel Channel index
         * @return {Array}  [min,max]
         * */
        getSum2Sample: function(sample,channel){
            var target  = (sample + 1) * (this.sum2p + 1) - 1 + ((sample + 1) * this.sum2p >> this.summary1);
            return this.sampleSource(target,channel);
        },

        /**
         * Get sample directly, skipping over summarization samples
         *
         *
         * @method  getRawSample
         * @param  {Number} sample  Sample index
         * @param  {Number} channel Channel index
         * @return {Array}  [min,max]
         * */
        getNoSumSample: function(sample,channel){
            return this.sampleSource(sample + (sample >> this.summary1) + (sample >> this.summary2), channel);
        },



        /**
         * Get raw sample without taking zoom into account
         *
         * @method  getRawSample
         * @param  {Number} sample  Sample index
         * @param  {Number} channel Channel index
         * @return {Array}  [min,max]
         */
        getRawSample: function(sample,channel){

            var seekTo = this.headerLen+(sample*this._getChannelCnt()*this.getSampleSize()*2)+channel*this.getSampleSize()*2;


            var min;
            var max;
            if(this.getSampleSize() == 2 ){

                if(seekTo > this.byteLen || seekTo+2 > this.byteLen){
                    return [0,0];
                }

                min = this.data.getInt16(seekTo) / 65535;
                max = this.data.getInt16(seekTo+2) / 65535;



            }else{

                if(seekTo > this.byteLen || seekTo+1 > this.byteLen){
                    return [0,0];
                }

                min = this.data.getInt8(seekTo) / 128;
                max = this.data.getInt8(seekTo+1) / 128;               
            }

            return [min,max];
        },
        /**
         * Get raw sample in mono mode
         *
         * Multiple channels are summarized by computing minimum and maximum across all of them
         *
         * @method  getRawSampleMono
         * @param  {Number} sample Sample index
         * @return {Array}   [min,max]
         */
        getRawSampleMono: function(sample){
            var min = Number.POSITIVE_INFINITY;
            var max = Number.NEGATIVE_INFINITY;
            var i;
            for(i=0; i<this._getChannelCnt();i++){
                var s = this.getRawSample(sample,i);
                min = Math.min(min,s[0]);
                max = Math.max(max,s[1]);                
            }
            return [min,max];
        },
        /**
         * Get sample in zoomed waveform
         * 
         * @method  getSample
         * @param  {Number} x       Sample index in zoomed waveform
         * @param  {Number} channel Channel id
         * @param  {Number} zoom    Zoom factor
         * @return {Array}         Summarized sample [min, max]
         */
        getSample: function(x,channel,zoom){


                var min, max,start, end,samples,s;

            if(this.version != 2){

                min = Number.POSITIVE_INFINITY;
                max = Number.NEGATIVE_INFINITY;

                start = this.sampleStart(x,zoom);
                end = this.sampleEnd(x,zoom);

                for(sample = start; sample<=end;sample++){

                    s = this.sampleSource(sample,channel);

                    min = Math.min(min,s[0]);
                    max = Math.max(max,s[1]);
                }


            }else{

                    if(zoom > (this.sum2p * 2)){


                        min = Number.POSITIVE_INFINITY;
                        max = Number.NEGATIVE_INFINITY;

                        start = Math.floor(this.sampleStart(x,zoom)/this.sum2p);

                        end = Math.ceil(this.sampleEnd(x,zoom)/this.sum2p);
                        end = Math.min(end,Math.floor(this.frames/this.sum2p));

                        for(sample = start; sample<=end;sample++){

                            s = this.getSum2Sample(sample,channel);

                            min = Math.min(min,s[0]);
                            max = Math.max(max,s[1]);
                        }

                    }else if( zoom > (this.sum1p * 2)){


                        min = Number.POSITIVE_INFINITY;
                        max = Number.NEGATIVE_INFINITY;

                        start = Math.floor(this.sampleStart(x,zoom)/this.sum1p);

                        end = Math.ceil(this.sampleEnd(x,zoom)/this.sum1p);
                        end = Math.min(end,Math.floor(this.frames/this.sum1p));

                        for(sample = start; sample<=end;sample++){

                            s = this.getSum1Sample(sample,channel);

                            min = Math.min(min,s[0]);
                            max = Math.max(max,s[1]);
                        }


                    }else{
                        min = Number.POSITIVE_INFINITY;
                        max = Number.NEGATIVE_INFINITY;

                        start = this.sampleStart(x,zoom);
                        end = this.sampleEnd(x,zoom);

                        for(sample = start; sample<=end;sample++){

                            s = this.getNoSumSample(sample,channel);

                            min = Math.min(min,s[0]);
                            max = Math.max(max,s[1]);
                        }

                    }


            }






            return [min,max];

        }
    };




    /**
     * Loads waveform file from URL and returns a DataFile instance
     *
     * Uses jQuery AJAX
     *
     * If DataView is not available in the browser, it tries to look for jDataView, which can be used as a compatibility layer.
     * jDataView is much slower though.
     *
     * @method  loadUrl
     * @static
     * @param  {String}   url  URL of file containing preprocessed waveform data
     * @param  {Function} done Callback done(Boolean success,String errorMessage,DataFile dataFile)
     */
    DataFile.loadUrl = function(url, done, progress){

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

       // new browsers (XMLHttpRequest2-compliant)
        if ('responseType' in xhr) {
            xhr.responseType = 'arraybuffer';
        }
        // old browsers (XMLHttpRequest-compliant)
        else if ('overrideMimeType' in xhr) {
            xhr.overrideMimeType('text/plain; charset=x-user-defined');
        }
        // IE9 (Microsoft.XMLHTTP-compliant)
        else {
            xhr.setRequestHeader('Accept-Charset', 'x-user-defined');
        }

        xhr.onprogress = function(event){
            if(event.total && event.loaded){
                progress(Math.floor(event.loaded / event.total * 100));
            }
        };


        xhr.onload = function(event){
            //this = xhr

            

            if(! (this.status >= 200 && this.status < 300 || this.status === 304)){
                done(false,this.status + ' '+this.statusText);
                return;
            }



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

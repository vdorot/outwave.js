/*
Copyright (c) 2014, Viktor Dorotovic
All rights reserved.
See LICENSE.txt for licensing information.
*/

define(['jquery','./vendor/jdataview'],function($,_jDataView){

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
    }


    DataFile.prototype = {
        sampleStart: function(x,zoom){
            return Math.floor(x*zoom);
        },
        sampleEnd: function(x,zoom){
            return Math.min(Math.ceil((x+1)*zoom -1 ),this.frames-1);
        },
        /*Compute summary sample according to zoom value*/
        getSample: function(x,channel,zoom){

            var min = Number.POSITIVE_INFINITY;
            var max = Number.NEGATIVE_INFINITY;

            var start = this.sampleStart(x,zoom);
            var end = this.sampleEnd(x,zoom);

            //TODO: implement optimalisation

            for(var sample = start; sample<=end;sample++){
                if(this.version == 2){
                    var seekTo = this.headerLen+(sample*this.channels*this.sampleSize*2)+channel*this.sampleSize*2 + (sample >> this.summary1)*this.channels*this.sampleSize*2 + (sample >> this.summary2)*this.channels*this.sampleSize*2;
                }else{
                    var seekTo = this.headerLen+(sample*this.channels*this.sampleSize*2)+channel*this.sampleSize*2;
                }

                if(this.samplesize == 2 ){
                    var miin = this.data.getInt16(seekTo) / 65535;
                    var maax = this.data.getInt16(seekTo+2) / 65535;
                }else{
                    var miin = this.data.getInt8(seekTo) / 128;
                    var maax = this.data.getInt8(seekTo+1) / 128;               
                }
                min = Math.min(min,miin);
                max = Math.max(max,maax);
            }
            ret = {min: min,max:max};
            return ret;

        },
        getLength: function(){
            return this.frames / this.sampleRate;
        }
    }

    /*Load datafile from url and create a DataFile object

    done(success,errorMessage,dataFile)
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


            if(this.response.constructor == ArrayBuffer){
                var dataView = new DataView(this.response); //native DataView
                var length = this.response.byteLength;
            }else{
                if(typeof jDataView == 'undefined'){
                    done(false,"jDataView not found");
                    return;

                }
                var dataView = new jDataView(this.response); // compatibility layer
                var length = dataView.byteLength;
            }

            var dataFile = new DataFile(dataView,length);
            done(true,null,dataFile);
        }

        xhr.send(); //fire!    

    };
    return DataFile;
});

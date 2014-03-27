Outwave.js
==========

Outwave.js is a web based waveform viewer build to handle very long recordings. 

The UI widget is written purely in JavaScript, using HTML 5 Canvas for rendering of the waveform. Navigation across the recording is done using a native scrollbar, with the help of `overflow: auto;`. The audio is divided into segments, and only segments that are visible are kept rendered. This way, the rendering can be done fast, without interrupting responsiveness of the page and with memory usage independent of the length of the recording or zoom level.

##Getting started

Media files have to be processed before they can be viewed effectively, so using Outwave.js requires to steps. Using the preprocessor to generate a downsampled file and loading the generated file in the browser. The datafiles can be hosted by any ordinary HTTP server like Apache or nginx.

###Preprocessor

The preprocessor is bundled with [libsndfile](http://www.mega-nerd.com/libsndfile/), which is used for reading audio file. Outwave only supports formats supported by the library, with FLAC and Vorbis support disabled.
  
####Installation
  
Make sure your system has the necessary packages to compile and build C/C++ programs. In ubunut, this can be achieved by installing the `build-essential` package.

```bash
apt-get install build-essential
```
    
Compilation of the preprocessor is as simple as using make in the directory of the preprocessor.

```bash
make
```

The result is an executable called `outwave` in the same directory. 

#### Usage

```bash
./outwave input.wav output.wf
```

The resulting files containg waveform data can be created with configurable sample rate and size. For a full list of options and other information about the preprocessor, see [Preprocessor Usage](doc/preprocessor.md).

###Browser part


The UI component is expected to change, for up-to-date information on usage, see files in the examples folder.

An API reference generated from source is available in the doc/api directory. 

##Time Spans

This extension allows marking segments of the waveform, the main purpose being annotation of audio(adding captions).

For more infrormation, see [Time Spans](doc/time-spans.md).





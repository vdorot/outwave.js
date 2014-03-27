Outwave.js
==========

Outwave.js is a web based waveform viewer build to allow viewing of very long recordings. It uses native browser scrollbars, which allows for a smooth user experience.

##Getting started

Media files have to be processed before they can be viewed effectively, so using Outwave.js requires to steps. Using the preprocessor to generate a downsampled file and loading the generated file in the browser. The datafiles can be hosted by any ordinary HTTP server like Apache or nginx.

###Preprocessor

The preprocessor is bundled with `libsndfile`, which is used for reading audio file. Outwave only supports formats supported by libsndfile(TODO: link), with FLAC and Vorbis support disabled.
  
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

Sample rate, size, mono.

For a full list of options and other information about the preprocessor, see [Preprocessor usage](http://todo.todo).

###Browser part





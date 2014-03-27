Preprocessor usage
==================

Output of `./outwave --help`

```
Convert audio file to waveform data for Outwave.js viewer

Reads an audio file and creates a file containing downsampled binary data
suitable for loading in the web viewer

For supported formats see http://www.mega-nerd.com/libsndfile/

Usage: outwave [options] [input] output

input: filename of wave file, standard input pipe is used if omitted or -
output: filename of output datafile, or - for standard output

Options:
--samplerate, -r      sample rate of output
                          If larger than the sample rate of input,
                          sample rate of input is used.
--samplesize, -s      sample size
                          8 or 16 (bits)
--mono, -m                mix all channels into one
--summary1, -1        summary limit 1, power of 2
--summary2, -2        summary limit 2, power of 2
--nosum, -n        disable summaries2

Defaults:
Sample rate: 441 Hz
Sample size: 8 bits
Summary 1: 256
Summary 2: 65536

Exit codes:
0 - ok
1 - user error
2 - I/O error
```

##Using FFmpeg

It is poosible to process any media file without having to save uncompressed audio on the disk. FFmpeg can route its output to a pipe, which outwave can read from.

If converting on the fly, FFmpeg writes a zero to the frame count field in the header, which libsndfile interprets as an empty file.
A solution is to choose the AU format, which doesn't contain the number of frames in the file header.

```
ffmpeg -i input.mp4 -acodec pcm_s16be -f au - | ./outwave - output.wf
```

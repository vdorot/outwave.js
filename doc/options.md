Options
=======

Options can be supplied when initialising Outwave:

```JavaScript
  var options = {height: 300, zoom: 20}

  Outwave(file,$("#waveform"),options,function(viewer){
    //waveform has loaded
  });
```

#Available options

#####`height:  Number[pixels] | null`

Height of waveform while while oriented horizontally. If null, the waveform takes up the full height of its parent element.

#####`segmentWidth: Number[pixels]`

Pixel width of rendering segments.

#####`hover: Boolean`

If true, a line is displayed under the mouse cursor when hovering over the waveform.

#####`mono: Boolean`

If true, all channels are mixed together and shown as one.

This setting can be changed after initialisation, using the `setMono` method.

#####`zoom: Number[pixels per second]`

Initial zoom level

#####`minZoom: Number[pixels per second]`

Minimum zoom level

#####`maxZoom: Number[pixels per second]`

Maximum zoom level

#####`zoomChangeFactor: Number`

Number by which the zoom value gets divided/multiplied when zooming in/out.

#####`hideScrollbar: Boolean`

If true, the scrollbar is hidden, while still allowing the user to scroll using the mousewheel.

#####`autoScroll: Boolean`

If true, the waveform is automatically scrolled whenever the cursor position changes, so that the cursor is inside the viewport.

To update the cursor position, use `setCursor`.

#####`autoScrollType: String`

#####`smooth`, `jumpy` or `jumpy-animated`

#####`autoScrollTarget: Number[percentage of width], 0..1`

Position in viewport to which the viewer scrolls the cursor to.

Only applies to `jumpy-animated`.

#####`autoScrollThreshold: Number[percentage of width], 0..1`

Position in viewport at which scrolling starts.

Only applies to `jumpy-animated`.

#####`autoScrollAnimationDuration: Number[ms]`

#####`autoScrollMouseLock: Boolean`

If true, autoscroll is disabled while the mouse pointer is over the waveform.

#####`autoScrollTimeout: Number[ms]`

Time after which autoscroll is enabled again after the mouse pointer leaving the waveform.

#####`cacheOffset: Boolean`

If true, the top left corner of the waveform is cached at initialisation, this makes reaction to mouse movement(hover, dragging) somwhat smoother.

Do not enable this, if the content above the waveform can dynamically change, changing the position of the waveform in relation to the page.

#####`init: Function(done)`

Callback which is called when the waveform data has been loaded.

It's suitable for creating time spans.

`done` must be called to end initialization.

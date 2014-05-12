Options
=======

Options can be supplied when initialising Outwave:

```JavaScript
  var options = {height: 300, zoom: 20}

  Outwave(file,$("#waveform"),options,function(viewer){
    //waveform has loaded
  });
```

##General options

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


##Styling options

Most of the styling options are defined as an element generator function. These generators should return a jQuery element object.

The default generators should be sufficient for most uses. Changing the looks of the viewer can be achieved by overriding CSS styles. Only redefine the generators if you need different class names or a more complicated element structure.

#####`orientation: String`

Sets the orientation of the waveform, the default is horizontal.

Must be `"horizontal"` or `"vertical"`.


#####`timelineMarker: ElementGenerator(time)`

Generates elements for time marker shown in the timeline. The elements have to containt formatted text, it is not set automatically. The text can be generated from the time argument, which contains the marker time in seconds.

The markers dimensions are automatically measured using jQuery to prevent them from overlapping. The gaps between markers are adjusted accordingly.

When positioning, the middle of the marker corresponds with the time on the waveform.

#####`cursor: ElementGenerator`

Generates the cursor.

The element is positioned so that the middle corresponds  with the time on the waveform.

#####`hover: ElementGenerator`

Generates the element that highlight the position while the mouse cursor is over the waveform.

The element is positioned so that the middle corresponds  with the time on the waveform.

#####`timeSpanStart: ElementGenerator`

Element that highlights the start of a time span. It's added to a layer above the waveform.

The top is positioned to the correct point on the waveform.

#####`timeSpanEnd: ElementGenerator`

Element that highlights the end of a time span. It's added to a layer above the waveform.

The bottom is positioned to the correct point on the waveform.

#####`timeSpanBackground: ElementGenerator`

Background of a time span, under the waveform(which has a transparent background).


#####`waveformFill: function(ctx,p1,p2,channel,channelCnt,played)`

This function is used for styling of the waveform itself. The waveform is rendered onto a canvas element, so it doesn't support styling using CSS.

If multiple audio channels are present, the function is called separately for each channel. 

######Arguments:

`ctx` - convas drawing context
`p1` - starting point of the gradient, if necessary `{x: Number, y: Number}`
`p2` - ending point of the gradient
`channel` - Channel id, starting from 0
`channelCnt` - Number of channels
`played` - whether this part of the waveform has been already played. True, if the cursor is further.

######Return value:

A value compatible with the `fillStyle` property of the drawing context. This means that if you don't need fancy gradients, you can return a hex color instead, eg. `"#000000"`.

######Example implmentation:

```
var grad = ctx.createLinearGradient(p1.x,p1.y,p2.x,p2.y);
    if(played){
        if(channel === 0){
            grad.addColorStop(0, '#8CDFFF');
            grad.addColorStop(1, '#17C0FF');
        }else{
            grad.addColorStop(0, '#C3FF87');
            grad.addColorStop(1, '#77ED00');
        }
    }else{
        if(channel === 0){
            grad.addColorStop(0, '#6ED7FF');
            grad.addColorStop(1, '#0084B5');
        }else{
            grad.addColorStop(0, '#B0FF61');
            grad.addColorStop(1, '#57AD00');
        }               
    }
    return grad;
```


#####`error: ElementGenerator(message)`

Element used to show loading errors. 

#####`loading: ElementGenerator`

Element used to indicate loading of the waveform file.

If the element contains a child element having the class `loading` then the percentage is added to it.

#####`zoomInControl: ElementGenerator`

Button used for zooming in

#####`zoomOutControl: ElementGenerator`

Button used for zooming out.

#####`lockPositionControl: ElementGenerator`

Button used for disabling autoscroll.

#####`channelsControl: ElementGenerator`

Button used for enabling the mixing of all channels into one.




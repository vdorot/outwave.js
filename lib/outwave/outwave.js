define(
    ['./data-file',
    './viewer',
    './segment-collection',
    './segment',
    './style',
    './utils',

    './time-span/time-span',
    './time-span/sparse-time-span',
    './time-span/continuous-time-span',
    './time-span/draggable',
    './time-span/time-span-collection',
    './time-span/sparse-time-span-collection',
    './time-span/continuous-time-span-collection'
    ], //TODO: add timespans if necessary
    function(DataFile, Viewer, SegmentCollection, Segment, Style, utils, TimeSpan, SparseTimeSpan, ContinuousTimeSpan, Draggable, TimeSpanCollection, SparseTimeSpanCollection, ContinuousTimeSpanCollection){






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
            autoScrollType: 'jerky', // smooth or jerky
            autoScrollTimeout: 800, // milliseconds
            zoomChangeFactor: 2, // number by which the zoom value gets divided/multiplied when zooming in/out
        };


        var Outwave = function(dataFileUrl,container,options,done){

            options = $.extend({},defaultOptions,options);
            options.style = new Style();

            if(options.style){
                $.extend({},options.style,options.style);  
            }

            var wrapper = $('<div class="outwave"></div>');


            container.append(wrapper);
            container = wrapper;

            container.addClass(options.style.vertical()?"vertical":"horizontal");

            var showError = function(message){
                 container.empty().append(options.style.error(message));
            };


            container.empty().append(options.style.loading());

            var onProgress = function(progress){
                container.find(".loading").text(progress + '%');
            };

            DataFile.loadUrl(dataFileUrl,function(success,errorMessage,dataFile){
                if(!success){
                    showError(errorMessage);
                    return;
                }
                var viewer = new Viewer(container,dataFile,options);

                //add controls, etc.

                done(viewer);

            },onProgress);




        };

        Outwave.api = api;



        return Outwave;



    }
);
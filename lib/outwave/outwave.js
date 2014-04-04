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



        var Outwave = function(dataFileUrl,container,options,done){


            container = $(container); // ensure jQuery element

            var showError = function(message){
                 container.empty().append($('<div class="error"></div>').text(message));
            };


            $(container).text("Loading...");

            DataFile.loadUrl(dataFileUrl,function(success,errorMessage,dataFile){
                if(!success){
                    showError(errorMessage);
                }
                var viewer = new Viewer(container,dataFile,options);

                //add controls, etc.

                done(viewer);

            });




        };

        Outwave.api = api;



        return Outwave;



    }
);
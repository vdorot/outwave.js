Time Spans
==========

Time spans can be created by adding a time span collection to Outwave:

```
var colletion = new SparseTimeSpanCollection(outwave);

var timeSpan = collection.addTimeSpan(0,5);

```

There are 2 basic operation modes - sparse and continuous. In continuous mode, there are no gaps allowed inbetween time spans and new ones are always created directly following the last. Sparse mode is less restrictive and allows time spans anywhere, as long as they don't overlap.

Continuous mode is enabled by creating a `ContinuousTimeSpanCollection` instead.

TODO: extend this page

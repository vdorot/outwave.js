Time Spans
==========

Time spans can be created by adding a time span collection to Outwave:

```
var colletion = new SparseTimeSpanCollection(outwave);

var timeSpan = collection.addTimeSpan(0,5);
```

There are 2 basic operation modes - sparse and continuous. In continuous mode, there are no gaps allowed inbetween time spans and new ones are always created directly following the last. Sparse mode is less restrictive and allows time spans anywhere, as long as they don't overlap.

Continuous mode is enabled by creating a `ContinuousTimeSpanCollection` instead.

Time spans support merging and splitting:

```
collection.mergeWithPrev(span); // merges span with the one before

collection.split(10); // split span at 10 seconds
```


To create a new time span call `collection.addTimeSpan(endTime)` for a continuous collection or `collection.addTimeSpan(startTime,endTime)` when using sparse time spans.

`addTimeSpan` returns an instance representing the time span, which you can use to manipulate it or listen to events:

```
var span = collection.addTimeSpan(0,10);

span.setStart(3); // set starting position

span.setEnd(15); // set ending position


/*Position change listener*/
span.onPositionChanged(function(){
    //this == span
    console.log('Position changed to ', this.getStart(), ' - ', this.getEnd());
});

/*Span merged*/
span.onMerged(function(prev,created){
    console.log(this, "merged with ", prev, " into ", created);
});

/*Span split*/
span.onSplit(function(left,right){
    console.log(this, "split into", left, right);
});

span.onRemoved(function(){
    console.log(this, "was removed");
});
```

Another way of getting the objects for create time spans is by handling the timeSpanCreated event:

```
collection.onTimeSpanCreated(function(span){
    consoel.log("New time span created: ",span);
});
```

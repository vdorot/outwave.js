
define([
],function(){
    /**
     * @module TimeSpan
     */

    /**
     * Time span error
     * @class TimeSpanError
     * @extends {Error}
     * @constructor
     * @param {String} type Error type identifier
     * @param {String} message Error description
     */
    function TimeSpanError(type,message) {
      this.name = "TimeSpanError";
      this.message = message;

      this.type = type;

      this.getType = function(){
        return this.type;
      };

    }

    TimeSpanError.prototype = new Error();
    TimeSpanError.prototype.constructor = TimeSpanError;

    return TimeSpanError;

});
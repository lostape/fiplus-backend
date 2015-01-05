var db = require('org/arangodb').db;
var error = require('error');
var start = require('start');
var end = require('end');

/**
* Constructs an time period db interface object
* @constructor
*/
var TimePeriod = function()
{
    this.db = db;
    this.COLLECTION_NAME = 'time_period';
};

/**
 * Add a time period with start and end times.
 */
TimePeriod.prototype.saveTimePeriod = function(start_time, end_time)
{
    var result;

    //Prevent the creation of a time period with the same start and end time as another time period.
    var time_period_collection = this.db.time_period.toArray();
    var time_period_collection_length = this.db.time_period.count();
    var time_period;
    var time_period_found;
    for (var i=0; i < time_period_collection_length; i++)
    {
        time_period = time_period_collection[i];
        this.db.start.outEdges(time_period._id).forEach(function (edge) {
            var start_timestamp = edge._to;
            if (start_timestamp == start_time) {
                this.db.end.outEdges(time_period._id).forEach(function (edge) {
                    var end_timestamp = edge._to;
                    if (end_timestamp == end_time) {
                        //We found an existing time_period node with the same start and end time
                        result = time_period;
                        time_period_found = true;
                        break;
                    }
                });
            }
        });
    }
    if(time_period_found != true)
    {
        // Every created time period is unique
        result = this.db.time_period.save({});
        if (result.error == true) {
            throw new error.GenericError('Saving time period failed.');
        }
    }

    var start_edge = (new start.Start()).saveStartEdge(result._id, start_time);
    var end_edge = (new end.End()).saveEndEdge(result._id, end_time);

    return result;
};

exports.TimePeriod = TimePeriod;
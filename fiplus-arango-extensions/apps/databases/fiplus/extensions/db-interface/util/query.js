var db = require('org/arangodb').db;

function getFutureSuggestedAndNotConfirmedActivities(returnValue) {
    return "let s = ( " +
        "for activity in activities " +
        "for suggested in graph_edges('fiplus', activity, {edgeCollectionRestriction:'suggested'}) "+
        "for suggested_is in graph_edges('fiplus', suggested._to, {edgeCollectionRestriction:'is', endVertexCollectionRestriction:'time_period'}) "+
        "for suggested_start in graph_edges('fiplus', suggested_is._to, {edgeCollectionRestriction:'start'}) "+
        "filter document(suggested_start._to).value >= date_now() && length(graph_edges('fiplus', activity, {edgeCollectionRestriction:'confirmed'})) == 0 "+
        returnValue + ") ";
}

function getFutureConfirmedActivities(returnValue) {
    return "let c = ( " +
    "for activity in activities " +
    "for confirmed_is in graph_edges('fiplus', activity, {edgeCollectionRestriction:'confirmed', endVertexCollectionRestriction:'time_period'}) "+
    "for confirmed_start in graph_edges('fiplus', confirmed_is._to, {edgeCollectionRestriction:'start'}) "+
    "filter document(confirmed_start._to).value >= date_now() "+
    returnValue + ") ";
}


exports.getJoinedActivities = function(userId, future, past)
{
    if(future && !past)
    {
        var returnValue = "return document(activity)";
        return db._query(
        "let activities = (for joined in graph_edges('fiplus', @userId, {edgeCollectionRestriction:'joined'}) return joined._to) " +
        getFutureSuggestedAndNotConfirmedActivities(returnValue) +
        getFutureConfirmedActivities(returnValue) +
        "return union_distinct(s,c)", {userId:userId}).toArray()[0];
    }
    else if(!future && past)
    {
        return db._query("return unique((for joined in graph_edges('fiplus', @userId, {edgeCollectionRestriction:'joined'}) " +
        "filter joined._to not in ( "+
            "for suggested in graph_edges('fiplus', joined._to, {edgeCollectionRestriction:'suggested'}) "+
            "for is in graph_edges('fiplus', suggested._to, {edgeCollectionRestriction:'is', endVertexCollectionRestriction:'time_period'}) "+
            "for end in graph_edges('fiplus', is._to, {edgeCollectionRestriction:'end'}) "+
            "filter document(end._to).value >= date_now() "+
            "return suggested._from "+
        ") "+
        "filter length( "+
            "for suggested in graph_edges('fiplus', joined._to, {edgeCollectionRestriction:'suggested'}) "+
            "for is in graph_edges('fiplus', suggested._to, {edgeCollectionRestriction:'is', endVertexCollectionRestriction:'time_period'}) "+
            "return suggested "+ ") != 0 "+
        "return document(joined._to)))",{userId:userId}).toArray()[0];
    }
    else
    {
        return db._query("return unique((for joined in graph_edges('fiplus', @userId, {edgeCollectionRestriction:'joined'})" +
        "for suggested in graph_edges('fiplus', joined._to, {edgeCollectionRestriction:'suggested'})" +
        "for is in graph_edges('fiplus', suggested._to, {edgeCollectionRestriction:'is', endVertexCollectionRestriction:'time_period'})" +
        "for start in graph_edges('fiplus', is._to, {edgeCollectionRestriction:'start'})" +
        "return document(joined._to)))", {userId:userId}).toArray()[0];
    }
};

exports.removeExistingDeviceIds = function(deviceId) {
    db._query("for u in user " +
    "filter @deviceId in u.userData.device_ids " +
    "update {_key: u._key, userData:{device_ids:remove_value(u.userData.device_ids,@deviceId,1)}} in user", {deviceId:deviceId});
};

exports.getActivitiesWithGivenInterest = function(interestId)
{
    return db._query("return unique((for tagged in graph_edges('fiplus', @interestId, {edgeCollectionRestriction:'tagged'})" +
    "for suggested in graph_edges('fiplus', tagged._from, {edgeCollectionRestriction:'suggested'})" +
    "for is in graph_edges('fiplus', suggested._to, {edgeCollectionRestriction:'is', endVertexCollectionRestriction:'time_period'})" +
    "for start in graph_edges('fiplus', is._to, {edgeCollectionRestriction:'start'})" +
    "filter document(start._to).value >= date_now() AND !document(tagged._from).is_cancelled " +
    "return document(tagged._from)))", {interestId:interestId}).toArray()[0];
};

exports.getInterestsOfUser = function(userId)
{
    return db._query("return unique((for interested_in in graph_edges('fiplus', @userId, {edgeCollectionRestriction:'interested_in'})" +
    "return document(interested_in._to)))", {userId:userId}).toArray()[0];
};


exports.getDefaultActivities = function()
{
    var returnValue = "return activity";
    return db._query(
        "let activities = (for a in activity return a) " +
        getFutureSuggestedAndNotConfirmedActivities(returnValue) +
        getFutureConfirmedActivities(returnValue) +
        "return union_distinct(s,c)").toArray()[0];
};
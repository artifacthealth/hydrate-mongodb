var ChangeTracking;
(function (ChangeTracking) {
    ChangeTracking[ChangeTracking["DeferredImplicit"] = 0] = "DeferredImplicit";
    ChangeTracking[ChangeTracking["DeferredExplicit"] = 1] = "DeferredExplicit";
    ChangeTracking[ChangeTracking["Observe"] = 2] = "Observe";
})(ChangeTracking || (ChangeTracking = {}));
module.exports = ChangeTracking;

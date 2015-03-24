var RegExpUtil;
(function (RegExpUtil) {
    function clone(source) {
        var flags = [];
        if (source.global) {
            flags.push('g');
        }
        if (source.multiline) {
            flags.push('m');
        }
        if (source.ignoreCase) {
            flags.push('i');
        }
        return new RegExp(source.source, flags.join(''));
    }
    RegExpUtil.clone = clone;
})(RegExpUtil || (RegExpUtil = {}));
module.exports = RegExpUtil;

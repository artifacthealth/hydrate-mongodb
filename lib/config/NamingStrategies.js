var changeCase = require("change-case");
var NamingStrategies;
(function (NamingStrategies) {
    /**
     * The name is passed through as-is.
     * @param name The name.
     */
    function None(name) {
        return name;
    }
    NamingStrategies.None = None;
    /**
     * The name separators are denoted by having the next letter capitalized.
     * @param name The name.
     */
    function CamelCase(name) {
        return changeCase.camelCase(name);
    }
    NamingStrategies.CamelCase = CamelCase;
    /**
     * The same as CamelCase except with the first letter also capitalized.
     * @param name The name.
     */
    function PascalCase(name) {
        return changeCase.pascalCase(name);
    }
    NamingStrategies.PascalCase = PascalCase;
    /**
     * The name is a lowercase underscore separated string.
     * @param name The name.
     */
    function SnakeCase(name) {
        return changeCase.snakeCase(name);
    }
    NamingStrategies.SnakeCase = SnakeCase;
})(NamingStrategies || (NamingStrategies = {}));
module.exports = NamingStrategies;

import helpers = require("./helpers");
import model = require("./fixtures/model");

import MappingRegistry = require("../src/mapping/mappingRegistry");
import Mapping = require("../src/mapping/mapping");
import SessionFactoryImpl = require("../src/sessionFactoryImpl");
import AnnotationMappingProvider = require("../src/mapping/providers/annotationMappingProvider");

import EntityMapping = require("../src/mapping/entityMapping");
import StringMapping = require("../src/mapping/stringMapping");
import ArrayMapping = require("../src/mapping/arrayMapping");
import ClassMapping = require("../src/mapping/classMapping");
import EnumMapping = require("../src/mapping/enumMapping");
import Property = require("../src/mapping/property");
import ObjectIdGenerator = require("../src/id/objectIdGenerator");

var mappingProvider = new AnnotationMappingProvider({ identityGenerator: new ObjectIdGenerator() });
mappingProvider.addFile("build/tests/fixtures/model.d.json");
mappingProvider.getMapping((err, registry) => {
    if (err) throw err;

    var identity = (<EntityMapping>registry.getMappingForConstructor(model.Person).inheritanceRoot).identity;

    var mapping = registry.getMappingForConstructor(model.Person);

    var person = new model.Person(new model.PersonName("Jones", "Bob"));
    person.phones = [ new model.Phone("303-258-1111", model.PhoneType.Work) ];
    (<any>person)._id = identity.generate();
    person.addAttribute("eye color", "hazel");
    person.addAttribute("hair color", "brown");
    person.addAttribute("temperament", "angry");

    for(var i = 0; i < 100; i++) {
        var parent1 = new model.Person(new model.PersonName("Jones", "Mary"));
        (<any>parent1)._id = identity.generate();
        person.addParent(parent1);
    }

    run(mapping, person);
});

function run(mapping: Mapping, person: model.Person) {

    var errors: any[] = [];
    var visited: any[] = [];
    var document = mapping.write(person, null, errors, visited);
    var obj = mapping.read(document, null, errors);
    obj.parents = obj.parents.reverse();

    var start = process.hrtime();

    for(var i = 0; i < 10000; i++) {
        var errors: any[] = [];
        var visited: any[] = [];
        var document = mapping.write(person, "", errors, visited);
        //                 var obj = mapping.read(document, null, errors);
        //                var changes: any = {};
        //                mapping.compare(obj, document, changes, "");
    }

    // divide by a million to get nano to milli
    var elapsed = process.hrtime(start);
    console.log("loaded " + i + " objects in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");
}
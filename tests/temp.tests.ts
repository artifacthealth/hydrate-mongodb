/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />
/// <reference path="../typings/mongodb.d.ts" />

import {assert} from "chai";
import * as helpers from "./helpers";
import * as model from "./fixtures/model";
import * as mongodb from "mongodb";

import {PersisterImpl} from "../src/persisterImpl";
import {SessionImpl} from "../src/sessionImpl";
import {MockSessionFactory} from "./mockSessionFactory";
import {MockCollection} from "./driver/mockCollection";
import {MappingRegistry} from "../src/mapping/mappingRegistry";
import {EntityMapping} from "../src/mapping/entityMapping";
import {InternalSession} from "../src/internalSession";
import {SessionFactoryImpl} from "../src/sessionFactoryImpl";
import {SessionFactory} from "../src/sessionFactory";
import {AnnotationMappingProvider} from "../src/mapping/providers/annotationMappingProvider";
import {Configuration} from "../src/config/configuration";
import {ObjectIdGenerator} from "../src/id/objectIdGenerator";
import {ReadContext} from "../src/mapping/readContext";
import {ClassMapping} from "../src/mapping/classMapping";

var test = new Map<string, number>();

describe('Temp', () => {

    it.skip('test against mongodb', (done) => {

        mongodb.MongoClient.connect("mongodb://localhost:27017/artifact", (err, connection) => {

            var mapping = new AnnotationMappingProvider();
            mapping.addModule(model);

            var config = new Configuration();
            config.addMapping(mapping);
            config.createSessionFactory(connection, (err: Error, sessionFactory: SessionFactory) => {
                if (err) return done(err);

                var session = sessionFactory.createSession();

                /*
                 session.query(model.Person).findOne({ 'personName.first': 'Bob' }, (err, result) => {

                 session.remove(result);
                 session.query(model.Person).findOneAndRemove({ 'personName.first': 'Bob2' }, (err, result) => {
                 if(err) return done(err);
                 console.log("IN FINDONEANDREMOVE RESULT");
                 done();
                 });
                 });
                 */

                /*
                 session.query(model.Person).findOne({ 'name': 'Jones, Mary' }, (err, result) => {
                 //session.remove(result);
                 session.query(model.Person).findOneAndUpdate({ 'name': 'Jones, Mary' }, { $set: { name: 'Mary' }}).returnUpdated((err, result) => {
                 if(err) return done(err);
                 console.log("IN FINDONEANDUPDATE RESULT");
                 done();
                 });
                 });
                 */

                session.query(model.Person).findOne({'_name': 'Jones, Bob'}, (err, result) => {
                    if (err) return done(err);

                    result.parents[2] = new model.Person(new model.PersonName("Gottlieb", "Meir"));
                    done();
                });

                /*
                 session.query(model.Person).findOneAndUpdate({ 'name': 'Jones, Mary' }, { $set: { name: 'Mary' }}).returnUpdated((err, result) => {
                 if(err) return done(err);
                 console.log("IN FINDONEANDUPDATE RESULT");
                 done();
                 });
                 */

                /*
                 session.query(model.Person).distinct("personName", { 'personName.first': 'Mary' }, (err, results) => {
                 if(err) return done(err);
                 console.log("Distinct:");
                 for(var i = 0; i < results.length; i++) {
                 console.log(results[i]);
                 }
                 });
                 */

                //  session.wait(done);

                /*
                 var count = 0;
                 var start = process.hrtime();
                 session.query(model.Person).findAll({ 'personName.last': 'Jones' }).each((entity, done) => {
                 count++;
                 process.nextTick(done);
                 }, (err) => {
                 if(err) return done(err);
                 var elapsed = process.hrtime(start);
                 console.log("findAll.each processed " + count + " items in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");
                 done();
                 });
                 */

                /*
                 var start = process.hrtime();
                 session.query(model.Person).findAll({ 'personName.last': 'Jones' }, (err, entities) => {
                 if(err) return done(err);
                 var elapsed = process.hrtime(start);
                 console.log("findAll processed " + entities.length + " items in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");
                 done();
                 });
                 */

                return;

                /*var person = new model.Person(new model.PersonName("Jones", "Bob"));

                 person.phones = [ new model.Phone("303-258-1111", model.PhoneType.Work) ];

                 var parent1 = new model.Person(new model.PersonName("Jones", "Mary"));
                 person.addParent(parent1);

                 var parent2 = new model.Person(new model.PersonName("Jones", "Jack"));
                 person.addParent(parent2);

                 session.save(person);
                 session.flush((err) => {
                 if(err) return done(err);

                 person.birthDate = new Date(1977, 7, 18);

                 session.flush(done);
                 });*/


                //var ids = ["54b8a19659731ff8ccfc2fe7"];
                var ids = ["54b8a19659731ff8ccfc2fe5", "54b8a19659731ff8ccfc2fe7"];

                /*
                 session.find(model.Person, <any>mongodb.ObjectID.createFromHexString("54b8a19659731ff8ccfc2fe5"), (err, entity) => {
                 if(err) return done(err);
                 console.log(entity);
                 done();
                 });
                 */

                for (var i = 0; i < ids.length; i++) {
                    session.find(model.Person, ids[i], (err, entity) => {
                        if (err) return done(err);

                        session.fetch(entity, "children", (err, result) => {
                            if (err) return done(err);
                            done();
                        });
                    });
                }

                session.flush(done);

            });
        });
    });

    it.skip('save', (done) => {

        mongodb.MongoClient.connect("mongodb://localhost:27017/artifact", (err, connection) => {

            var mapping = new AnnotationMappingProvider();
            mapping.addModule(model);

            var config = new Configuration();
            config.addMapping(mapping);

            config.createSessionFactory(connection, (err: Error, sessionFactory: SessionFactory) => {
                if (err) throw err;

                var session = <SessionImpl>sessionFactory.createSession();

                var start = process.hrtime();
                var list: any[] = [];
                for (var j = 0; j < 100; j++) {
                    var person = new model.Person(new model.PersonName("Jones", "Bob"));
                    person.phones = [new model.Phone("303-258-1111", model.PhoneType.Work)];

                    for (var i = 0; i < 100; i++) {
                        var parent1 = new model.Person(new model.PersonName("Jones", "Mary"));
                        person.addParent(parent1);
                    }

                    list.push(person);
                }
                // divide by a million to get nano to milli
                var elapsed = process.hrtime(start);
                console.log("Created " + j + " objects in " + elapsed[0] + "s, " + (elapsed[1] / 1000000).toFixed(3) + "ms");

                var start = process.hrtime();
                for (var i = 0; i < list.length; i++) {
                    session.save(list[i]);
                }

                //session.save(person, (err) => {
                session.flush((err) => {
                    if (err) return done(err);
                    // divide by a million to get nano to milli
                    var elapsed = process.hrtime(start);
                    console.log("Saved " + j + " objects in " + elapsed[0] + "s, " + (elapsed[1] / 1000000).toFixed(3) + "ms");
                    done();
                });
            });
        });
    });


    it.skip('performance test', (done) => {

        var mappingProvider = new AnnotationMappingProvider();
        mappingProvider.addModule(model);
        mappingProvider.getMapping(new Configuration(), (err, mappings) => {
            if (err) return done(err);

            var registry = new MappingRegistry();
            registry.addMappings(<ClassMapping[]>mappings);
            var factory = new SessionFactoryImpl({}, registry);
            var session = <InternalSession>factory.createSession();
            var identity = (<EntityMapping>registry.getMappingForConstructor(model.Person).inheritanceRoot).identity;

            var mapping = registry.getMappingForConstructor(model.Person);

            var start = process.hrtime();

            for(var j = 0; j < 1000; j++) {
                var person = new model.Person(new model.PersonName("Jones", "Bob"));
                person.phones = [new model.Phone("303-258-1111", model.PhoneType.Work)];
                (<any>person)._id = identity.generate();
                person.addAttribute("eye color", "hazel");
                person.addAttribute("hair color", "brown");
                person.addAttribute("temperament", "angry");
/*
                for (var i = 0; i < 100; i++) {
                    var parent1 = new model.Person(new model.PersonName("Jones", "Mary"));
                    (<any>parent1)._id = identity.generate();
                    person.addParent(parent1);
                }*/
            }

            // divide by a million to get nano to milli
            var elapsed = process.hrtime(start);
            console.log("Created " + j + " objects in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");

            var errors: any[] = [];
            var visited: any[] = [];
            var document = mapping.write(person, "", errors, visited);
            var context = new ReadContext(session);
            var obj = mapping.read(context, document);
            // obj.parents = obj.parents.reverse();
            //obj.gender = model.Gender.Male;

            var start = process.hrtime();

            for(var i = 0; i < 10000; i++) {
                var context = new ReadContext(session);
                //                var visited: any[] = [];
                //                var document = mapping.write(person, "", errors, visited);
                var obj = mapping.read(context, document);
                //                var changes: any = {};
                //                mapping.compare(obj, document, changes, "");
            }

            // divide by a million to get nano to milli
            var elapsed = process.hrtime(start);
            console.log("Processed " + i + " objects in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");

            done();
        });
    });

});


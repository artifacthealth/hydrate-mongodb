/// <reference path="../typings/mongodb.d.ts" />
/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />

import mongodb = require("mongodb");
import async = require("async");
import chai = require("chai");
import assert = chai.assert;
import helpers = require("./helpers");

import Configuration = require("../src/config/configuration");
import SessionFactory = require("../src/sessionFactory");
import SessionFactoryImpl = require("../src/sessionFactoryImpl");
import SessionImpl = require("../src/sessionImpl");
import EntityMapping = require("../src/mapping/entityMapping");
import MockPersister = require("./mockPersister");
import AnnotationMappingProvider = require("../src/mapping/providers/annotationMappingProvider");
import MappingRegistry = require("../src/mapping/mappingRegistry");
import ObjectIdGenerator = require("../src/id/objectIdGenerator");
import QueryKind = require("../src/query/queryKind");

// Fixtures
import model = require("./fixtures/model");
import cascade = require("./fixtures/cascade");

describe('SessionImpl', () => {

    it.skip('test against mongodb', (done) => {

        var config = new Configuration({ uri: "mongodb://localhost:27017/artifact" });
        config.addDeclarationFile("build/tests/fixtures/model.d.json");
        config.createSessionFactory((err: Error, sessionFactory: SessionFactory) => {
            if(err) return done(err);

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

            session.query(model.Person).findOne({ 'name': 'Jones, Mary' }, (err, result) => {
                //session.remove(result);
                session.query(model.Person).findOneAndUpdate({ 'name': 'Jones, Mary' }, { $set: { name: 'Mary' }}).returnUpdated((err, result) => {
                    if(err) return done(err);
                    console.log("IN FINDONEANDUPDATE RESULT");
                    done();
                });
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

            for(var i = 0; i < ids.length; i++) {
                session.find(model.Person, ids[i], (err, entity) => {
                    if(err) return done(err);

                    session.fetch(entity, "children", (err, result) => {
                        if(err) return done(err);
                        done();
                    });
                });
            }

            session.flush(done);

        });
    });


    describe('save', () => {

        it('generates an identifier for the object', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if(err) return done(err);

                var entity = createEntity();
                factory.createSession().save(entity, (err) => {
                    if (err) return done(err);

                    assert.isTrue(entity["_id"] !== undefined, "Entity was not assigned an identifier");
                    done();
                });
            });
        });

        it('returns an error if a persister cannot be found for the object', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                factory.createSession().save({}, (err) => {
                    // TODO: check error code
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });

        it('returns an error if the object is a detached entity', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity(1);

                factory.createSession().save(entity, (err) => {
                    // TODO: check error code
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });

        it('schedules newly managed objects for insert', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity();
                var session = factory.createSession();

                session.save(entity);
                session.flush((err) => {
                    if (err) return done(err);

                    var persister = factory.getPersisterForObject(session, entity);

                    assert.equal(persister.insertCalled, 1);
                    assert.isTrue(persister.wasInserted(entity));
                    done();
                });
            });
        });

        it('cancels pending removal for saved entity', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity();
                var session = factory.createSession();

                session.save(entity);
                // Flush after save because if we call remove after save without a flush, it cancels the save operations
                // and never schedules a remove operation to begin with.
                session.flush();
                session.remove(entity, (err) => {
                    if (err) return done(err);

                    var id = entity._id;

                    // Confirm that entity has been removed. GetObject returns null (as opposed to undefined) if object
                    // is managed but scheduled for removal.
                    assert.isNull(session.getObject(id), "Object is not scheduled for remove");

                    session.save(entity, (err) => {
                        if (err) return done(err);

                        assert.equal(session.getObject(id), entity, "Scheduled remove operation was not cancelled");

                        session.flush((err) => {
                            if (err) return done(err);

                            var persister = factory.getPersisterForObject(session, entity);

                            assert.equal(persister.removeCalled, 0);
                            assert.equal(persister.insertCalled, 1);
                        });
                        done();
                    });
                });
            });
        });

        it('cascades save operation to properties that have the cascade flag', (done) => {

            helpers.createFactory("cascade", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var entity = cascade.SaveTest.create();

                session.save(entity);
                session.flush(err => {
                    if (err) return done(err);

                    var persister = factory.getPersisterForObject(session, entity);
                    assert.equal(persister.insertCalled, entity.cascadeArray.length + 2);
                    done();
                });
            });
        });
    });

    describe('remove', () => {

        it('cancels pending insert for newly manged objects', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity();
                var session = factory.createSession();

                session.save(entity);
                session.remove(entity, err => {

                    assert.isFalse(session.contains(entity), "Entity was not removed from the session");
                    assert.isTrue(entity["_id"] !== undefined, "Remove operation should not remove identifier until after flush");

                    session.flush(err => {
                        if (err) return done(err);

                        assert.isUndefined(entity["_id"], "Identifier was not removed from the object after flush");

                        var persister = factory.getPersisterForObject(session, entity);
                        assert.equal(persister.removeCalled, 0, "Remove should not have been called because object was never persister");
                        assert.equal(persister.insertCalled, 0, "Scheduled insert operation was not canceled");
                        done();
                    });
                });
            });
        });

        it('schedules persisted object for removal', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity();
                var session = factory.createSession();

                session.save(entity);
                session.flush();
                session.remove(entity, err => {
                    if (err) return done(err);

                    assert.isFalse(session.contains(entity), "Entity was not removed from the session");
                    assert.isTrue(entity["_id"] !== undefined, "Remove operation should not remove identifier until after flush");

                    session.flush(err => {
                        if (err) return done(err);

                        assert.isUndefined(entity["_id"], "Identifier was not removed from the object after flush");

                        var persister = factory.getPersisterForObject(session, entity);
                        assert.equal(persister.removeCalled, 1);
                        done();
                    });
                });
            });
        });

        it('returns an error if the object is a detached entity', (done) => {
            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity(1);
                var session = factory.createSession();

                session.remove(entity, (err) => {
                    // TODO: check error code
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });

        it('does nothing for unmanaged objects', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity();
                var session = factory.createSession();

                // pass unmanaged object to remove
                session.remove(entity);
                session.flush(err => {
                    if (err) return done(err);

                    var persister = factory.getPersisterForObject(session, entity);
                    assert.equal(persister.removeCalled, 0);
                    done();
                });
            });
        });

        it('does nothing for persisted objects pending removal', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity();
                var session = factory.createSession();

                session.save(entity);
                session.flush();
                // call remove twice but it should result it only one call to persister.remove
                session.remove(entity);
                session.remove(entity);
                session.flush(err => {
                    if (err) return done(err);
                    var persister = factory.getPersisterForObject(session, entity);
                    assert.equal(persister.removeCalled, 1);
                    done();
                });
            });
        });

        it('cascades remove operation to properties that have the cascade flag', (done) => {

            helpers.createFactory("cascade", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var entity = cascade.RemoveTest.create();

                session.save(entity);
                session.flush();
                session.remove(entity);
                session.flush(err => {
                    if (err) return done(err);
                    var persister = factory.getPersisterForObject(session, entity);
                    assert.equal(persister.removeCalled, 4);
                    assert.isFalse(session.contains(entity.cascadeField));
                    assert.isFalse(session.contains(entity.cascadeArray[0]));
                    assert.isFalse(session.contains(entity.cascadeArray[1]));
                    assert.isTrue(session.contains(entity.controlField));
                    assert.isTrue(session.contains(entity.controlArray[0]));
                    assert.isTrue(session.contains(entity.controlArray[1]));
                    done();
                });
            });
        });

        it('resolves references when cascading remove operation to properties that have the cascade flag', (done) => {

            helpers.createFactory("cascade", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var entity = new cascade.RemoveReferenceTest();

                var generator = new ObjectIdGenerator();
                var ctr = cascade.RemoveTest;
                entity.cascadeField = session.getReference(ctr, generator.generate());
                entity.controlField = session.getReference(ctr, generator.generate());

                var persister = factory.getPersisterForConstructor(session, cascade.RemoveTest);
                persister.onFindOneById = (id, callback) => {
                    var ret = <any>new cascade.RemoveTest();
                    ret._id = id;
                    session.registerManaged(persister, ret, {});
                    callback(null, ret);
                }

                session.save(entity);
                session.flush();
                session.remove(entity);
                session.flush(err => {
                    if (err) return done(err);
                    // There are two different persisters. The persister for RemoveReferenceTest will call remove
                    // once and the persister for RemoveTest will cal remove once
                    assert.equal(factory.getPersisterForConstructor(session, cascade.RemoveReferenceTest).removeCalled, 1);
                    assert.equal(factory.getPersisterForConstructor(session, cascade.RemoveTest).removeCalled, 1);
                    done();
                });
            });
        });
    });

    describe('refresh', () => {

    });

    describe('detach', () => {

        it('makes managed object unmanaged but does not remove identifier', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity();
                var session = factory.createSession();

                session.save(entity);
                session.flush();
                session.detach(entity, err => {
                    if (err) return done(err);

                    assert.isTrue(entity["_id"] !== undefined, "Detach operation should not remove identifier");
                    assert.isUndefined(session.getObject(entity["_id"]), "Object is still managed")
                    done();
                });
            });
        });

        it('does not throw an error when passed an unmanaged object', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity();
                var session = factory.createSession();

                // pass unmanaged object to detach
                session.detach(entity, done);
            });
        });

        it('does not throw an error when passed a removed object', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity();
                var session = factory.createSession();

                session.save(entity);
                session.flush();
                session.remove(entity);
                session.detach(entity, done);
            });
        });

        it('cascades detach operation to properties that have the cascade flag', (done) => {

            helpers.createFactory("cascade", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var entity = cascade.DetachTest.create();

                session.save(entity);
                session.detach(entity, err => {
                    if (err) return done(err);

                    assert.isFalse(session.contains(entity.cascadeField));
                    assert.isFalse(session.contains(entity.cascadeArray[0]));
                    assert.isFalse(session.contains(entity.cascadeArray[1]));
                    assert.isTrue(session.contains(entity.controlField));
                    assert.isTrue(session.contains(entity.controlArray[0]));
                    assert.isTrue(session.contains(entity.controlArray[1]));
                    done();
                });
            });
        });
    });

    describe('clear', () => {

        it('detaches all managed entities', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var entity1 = createEntity();
                var entity2 = createEntity();

                session.save(entity1);
                session.save(entity2);
                session.flush();
                session.clear(err => {
                    if (err) return done(err);

                    assertDetached(entity1);
                    assertDetached(entity2);
                    done();

                    function assertDetached(entity: any) {
                        assert.isTrue(entity["_id"] !== undefined, "Clear operation should not remove identifier");
                        assert.isUndefined(session.getObject(entity["_id"]), "Object is still managed")
                    }
                });
            });
        });

        it('discards object modifications that have not been flushed', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var entity = createEntity();

                session.save(entity);
                session.clear();
                session.flush((err) => {
                    if (err) return done(err);

                    var persister = factory.getPersisterForObject(session, entity);
                    assert.equal(persister.insertCalled, 0);
                    done();
                });
            });
        });
    });

    describe('flush', () => {

    });

    describe('find', () => {

        it('executes callback passing the entity that has the specified id if the entity exists in the database', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query, callback) => {
                    assert.equal(query.kind, QueryKind.FindOneById);
                    assert.equal(query.criteria, 1);
                    var ret = new model.Person(new model.PersonName("Smith"));
                    (<any>ret)._id = query.criteria;
                    session.registerManaged(persister, ret, {});
                    callback(null, ret);
                }

                session.find(model.Person, 1, (err, entity) => {
                    assert.equal(entity.personName.last, "Smith");
                    done();
                });
            });
        });

        it('throws an error if more than one callback is passed to a function in the chain', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) throw err;

                var session = factory.createSession();

                session.find(model.Person, 1, (err, entity) => {
                    if(err) return done(err);
                }).fetch("children", (err, entity) => {
                    // TODO: check error code
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });

        it('allows for fetch function calls to be chained if callback is not passed to find method', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);

                var executeQueryCalled = 0;
                // session should call this once to find the entity
                persister.onExecuteQuery = (query, callback) => {
                    executeQueryCalled++;

                    assert.equal(query.kind, QueryKind.FindOneById);
                    assert.equal(query.criteria, 1);

                    assert.isTrue(query.fetchPaths.length > 0, "Fetch was not added to the query");

                    callback(null, null);
                }

                session.find(model.Person, 1).fetch("children", (err, entity) => {
                    if(err) return done(err);
                    assert.equal(executeQueryCalled, 1);
                    done();
                });
            });
        });
    });

    describe('getId', () => {

        it('returns the identifier of the object', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var id = "identifier value";
                var entity = createEntity(id);

                assert.equal(session.getId({_id: id}), id);
                done();
            });
        });
    });

    describe('contains', () => {

    });

    describe('getObject', () => {

    });

    describe('registerManaged', () => {

    });

    describe('getPersister', () => {

        it('caches the persister for each mapping', () => {
            var registry = new MappingRegistry();
            var mappingA = new EntityMapping();
            var mappingB = new EntityMapping();

            var factory = new SessionFactoryImpl([], registry);
            var session = new SessionImpl(factory);

            // two calls to getPersister for mappingA
            var persisterA1 = session.getPersister(mappingA);
            var persisterA2 = session.getPersister(mappingA);

            // twp calls to getPersister for mappingB
            var persisterB1 = session.getPersister(mappingB);
            var persisterB2 = session.getPersister(mappingB);

            // make sure persisters for same mappings are the same
            assert.equal(persisterA1, persisterA2, "Persisters for same mappings should be the same");
            assert.equal(persisterB1, persisterB2, "Persisters for same mappings should be the same");

            assert.notEqual(persisterA1, persisterB1, "Persisters for different mappings should be different");
        });
    });

});

function createEntity(id?: any): any {
    var ret = new model.Person(new model.PersonName("Jones"));
    if(id !== undefined) {
        (<any>ret)._id = id;
    }
    return ret;
}
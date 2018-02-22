import {assert} from "chai";
import {ObjectID} from "mongodb";
import * as helpers from "./helpers";
import * as model from "./fixtures/model";
import {SessionFactoryImpl} from "../src/sessionFactory";
import {SessionImpl, InternalSession} from "../src/session";
import {EntityMapping} from "../src/mapping/entityMapping";
import {MockPersister} from "./mockPersister";
import {MappingRegistry} from "../src/mapping/mappingRegistry";
import {ObjectIdGenerator} from "../src/config/objectIdGenerator";
import {QueryKind} from "../src/query/queryKind";
import {Callback} from "../src/core/callback";

// Fixtures
import {Cat} from "./fixtures/cat";
import {Kitten} from "./fixtures/kitten";
import {Dog} from "./fixtures/dog";
import {Person} from "./fixtures/classImmutable";
import * as cascade from "./fixtures/cascade";
import {MockDb} from "./driver/mockDb";
import * as fetchLazyModel from "./fixtures/fetchLazy";
import {setIdentifier} from "./helpers";
import {MockMongoClient} from "./driver/mockMongoClient";

describe('SessionImpl', () => {

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

            cancelRemovalOfManagedObject("model", () => createEntity(), null, (err, persister) => {
                if(err) return done(err);
                // changeTracking is deferred implicit so all objects will be dirty checked
                assert.equal(persister.dirtyCheckCalled, 1);
                done();
            });
        });

        it.skip('does not schedule object for dirty check if removal of clean object is canceled and change tracking is observe', (done) => {

            cancelRemovalOfManagedObject("cat", () => new Cat("Mittens"), null, (err, persister) => {
                if(err) return done(err);
                assert.equal(persister.dirtyCheckCalled, 0);
                done();
            });
        });

        it.skip('schedules object for dirty check if removal of dirty object is canceled and change tracking is observe', (done) => {

            cancelRemovalOfManagedObject("cat", () => new Cat("Mittens"), (session, entity) => entity.name = "Fluffy", (err, persister) => {
                if(err) return done(err);
                assert.equal(persister.dirtyCheckCalled, 1);
                done();
            });
        });

        it('does not schedule object for dirty check if removal of clean object is canceled and change tracking is deferred explicit', (done) => {

            cancelRemovalOfManagedObject("dog", () => new Dog("Rocky"), null, (err, persister) => {
                if(err) return done(err);
                assert.equal(persister.dirtyCheckCalled, 0);
                done();
            });
        });

        it('schedules object for dirty check if removal of dirty object is canceled and change tracking is deferred explicit', (done) => {

            cancelRemovalOfManagedObject("dog", () => new Dog("Rocky"), (session, entity) => session.save(entity), (err, persister) => {
                if(err) return done(err);
                assert.equal(persister.dirtyCheckCalled, 1);
                done();
            });
        });

        it('only inserts an object once even if save is called multiple times on a new object', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity();
                var session = factory.createSession();

                session.save(entity);
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

        function cancelRemovalOfManagedObject(fixture: string, create: () => any, modify: (session: InternalSession, entity: any) => void, done: (err?: Error, persistier?: MockPersister) => void) {

            helpers.createFactory(fixture, (err, factory) => {
                if (err) return done(err);

                var entity = create();
                var session = factory.createSession();

                session.save(entity);
                // Flush after save because if we call remove after save without a flush, it cancels the save operations
                // and never schedules a remove operation to begin with.
                session.flush(() => {

                    // modify object to make it dirty (changeTracking is "observe")
                    modify && modify(session, entity);

                    session.remove(entity, (err) => {
                        if (err) return done(err);

                        var id = (<any>entity)._id;

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
                                done(null, persister);
                            });
                        });
                    });
                });
            });
        }

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

    describe('isDirty', () => {

        it('returns true if the entity is not equal to the original document', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                var entity = createEntity();

                // setup persister to handle onFindOneById call
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onAreDocumentsEqual = (context, checkedEntity, originalDocument) => {
                    assert.ok(context);
                    assert.ok(originalDocument, "Expected original document");
                    assert.equal(checkedEntity, entity);
                    return false;
                };

                session.save(entity, (err) => {
                    if (err) return done(err);

                    session.flush((err) => {
                        if (err) return done(err);

                        assert.isTrue(session.isDirty(entity));
                        done();
                    });
                });
            });
        });

        it('calls callback with true if the entity is not equal to the original document', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                // setup persister to handle onFindOneById call
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onAreDocumentsEqual = (context, entity, originalDocument) => {
                    return false;
                };

                var entity = createEntity();
                session.save(entity, (err) => {
                    if (err) return done(err);

                    session.flush((err) => {
                        if (err) return done(err);

                        session.isDirty(entity, (err, result) => {
                            if (err) return done(err);
                            assert.isTrue(result);
                            done();
                        });
                    });
                });
            });
        });


        it('returns false if the entity is equal to the original document', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                // setup persister to handle onFindOneById call
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onAreDocumentsEqual = (context, entity, originalDocument) => {
                    return true;
                };

                var entity = createEntity();
                session.save(entity, (err) => {
                    if (err) return done(err);

                    session.flush((err) => {
                        if (err) return done(err);

                        assert.isFalse(session.isDirty(entity));
                        done();
                    });
                });
            });
        });

        it('calls callback with false if the entity is equal to the original document', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                // setup persister to handle onFindOneById call
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onAreDocumentsEqual = (context, entity, originalDocument) => {
                    return true;
                };

                var entity = createEntity();
                session.save(entity, (err) => {
                    if (err) return done(err);

                    session.flush((err) => {
                        if (err) return done(err);

                        session.isDirty(entity, (err, result) => {
                            if (err) return done(err);
                            assert.isFalse(result);
                            done();
                        });
                    });
                });
            });
        });

        it('returns null if there is an error serializing the entity', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                // setup persister to handle onFindOneById call
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onAreDocumentsEqual = (context, entity, originalDocument) => {
                    context.error = new Error("Some error");
                    return null;
                };

                var entity = createEntity();
                session.save(entity, (err) => {
                    if (err) return done(err);

                    session.flush((err) => {
                        if (err) return done(err);

                        assert.isNull(session.isDirty(entity));
                        done();
                    });
                });
            });
        });

        it('calls callback with the error if there is error serializing the entity', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                // setup persister to handle onFindOneById call
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onAreDocumentsEqual = (context, entity, originalDocument) => {
                    context.error = new Error("Some error");
                    return null;
                };

                var entity = createEntity();
                session.save(entity, (err) => {
                    if (err) return done(err);

                    session.flush((err) => {
                        if (err) return done(err);

                        session.isDirty(entity, (err, result) => {
                            assert.ok(err);
                            done();
                        });
                    });
                });
            });
        });
    });

    describe('remove', () => {

        it('fetches object before remove if Reference is passed', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var entityId = new ObjectIdGenerator().generate();
                var fetchCalled = 0;

                // setup persister to handle onFindOneById call
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onFindOneById = (id, callback) => {
                    process.nextTick(() => {
                        assert.equal(id, entityId);
                        fetchCalled++;
                        callback(null, createEntity());
                    });
                }

                var entity = session.getReference(model.Person, entityId);

                session.remove(entity, err => {
                    if (err) return done(err);

                    assert.equal(fetchCalled, 1, "Entity was not fetched");
                    done();
                });
            });
        });

        it('cancels pending insert for newly manged objects', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity();
                var session = factory.createSession();

                session.save(entity);
                session.remove(entity, err => {

                    assert.isFalse(session.contains(entity), "Entity was not removed from the session");
                    assert.isUndefined(entity["_id"], "Identifier was not removed from the object");

                    session.flush(err => {
                        if (err) return done(err);

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

                var cascadeField = session.getReference(ctr, generator.generate());
                var controlField = session.getReference(ctr, generator.generate());

                entity.cascadeField = cascadeField;
                entity.controlField = controlField;

                var persister = factory.getPersisterForConstructor(session, cascade.RemoveTest);
                persister.onFindOneById = (id, callback) => {
                    var ret = <any>new cascade.RemoveTest();
                    setIdentifier(ret, id);
                    session.registerManaged(persister, ret, {});
                    callback(null, ret);
                };

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

        it('only removes an object once even if remove is called multiple times', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity();
                var session = factory.createSession();

                session.save(entity);
                session.flush();
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
    });

    describe('refresh', () => {

        it('returns an error if object is not managed', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity();
                var session = factory.createSession();

                session.refresh(entity, (err) => {
                    // TODO: Check error code
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });

        it('refreshes managed entity with the state from the database', (done) => {

            refresh(null, (err, entity, session, persister) => {
                if(err) return done(err);

                assert.equal(entity.name, "Tails");
                done();
            });
        });

        it('discards modifications to entity so entity is considered clean after refresh', (done) => {

            helpers.createFactory("dog", (err, factory) => {
                if (err) return done(err);

                var entity = new Dog("Snoopy");
                var session = factory.createSession();
                var persister = factory.getPersisterForObject(session, entity);

                var called = 0;
                persister.onRefresh = (entity, callback) => {
                    entity.name = "Tails";
                    called++;
                    process.nextTick(callback);
                };

                session.save(entity);
                session.flush((err) => {
                    if(err) return done(err);

                    // modify the object, making sure it's not dirty after refresh
                    entity.name = "Something";
                    session.save(entity); // tracking is deferred explicit

                    session.refresh(entity, (err) => {
                        if (err) return done(err);
                        assert.equal(called, 1, "refresh on Persister was not called");

                        session.flush((err) => {
                            if(err) return done(err);
                            assert.equal(persister.dirtyCheckCalled, 0, "Object still considered dirty after refresh");
                            done();
                        });
                    });
                });
            });
        });

        it.skip('should not cause object to become dirty when change tracking is observe', (done) => {

            refresh(null, (err, entity, session, persister) => {
                if(err) return done(err);

                session.flush((err) => {
                    if(err) return done(err);

                    assert.equal(persister.dirtyCheckCalled, 0, "Refresh caused object to become dirty");
                    session.close(done);
                });
            });
        });

        function refresh(beforeRefresh: (entity: any, callback: Callback) => void, callback: (err: Error, entity?: any, session?: InternalSession, persister?: MockPersister) => void) {

            helpers.createFactory("cat", (err, factory) => {
                if (err) return callback(err);

                var entity = new Cat("Fluffy");
                var session = factory.createSession();
                var persister = factory.getPersisterForObject(session, entity);

                var called = 0;
                persister.onRefresh = (entity, callback) => {
                    entity.name = "Tails"
                    called++;
                    process.nextTick(callback);
                }

                session.save(entity);
                session.flush((err) => {
                    if(err) return callback(err);
                    if(beforeRefresh) {
                        process.nextTick(() => {
                            beforeRefresh(entity, () => {
                                if(err) return callback(err);
                                doRefresh();
                            });
                        })
                    }
                    else {
                        doRefresh();
                    }
                });

                function doRefresh() {
                    session.refresh(entity, (err) => {
                        if (err) return callback(err);
                        assert.equal(called, 1, "refresh on Persister was not called");

                        callback(null, entity, session, persister);
                    });
                }
            });
        }
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

        it("makes an invalid session valid again", (done) => {

            helpers.createFactory("cat", (err, factory) => {
                if (err) return done(err);

                var entity = new Cat("Fluffy");
                var session = factory.createSession();
                var persister = factory.getPersisterForObject(session, entity);

                persister.onRefresh = (entity, callback) => {
                    callback(new Error("some error"))
                };

                // make the session invalid by causing an error on refresh
                session.save(entity);
                session.refresh(entity, (err) => {

                    // confirm that the session is now invalid
                    session.flush((err) => {
                        assert.ok(err);
                        assert.include(err.message, "Session is invalid. An error occurred during a previous action.");

                        // clearing the session should make it valid again
                        session.clear((err) => {
                            if (err) return done(err);

                            session.flush(done);
                        });
                    });
                });
            });
        });
    });

    describe('flush', () => {

        it('dirty checks all managed objects that are not scheduled for other operations and change tracking is deferred implicit', (done) => {

            dirtyCheckCalled("model", () => [createEntity(), createEntity()], null, 1, done);
        });

        it.skip('does not dirty check clean objects and change tracking is observe', (done) => {

            dirtyCheckCalled("cat", () => [new Cat("Fluffy"), new Cat("Mittens")], null, 0, done);
        });

        it.skip('dirty checks all dirty objects that are not scheduled for other operations and change tracking is observe', (done) => {

            dirtyCheckCalled("cat", () => [new Cat("Fluffy"), new Cat("Mittens")], (session, entities) => {
                entities[0].name = "Mittens";
                entities[1].name = "Fluffy";
            }, 1, done);
        });

        it('does not dirty check clean objects and change tracking is deferred explicit', (done) => {

            dirtyCheckCalled("dog", () => [new Dog("Rocky"), new Dog("Levi")], null, 0, done);
        });

        it('dirty checks all dirty objects that are not scheduled for other operations and change tracking is deferred explicit', (done) => {

            dirtyCheckCalled("dog", () => [new Dog("Rocky"), new Dog("Levi")], (session, entities) => {
                // saving an object with deferred explicit change tracking marks it as dirty
                session.save(entities[0]);
                session.save(entities[1]);
            }, 1, done);
        });

        it('does not dirty check immutable entities', (done) => {

            dirtyCheckCalled("classImmutable", () => [new Person("Bob"), new Person("Jones")], (session, entities) => {
                // note, an immutable should enforce that changes cannot be made, but even if it doesn't, changes are not persisted
                entities[0].name = "Smith";
                entities[1].name = "Smith";
            }, 0, done);
        });

        it('returns an error if there is an error when inserting', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity = createEntity();
                var session = factory.createSession();
                session.save(entity);

                var persister = factory.getPersisterForObject(session, entity);
                persister.insertError = new Error("some error");

                session.flush((err) => {

                    assert.equal(err.message, "some error");
                    done();
                });
            });
        });

        function dirtyCheckCalled(fixture: string, create: () => [any, any], modify: (session: InternalSession, entities: [any, any]) => void, expectedDirtyCheckCalled: number, done: (err?: Error) => void) {

            helpers.createFactory(fixture, (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var entities = create();
                var entity1 = entities[0];
                var entity2 = entities[1];
                var persister = factory.getPersisterForObject(session, entity1);

                session.save(entity1);
                session.flush((err) => {
                    if(err) return done(err);

                    assert.equal(persister.insertCalled, 1);

                    session.save(entity2); // schedule entity2 for something else. this entity should not be dirty checked.
                    modify && modify(session, [entity1, entity2]);

                    session.flush((err) => {
                        if (err) return done(err);

                        assert.equal(persister.insertCalled, 2);
                        assert.equal(persister.dirtyCheckCalled, expectedDirtyCheckCalled);
                        done();
                    });
                });
            });
        }
    });

    describe('find', () => {

        it('executes callback passing the entity that has the specified id if the entity exists in the database', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query, callback) => {
                    assert.equal(query.kind, QueryKind.FindOneById);
                    assert.equal(query.id, 1);
                    var ret = new model.Person(new model.PersonName("Smith"));
                    setIdentifier(ret, query.id);
                    session.registerManaged(persister, ret, {});
                    callback(null, ret);
                };

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
                    assert.equal(query.id, 1);

                    assert.isTrue(query.fetchPaths.length > 0, "Fetch was not added to the query");

                    callback(null, null);
                };

                session.find(model.Person, 1).fetch("children", (err, entity) => {
                    if(err) return done(err);
                    assert.equal(executeQueryCalled, 1);
                    done();
                });
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

            var factory = new SessionFactoryImpl(new MockMongoClient(), [], registry);
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

    describe('getEntities', () => {

        it('returns all managed entites', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var entity1 = createEntity();
                var entity2 = createEntity();
                var session = factory.createSession();

                session.save(entity1, (err) => {
                    if (err) return done(err);

                    session.save(entity2, (err) => {
                        if (err) return done(err);

                        var entities = session.getEntities();
                        assert.lengthOf(entities, 2);
                        assert.equal(entities[0], entity1);
                        assert.equal(entities[1], entity2);
                        done();
                    });
                });
            });
        });
    });

    describe('close', () => {

        it('marks sessions as closed such that any future actions will result in error', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                session.close(() => {
                    session.clear((err) => {
                        // TODO: check error code
                        assert.instanceOf(err, Error);
                        done();
                    });
                });
            });
        });

        it('flushes the session', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var entity = createEntity();
                session.save(entity);
                session.close(() => {
                    // confirm session was flushed by checking if entity was inserted
                    var persister = factory.getPersisterForObject(session, entity);
                    assert.equal(persister.insertCalled, 1);
                    assert.isTrue(persister.wasInserted(entity));
                    done();
                });
            });
        });

    });

    describe('getReference', () => {

        it('should convert id from string to correct type for derived entity class', (done) => {

            helpers.createFactory(["cat","kitten"], (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var ref = session.getReference(Kitten, new ObjectIdGenerator().generate().toString());

                assert.instanceOf((<any>ref)._id, ObjectID);
                done();
            });
        });

        it('should return a reference even id is invalid', (done) => {

            helpers.createFactory(["kitten"], (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var ref = session.getReference(Kitten, null);

                assert.ok(ref, "Expected getReference to return a Reference even if id is invalid.");
                done();
            });
        });
    });

    describe('fetch', () => {

        it('should return null if passed a null value for the entity', (done) => {

            helpers.createFactory("cat", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                session.fetch(null, (err, entity) => {
                    assert.isNull(entity);
                    done();
                });
            });
        });

        it('should return undefined if passed a undefined value for the entity', (done) => {

            helpers.createFactory("cat", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                session.fetch(undefined, (err, entity) => {
                    assert.isUndefined(entity);
                    done();
                });
            });
        });

        it.skip('should not cause object to become dirty when change tracking is observe', (done) => {

            helpers.createFactory("cat", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var entity = new Cat("Mittens");

                var parent = session.getReference(Cat, new ObjectIdGenerator().generate());

                entity.parent = parent;

                // setup persister to handle fetch call
                var persister = factory.getPersisterForObject(session, entity);
                persister.onFetch = (entity, path, callback) => {
                    assert.equal(path, "parent");
                    var parent = new Cat("Tails");
                    setIdentifier(parent, (<any>entity.parent)._id);
                    entity.parent = parent;
                    process.nextTick(callback);
                };

                // save and flush entity so we start tracking changes
                session.save(entity);
                session.flush();
                // make sure fetching does not cause object to become dirty
                session.fetch(entity, "parent");
                session.flush((err) => {
                    if (err) return done(err);

                    assert.equal(persister.dirtyCheckCalled, 0, "Fetch caused object to become dirty");
                    done();
                });
            });
        });

        it('should load the property value if a lazy property is fetched', (done) => {

            helpers.createFactory("fetchLazy", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var entity = new fetchLazyModel.A();
                
                // setup persister to handle fetch call
                var persister = factory.getPersisterForObject(session, entity);
                persister.onFetchPropertyValue = (entity, property, callback) => {
                    assert.equal(property.name, "b");
                    process.nextTick(() => callback(null, "some long value"));
                };

                // save and flush entity so it's managed
                session.save(entity);
                session.flush();
                // make sure fetching causes the property to be loaded
                assert.isUndefined(entity.b);
                session.fetch(entity, "b", (err) => {
                    if (err) return done(err);

                    assert.equal(entity.b, "some long value");
                    done();
                });
            });
        });
    });

    describe("toDocument", () => {

        it("returns the serialized document for an entity", (done) => {

            helpers.createFactory("cat", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                var entity = new Cat("Mittens");
                session.save(entity, (err) => {
                    if (err) return done(err);

                    var expected = { name: 'Mittens', _id: new ObjectID(entity.id) };
                    assert.deepEqual(session.toDocument(entity), expected);
                    
                    session.toDocument(entity, (err, document) => {
                        if (err) return done(err);

                        assert.deepEqual(document, expected);
                        done();
                    });
                });
            });
        });

        it("returns null if callback is not provided and object is not mapped as an entity", (done) => {

            helpers.createFactory("cat", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                assert.isNull(session.toDocument(new Date()));
                done();
            });
        });

        it("passes error to callback if callback is provided and object is not mapped as an entity", (done) => {

            helpers.createFactory("cat", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                session.toDocument(new Date(), (err) => {
                    assert.ok(err);
                    assert.include(err.message, "Object type is not mapped as an entity.");
                    done();
                });
            });
        });
    });
});

function createEntity(id?: any): any {
    var ret = new model.Person(new model.PersonName("Jones"));
    if(id !== undefined) {
        setIdentifier(ret, id);
    }
    return ret;
}
import {assert} from "chai";
import {ObjectID} from "mongodb";
import * as async from "async";
import * as helpers from "./helpers";
import * as model from "./fixtures/model";
import {Configuration} from "../src/config/configuration";
import {SessionFactory, SessionFactoryImpl} from "../src/sessionFactory";
import {SessionImpl, InternalSession} from "../src/session";
import {EntityMapping} from "../src/mapping/entityMapping";
import {MockPersister} from "./mockPersister";
import {AnnotationMappingProvider} from "../src/mapping/providers/annotationMappingProvider";
import {MappingRegistry} from "../src/mapping/mappingRegistry";
import {ObjectIdGenerator} from "../src/config/objectIdGenerator";
import {QueryKind} from "../src/query/queryKind";
import {Callback} from "../src/core/callback";
import {Reference} from "../src/reference";
import {getIdentifier} from "../src/index";

// Fixtures
import {Cat} from "./fixtures/cat";
import {Kitten} from "./fixtures/kitten";
import {Dog} from "./fixtures/dog";
import * as cascade from "./fixtures/cascade";

describe('hydrate', () => {

     describe('getIdentifier', () => {

        it('returns the identifier of the object', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var id = "identifier value";
                var entity = createEntity(id);

                assert.equal(getIdentifier({_id: id}), id);
                done();
            });
        });

        it('returns null if the object passed in is null', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                assert.isNull(getIdentifier(null));
                done();
            });
        });

        it('returns null if the object passed in is undefined', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                assert.isNull(getIdentifier(undefined));
                done();
            });
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
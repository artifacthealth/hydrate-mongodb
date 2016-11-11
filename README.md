[![Build Status](https://travis-ci.org/artifacthealth/hydrate-mongodb.svg?branch=master)](https://travis-ci.org/artifacthealth/hydrate-mongodb)

# Hydrate
**An Object/Document Mapping (ODM) framework for Node.js and MongodDB**

Hydrate provides a means for developers to map Node.js classes to documents stored in a MongoDB database. Developers can 
work normally with objects and classes, and Hydrate takes care of the onerous details such as 
serializing classes to documents, validation, mapping of class inheritance, optimistic locking, fetching of references 
between database collections, change tracking, and managing of persistence through bulk operations.

Hydrate is inspired by other projects including [JPA](https://en.wikipedia.org/wiki/Java_Persistence_API), 
[Hibernate](http://hibernate.org/orm/), and [Doctrine](http://doctrine-orm.readthedocs.org/projects/doctrine-mongodb-odm/en/latest/).
 
**NOTICE: Hydrate is an experimental project and is not recommended for production systems. It is also possible that 
breaking changes may be introduced in the API until version 1.0.0 is reached.** 


#### Idiomatic Javascript
Hydrate has no requirements for how persistent classes are declared. Developers can work with 
standard JavasScript idioms, such as constructor functions and ES6 classes. Furthermore, no 
base class is required for creating persistent classes. 

#### TypeScript support
[TypeScript](http://www.typescriptlang.org/) is a superset of JavaScript that includes type information and compiles 
to regular JavaScript. If you choose to use TypeScript in your projects, this type information can be used to create the 
mappings between your classes and the MongoDB documents, reducing duplicate work. However, TypeScript is not required 
and you can use Hydrate with plain JavaScript. 

#### Decorator support
Decorators are a method of annotating classes and properties in JavaScript at design time. There is currently a [proposal](https://github.com/wycats/javascript-decorators/)
to include decorators as a standard part of JavaScript in ES7. In the meantime, several popular transpilers including 
[Babel](https://babeljs.io/) and TypeScript make decorators available for use now. Hydrate gives developers the option
to leverages decorators as simple means to describe persistent classes.  

#### Familiar API
Hydrate uses a session-based approach to the persistence API similar to [Hibernate ORM](http://hibernate.org/orm/). Developers 
familiar with this approach should feel at home with Hydrate. Furthermore, Hydrate's query API is kept as similar as possible
to the MongoDB native Node.js driver.

#### High performance
MongoDB [bulk write operations](https://docs.mongodb.org/v3.0/core/bulk-write-operations/) are used to synchronize 
changes with the database, which can result in significant performance gains.


## Installation

Hydrate requires a minimum of [MongoDB 2.6](https://www.mongodb.org/downloads#production) and [Node 4.0](https://nodejs.org/). 
Once these dependencies are installed, Hydrate can be installed using [npm](https://www.npmjs.com/):
 
 
```sh
$ npm install hydrate-mongodb --save
```

## Getting Started

For brevity, the example here is only given in TypeScript. JavaScript examples coming soon.

### Defining a Model

In this example we'll model a task list. We create a file, `model.ts`, defining entities `Task` and `Person`. We also
define an enumeration used to indicate the status of a task on the task list.

**model.ts:**
```typescript
import {Entity, Field} from "hydrate-mongodb";

export enum TaskStatus {

    Pending,
    Completed,
    Archived
}

@Entity()
export class Person {

    @Field()
    name: string;
    
    constructor(name: string) {

        this.name = name;
    }
}

@Entity()
export class Task {

    @Field()
    text: string;

    @Field()
    status: TaskStatus;

    @Field()
    created: Date;
    
    @Field()
    assigned: Person;

    constructor(text: string) {

        this.created = new Date();
        this.status = TaskStatus.Pending;
        this.text = text;
    }

    archive(): boolean {

        if(this.status == TaskStatus.Completed) {
            this.status = TaskStatus.Archived;
            return true;
        }
        return false;
    }
}
```


### Configuring Hydrate

Once our model is defined, we need to tell Hydrate about it. We do this by adding the model to an 
[AnnotationMappingProvider](https://artifacthealth.github.io/hydrate-mongodb/classes/annotationmappingprovider.html), 
then adding the mapping provider to the [Configuration](https://artifacthealth.github.io/hydrate-mongodb/classes/configuration.html).

**server.ts:**
```typescript
import {MongoClient} from "mongodb";
import {Configuration, AnnotationMappingProvider} from "hydrate-mongodb";
import * as model from "./model";

var config = new Configuration();
config.addMapping(new AnnotationMappingProvider(model));
```


### Connecting to MongoDB

We use the standard [MongoDB native driver](https://github.com/mongodb/node-mongodb-native) to establish a connection 
to MongoDB. Once the connection is open, we create a 
[SessionFactory](https://artifacthealth.github.io/hydrate-mongodb/interfaces/sessionfactory.html) using the MongoDB connection and the previously 
defined [Configuration](https://artifacthealth.github.io/hydrate-mongodb/classes/configuration.html). 

**server.ts (con't):**
```typescript

MongoClient.connect('mongodb://localhost/mydatabase', (err, db) => {
    if(err) throw err;
    
    config.createSessionFactory(db, (err, sessionFactory) => {        
        ...
    });
});
```

### Creating a Session

A Hydrate Session should not be confused with the web-server session. The Hydrate Session is analogous to JPA's 
[EntityManager](http://www.objectdb.com/java/jpa/persistence/overview), and is responsible for managing the lifecycle of 
persistent entities.

Typically the [SessionFactory](https://artifacthealth.github.io/hydrate-mongodb/interfaces/sessionfactory.html) is 
created once at server startup and then used to create a [Session](https://artifacthealth.github.io/hydrate-mongodb/interfaces/session.html) for each connection to 
the server. For example, using a [Session](https://artifacthealth.github.io/hydrate-mongodb/interfaces/session.html) 
in an [Express](http://expressjs.com/en/guide/routing.html) route might look something like this:

```typescript

app.get('/', function (req, res, next) {
    
    var session = sessionFactory.createSession();

    ...
   
    session.close(next); 
}); 
```

Calling [close](https://artifacthealth.github.io/hydrate-mongodb/interfaces/session.html#close)
on the [Session](https://artifacthealth.github.io/hydrate-mongodb/interfaces/session.html) persists 
any changes to the database and closes the [Session](https://artifacthealth.github.io/hydrate-mongodb/interfaces/session.html). 
Call [flush](https://artifacthealth.github.io/hydrate-mongodb/interfaces/session.html#flush) 
instead to persist any changes without closing the [Session](https://artifacthealth.github.io/hydrate-mongodb/interfaces/session.html).


### Working with Persistent Objects

In order to create a new `Task` we instantiate the task and then add it to the 
[Session](https://artifacthealth.github.io/hydrate-mongodb/interfaces/session.html) by calling 
[save](https://artifacthealth.github.io/hydrate-mongodb/interfaces/session.html#save).

```typescript
var task = new Task("Take out the trash.");
session.save(task);
```

To find a task by identifier we use [find](https://artifacthealth.github.io/hydrate-mongodb/interfaces/session.html#find).

```typescript
session.find(Task, id, (err, task) => {
    ...
});
```

To find all tasks that have not yet been completed, we can use the 
[query](https://artifacthealth.github.io/hydrate-mongodb/interfaces/session.html#query) method.

```typescript
session.query(Task).findAll({ status: TaskStatus.Pending }, (err, tasks) => {
    ...
});
```

Below is an example of finding all tasks assigned to a specific person. Note that even though `person` is an instance
of the `Person` entity which is serialized as an `ObjectId` in the `task` collection, there is no need to pass the 
identifier of the `person` directly to the query.

```typescript

session.find(Person, personId, (err, person) => {
    ...
    
    session.query(Task).findAll({ assigned: person }, (err, tasks) => {
        ...
    });
});    
```

Hydrate provides a mechanism to retrieve references between persistent entities. We do this using 
[fetch](https://artifacthealth.github.io/hydrate-mongodb/interfaces/session.html#fetch). Note that 
[fetch](https://artifacthealth.github.io/hydrate-mongodb/interfaces/session.html#fetch)
uses the same [dot notation](https://docs.mongodb.org/manual/core/document/#dot-notation) that MongoDB uses 
for queries.

For example, say we wanted to fetch the `Person` that a `Task` is assigned to. 

```typescript
session.fetch(task, "assigned", (err) => {
        
    console.log(task.assigned.name); // prints the name of the Person
});
```

The [fetch](https://artifacthealth.github.io/hydrate-mongodb/interfaces/findonequery.html) method can be used in 
conjunction with queries as well.

```typescript
session.find(Task, id).fetch("assigned", (err, task) => {
    ...
});
```


### Promises and Observables

All queries can use a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) for the query result by calling [asPromise](https://artifacthealth.github.io/hydrate-mongodb/interfaces/findonequery.html#aspromise).

#### Example: Finding an entity by identifier

```typescript
session.find(Task, id).asPromise().then((task) => {
    ...
});
```

#### Example: Finding entities by criteria

```typescript
session.query(Task).findAll({ assigned: person }).asPromise().then((tasks) => {
    ...
});
```

Queries that return multiple entities may return an [Observable](http://reactivex.io/documentation/observable.html) for the query by calling [asObservable](https://artifacthealth.github.io/hydrate-mongodb/interfaces/findquery.html#asobservable).

```typescript
session.query(Task).findAll({ assigned: person }).asObservable().subscribe((task) => {
    ...
});
```

## Modeling

In TypeScript, the emitDecoratorMetadata and experimentalDecorators options must be enabled on the compiler.

* [`Entities`](#Entities)
* [`Collections`](#Collections)
* [`Fields`](#Fields)
* [`Identity`](#Identity)
* [`Embeddables`](#Embeddables)
* [`Types`](#Types)
* [`Inheritance`](#Inheritance)
* [`Mapped Superclass`](#MappedSuperclass)
* [`Discriminators`](#Discriminators)
* [`Fetching`](#Fetching)

<a name="Entities"></a>
### Entities

Entities are classes that map to a document in a MongoDB collection. 

```typescript
@Entity()
export class Person {

    @Field()
    name: string;
    
    constructor(name: string) {

        this.name = name;
    }
}
```

* The entity must be a class
* The entity must be decorated with the [Entity](https://artifacthealth.github.io/hydrate-mongodb/globals.html#entity) decorator
* The entity is **not** required to have a parameterless constructor, which is different than JPA and Hibernate. This 
allows for entities to enforce required parameters for construction. When an entity is deserialized from the database,
the constructor is not called. This means the internal state of an entity must fully represented by it's serialized
fields.
* An identifier is assigned to the entity when it is saved. 
* If the [Immutable](https://artifacthealth.github.io/hydrate-mongodb/globals.html#immutable) decorator is specified on an Entity, the entity is excluded from dirty checking.

<a name="Collections"></a>
### Collections

If a name for the collection is not given, an entity is mapped to a collection in MongoDB based on the name of the 
class. 
The [collectionNamingStrategy](https://artifacthealth.github.io/hydrate-mongodb/classes/configuration.html#collectionnamingstrategy) 
in the [Configuration](https://artifacthealth.github.io/hydrate-mongodb/classes/configuration.html) is used to determine 
the name of the collection. The default naming strategy is 
[CamelCase](https://artifacthealth.github.io/hydrate-mongodb/modules/namingstrategies.html#camelcase). Alternatively, 
a name for the collection can be specified using the 
[Collection](https://artifacthealth.github.io/hydrate-mongodb/globals.html#collection) decorator. 

```typescript
@Entity()
@Collection("people")
export class Person {

    @Field()
    name: string;
    
    constructor(name: string) {

        this.name = name;
    }
}
```

<a name="Fields"></a>
### Fields

Fields are mapped on an opt-in basis. *Only fields that are decorated are mapped.* The name for the field in the document
can optionally be specified using the [Field](https://artifacthealth.github.io/hydrate-mongodb/globals.html#field) decorator.

```typescript
@Entity()
export class User {

    @Field("u")
    username: string;
}
```
  
If the name for the field is not specified, the 
[fieldNamingStrategy](https://artifacthealth.github.io/hydrate-mongodb/classes/configuration.html#fieldnamingstrategy) 
on the [Configuration](https://artifacthealth.github.io/hydrate-mongodb/classes/configuration.html) is used to determine
the name of the field. The default naming strategy is [CamelCase](https://artifacthealth.github.io/hydrate-mongodb/modules/namingstrategies.html#camelcase).

<a name="Identity"></a>
### Identity
  
The [identityGenerator](https://artifacthealth.github.io/hydrate-mongodb/classes/configuration.html#identitygenerator) 
on the [Configuration](https://artifacthealth.github.io/hydrate-mongodb/classes/configuration.html) is used to generate 
an identifier for an entity. The default identity generator is the 
[ObjectIdGenerator](https://artifacthealth.github.io/hydrate-mongodb/classes/objectidgenerator.html). This is the only 
generator that ships with Hydrate. Composite identifiers are not supported. Natural identifiers are not supported.

By default the  identifier is not exposed as a public member on an entity. The identifier can be retrieved as a string 
using the [getIdentifier](https://artifacthealth.github.io/hydrate-mongodb/globals.html#getidentifier) function.

```typescript
import {getIdentifier} from "hydrate-mongodb";

...

session.query(Task).findAll({ status: TaskStatus.Pending }, (err, tasks) => {
    ...    
    var id = getIdentifier(tasks[0]);
    ...
});
```

Alternatively, the identifier can be exposed on an entity as a string using the 
[Id](https://artifacthealth.github.io/hydrate-mongodb/globals.html#id) decorator.
 
```typescript
@Entity()
export class User {

    @Id()
    id: string;
    
    @Field()
    username: string;
}
```
  
  
<a name="Embeddables"></a>
### Embeddables
  
Embeddables are classes that map to nested subdocuments within entities, arrays, or other embeddables.
   
```typescript
@Embeddable()
export class HumanName {
 
    @Field()
    last: string;
    
    @Field()
    first: string;
    
    @Field()
    name: string;
    
    constructor(last: string, first?: string) {

        this.last = last;
        this.first = first;
        
        this.name = last;
        if(first) {
            this.name += ", " + first;
        }
    }
}

@Entity()
export class Person {

    @Field()
    name: HumanName;
    
    constructor(name: HumanName) {

        this.name = name;
    }
}
```  

* The embeddable must be a class
* The embeddable must be decorated with the [Embeddable](https://artifacthealth.github.io/hydrate-mongodb/globals.html#embeddable) decorator
* Like an entity, an embeddable is **not** required to have a parameterless constructor. When an embeddable is 
deserialized from the database, the constructor is not called. This means the internal state of an embeddable must fully 
represented by it's serialized fields.
* If the [Immutable](https://artifacthealth.github.io/hydrate-mongodb/globals.html#immutable) decorator is specified on an Embeddable class, the original document for the Embeddable is cached and used for serialization.

<a name="Types"></a>
### Types

When using TypeScript, the type of a field is automatically provided. The following types are supported:

* Number
* String
* Boolean
* Date
* RegExp
* Buffer
* Array
* Enum
* Embeddables
* Entities


**Type Decorator**

When a property is an embeddable or a reference to an entity, sometimes the type of the property cannot be determined 
because of circular references of `import` statements. In this case the 
[Type](https://artifacthealth.github.io/hydrate-mongodb/globals.html#type) decorator should be used with the name 
of the type.

```typescript
@Entity()
export class Person {

    @Type("HumanName")
    name: HumanName;
    
    constructor(name: HumanName) {

        this.name = name;
    }
}
```  


**Arrays**

TypeScript does not provide the type of an array element, so the type of the array element must be indicate with the 
[ElementType](https://artifacthealth.github.io/hydrate-mongodb/globals.html#elementtype) decorator.

```typescript
@Entity()
export class Organization {

    @ElementType(Address)
    addresses: Address[];
}
```  

This is true for primitive types as well.

```typescript
@Entity()
export class Person {

    @ElementType(String)
    aliases: string[];
}
```  


**Enums**

By default enums are serialized as numbers. Use the 
[Enumerated](https://artifacthealth.github.io/hydrate-mongodb/globals.html#enumerated) decorator to serialize enums as strings.

```typescript
export enum TaskStatus {

    Pending,
    Completed,
    Archived
}

@Entity()
export class Task {

    @Field()
    text: string;

    @Enumerated(TaskStatus)
    status: TaskStatus;
}
```


<a name="Inheritance"></a>
### Inheritance

Standard prototypical inheritance is supported for both entities and embeddables.

```typescript
@Entity()
class Party {
    ...
}

@Entity()
class Person extends Party {
    ...
}

@Entity()
class Organization extends Party {
    ...
}
```

All entities within an inheritance hierarchy are stored in the same collection. If the 
[Collection](https://artifacthealth.github.io/hydrate-mongodb/globals.html#collection) decorator is used,
it is only valid on the root of an inheritance hierarchy.


<a name="MappedSuperclass"></a>
#### Mapped Superclass

Entities stored in separate collections may share a common superclass that is not mapped to a collection. In the example,
below `Patient` (stored in `patient` collection) and `Document` (stored in `document` collection) share a common 
superclass `Asset` that defines the field `owner`.

```typescript
class Asset {

    @Field()
    owner: Organization;

    constructor(owner: Organization) {
        this.owner = owner;
    }
}

@Entity()
class Patient extends Asset {
    ...
}

@Entity()
class Document extends Asset {
    ...
}
```

If `Asset` was decorated with [Entity](https://artifacthealth.github.io/hydrate-mongodb/globals.html#entity) then `Patient`
and `Document` would instead both be stored in a collection called `asset`.

<a name="Discriminators"></a>
#### Discriminators

If an inheritance hierarchy is defined, a discriminator field is added to the serialized document to indicate the type
when deserializing the entity or embeddable. By default, the 
[discriminatorField](https://artifacthealth.github.io/hydrate-mongodb/classes/configuration.html#discriminatorfield) 
on the [Configuration](https://artifacthealth.github.io/hydrate-mongodb/classes/configuration.html) is used
to determine the name of the field to store the discriminator. Optionally, the discriminator field can be specified
on the root of an inheritance hierarchy using the 
[DiscriminatorField](https://artifacthealth.github.io/hydrate-mongodb/globals.html#discriminatorfield) decorator.

```typescript
@Entity()
@DiscriminatorField("type")
class Party {
    ...
}
```

The class discriminator can be specified using the 
[DiscriminatorValue](https://artifacthealth.github.io/hydrate-mongodb/globals.html#discriminatorvalue) decorator.

```typescript
@Entity()
@DiscriminatorValue("P")
class Person extends Party {
    ...
}

@Entity()
@DiscriminatorValue("O")
class Organization extends Party {
    ...
}
```

If the discriminator value is not explicitly specified for a class, it is determined using the 
[discriminatorNamingStrategy](https://artifacthealth.github.io/hydrate-mongodb/classes/configuration.html#discriminatornamingstrategy) on the 
[Configuration](https://artifacthealth.github.io/hydrate-mongodb/classes/configuration.html).
By default, the name of the class is used. 

<a name="Fetching"></a>
### Fetching

#### Eager Fetching of Entity References

By default entity references are not loaded and must be fetched using Session#fetch or similar. If a FetchType of Eager is specified on
an entity reference then that reference is automatically fetched when the entity is loaded.

* This works on entity reference in Embeddable objects as well.
* It is generally preferable to fetch references as needed.
* A FetchType of Eager on a property that is not an entity reference has no effect.

```typescript
 @Entity()
 export class Task {

     @Fetch(FetchType.Eager)
     owner: Person;
 }
```


#### Lazy Fetching of Properties

When an entity is loaded, all fields for that entity are retrieved from the database. Specifying a FetchType of Lazy for a field causes
that field to not be retrieved from the database when the entity is loaded. The field is only loaded by calling Session#fetch and
indicating which field to load.

* Useful for properties that contain large amounts of data, such as images, that are not always needed.
* A FetchType of Lazy on a property in an Embeddable objects is ignored. All properties in an embeddable object are always loaded from the database.
* It is generally not advisable to use a FetchType of Lazy on a property that is an entity reference.

```typescript
 @Entity()
 export class Person {

     @Fetch(FetchType.Lazy)
     image: Buffer;
 }
```

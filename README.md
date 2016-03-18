# Hydrate
**An Object/Document Mapping (ODM) framework for Node.js and MongodDB**

Hydrate provides a means for developers to map classes in Node.js, that contain business logic, to documents stored in a MongoDB 
database. Developers can work normally with objects and classes, and Hydrate takes care of the onerous details such as 
serializing classes to documents, validation, mapping of class inheritance, optimistic locking, fetching of references 
between database collections, change tracking, and managing of persistence through bulk operations. Hydrate is built on
top of the [native MongoDB driver](https://github.com/mongodb/node-mongodb-native).  

#### Idiomatic Javascript
Hydrate has no requirements for how persistent classes are declared. Developers can work with 
standard JavasScript idioms, such as constructor functions and ES6 classes. Furthermore, no 
base class is required for creating persistent classes. 

#### TypeScript support
[TypeScript](http://www.typescriptlang.org/) is a superset of JavaScript that includes type information and compiles 
to regular JavaScript. If you choose to use TypeScript in your projects, this type information can be used by
Hydrate to create the mappings between your classes and the MongoDB documents, reducing duplicate
work. However, TypeScript is not required and you can use Hydrate with plain JavaScript. 

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

#### Extensibility
Hydrate provides numerous opportunities for extensibility.

## Installation

Hydrate requires a minimum of [MongoDB 2.6](https://www.mongodb.org/downloads#production) and [Node 4.0](https://nodejs.org/). 
Once these dependencies are installed, Hydrate can be installed using [npm](https://www.npmjs.com/):
 
 
```sh
$ npm install hydrate-mongodb --save
```

## Defining a Model
This example is adapted from the Mongoose [quick start guide](http://mongoosejs.com/docs/) and helps illustrate some of 
the differences between Mongoose and Hydrate. **For brevity, the example here is only given in TypeScript but please refer 
[examples]() for a full example in plain JavaScript.**

```typescript
import {Entity, Field} from "hydrate-mongodb";

@Entity()
export class Kitten {

    @Field()
    name: string;

    constructor(name: string) {
        this.name = name;
    }

    speak(): void {        
        console.log(this.name ? "Meow name is " + this.name : "I don't have a name");
    }       
}
```

## Configuring Hydrate
Once our model is defined, we need to tell Hydrate about it. We do this by adding the model to a mapping provider, then
adding the mapping provider to the Hydrate configuration.

```typescript
import {MongoClient} from "mongodb";
import {Configuration, AnnotationMappingProvider} from "hydrate-mongodb";

var config = new Configuration();
config.addMapping(new AnnotationMappingProvider(Kitten));
```


## Connecting to MongoDB
We use the standard MongoDB native driver to establish a connection to MongoDB. Once the connection is open, we create
a SessionFactory using the MongoDB connection and the previously defined Hydrate configuration. Typically the 
SessionFactory is created once at server startup and then used to create Sessions for each connection to the server.

```typescript
// server.ts (con't)

MongoClient.connect('mongodb://localhost/mydatabase', (err, db) => {
    if(err) throw err;
    
    config.createSessionFactory(db, (err, sessionFactory) => {        
        ...
    });
});
```

## Working with Persistent Objects
In order to create a new kitten and save it to the database. We create

```typescript
var session = sessionFactory.createSession();
 
var fluffy = new Kitten("Fluffy");
session.save(fluffy);
session.flush(); 
```

If at some point in the future we want to find kittens by name, we can query the database as follows:
```typescript
session.query(Kitten).find({ name: /^Fluff/ }, (err, kittens) => {
    ...
});
```
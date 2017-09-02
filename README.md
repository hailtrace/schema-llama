# Schema-JS

## Preamble
We have not written this project yet. It's currently in its conception and is going down the experimental development mode. Star the repo and see when we get it done.

Thanks!

## Introduction

This project is spawned out of a desire for pure javascript libraries that save time in long term projects. The basic concept behind this library is to take a "logically described schema" and transform it into an es6 class you can play with like any other es6 class you love. `Love ES6 More!`

So...take my schema:
```javascript
const llamaSchema = {
  name: String,
  dob: Date,
  age: Number
}
```

And use powerful llama powers to create this class with baked-in validation:
```javascript
class Llama {
  name: String;
  dob: Date;
  age: Number;
  constructor({ name, dob, age }) {
    this.name = name;
    this.dob = dob;
    this.age = age;
  }
  set name(value) {
    if(value.constructor !== String) {
      throw TypeError('Invalid name provided.');
    }
    this.name = value;
  }
  set dob(value) {
    if(value.constructor !== String || value.constructor !== Date) {
      throw TypeError('You must provide a valid date value.');
    }
    if(value.constructor === String) { value = new Date(value); }

    return value;
  }
  set age(value) {
    if(value.constructor !== String || value.constructor !== Number) {
      throw TypeError('You must provide a valid number');
    }
    if(value.constructor === String) { value = new Number(value); }
    return value;
  }
}
```
---
## Rational

#### WHY DO THIS!?
Good question. Because we can. No, just kidding: because I had a difficult time finding a library that treats schemas like classes. Commonly other libraries manage their schema methods and statics like this:

```javascript
const Llama = new Schema({
  name: String,
  dob: Date,
  age: Number
})

Llama.methods.eatGrass = function () {
  /**Implement eating grass?**/
}
Llama.statics.birthLlama() = function () {
  /** Implement static method to create a new lama. **/
}
```

This is OK, I guess; but I want the clean feeling of ES6 classes with my method declarations:

```javascript

class Llama extends Schema({
  name: String,
  dob: Date,
  age: Number
})(/** we can pass in other settings here.**/) {
  eatGrass() {
    return `Llama ${this.name} ate some grass.`;
  }
  static birthLlama(name) {
    return new Lama({
      name,
      dob: Date.now(),
      age: 0
    });
  }
}

```


Essentially, the backbone of this project is a single factory function. The implementation of this class creator (Class Factory) function is as follows (Simplified):

```javascript
export const convertSchemaToClass = schema => {
  return (ParentClass) => {
    if(ParentClass && ParentClass.constructor !== Function) { throw TypeError('You can only schemify classes.'); }

    const primitives = [ String, Date, Number, Symbol ];
    const classer = ParentClass ? (
      class extends ParentClass { constructor(props) { super(props); } }      
    ) : (
      class { constructor(props) { super(props); } }
    );

    const keys = Object.keys(schema);
    /** Do some magic to turn schema into class accessor methods. **/
    for(const key of keys) {
      const keySymbol = Symbol(key);
      Object.defineProperty(classer.prototype, key, {
        enumerable: true,
        configurable: false,
        set: function(value) {
          const Primitive = primitives.find(Primitive => schema[key] === Primitive);
          if(Primitive) {
            value = new Primitive(value);
          }
          if(!(value.constructor === schema[key])) {
            throw new TypeError(`You cannot set ${key} value to type ${value.constructor.name}. Use ${schema[key].name}`);
          }
          this[keySymbol] = value;
        },
        get: function() { return this[keySymbol] }
      });
    }

    return classer;
  }
}
```

## Usage
You don't really need to know how it works for you to use it:

#### Simple Example
```javascript
import Schema from 'schema-js';

const Llama = Schema({
  name: String,
  dob: Date,
  age: Number
})();

class FunnyLlama extends Llama { //Class that becomes a subclass of llama schema.
  constructor(props) {
    super(props); //Do annoying magic.
  }
  getNextAge() {
    return this.age + 1;
  }
}
```

#### Embedded Schemas Example

```javascript
import Schema from 'schema-js';

class Llama extends Schema({
  name: String,
  dob: Date,
  age: Number,
  panchos: [ { price: Number } ]
})() {
  constructor(props) {
    super(props);
  }
  sumPanchos() {
    return panchos.reduce((a, b) => a.price + b.price, 0);
  }
}

```
#### Embedded ES6 Class Example:
This is really where the rubber hits the road with this idea. This schema would intuitively allow you to pass class definitions as "Types" for your property definitions.

Let's say that we want to handle pancho operations instead of having them act like pure objects?

```javascript
class Pancho extends Schema({
  price: Number
})() {
  constructor(props) {
    super(props);
  }
  getPriceWithTax(tax) {
    return this.price * tax + 0.13;
  }
}

//NOTE: You do not have to use Schema! You can just as easily use a pure JS class.

class Llama extends Schema({
  name: String,
  dob: Date,
  age: Number,
  panchos: [ Pancho ],
  email: EmailAddress({ minLength: 10, maxLength: 100, allowedServers: ['gmail' ] })
})() {
  constructor(props) {
    super(props);
  }
  sumPanchos(withTax = false) {
    if(withTax) {
      return panchos.reduce((a,b) => a + b.getPriceWithTax(), 0);
    }
    return panchos.reduce((a, b) => a + b.price, 0);
  }
}
```

#### Embedded Validator Example:

So, let's say I want to create a String validator called EmailAddress?

```javascript
import Schema from 'schema-js';

const SimpleEmailAddress = function(value) {
  //Throw an error if the email address is invalid.
  return String(value);
}

//We can even be smart and do settings with a factory
const EmailAddress = ({ minLength, maxLength, allowedServers}) => {
  return function(value) {
    //Do validation logic...
    return new String(value)
  }
}

class Llama extends Schema({
  name: String,
  dob: Date,
  age: Number,
  panchos: [ { price: Number } ],
  email: EmailAddress({ minLength: 10, maxLength: 100, allowedServers: ['gmail' ] })
})() {
  constructor(props) {
    super(props);
  }
  sumPanchos() {
    return panchos.reduce((a, b) => a.price + b.price, 0);
  }
}


```

## Validator Helper Library

```javascript
import Schema, { Validators } from 'schema-js';
```
1. `Enum([ String ])`
2. `Number(settings: { min: Number, max: Number, type: ['int', 'double'] })`
3. `String(settings: { min: Number, max: Number, match: RegExp })`

## Custom Error Handling
Before using the schema code anywhere, use this to override the error classes.
```javascript
import Schema from 'schema-js';

//Override Schema ErrorHandling
Schema.Error = MyErrorClass;
Schema.TypeError = MyTypeErrorClass;
Schema.ValidationError = MyValidationErrorClass;
```

## Get/Set Hooks
This is probably most useful to me, but I could see it being useful for some architectures.

For example, we may want to store a vanilla JS Date in the entity, but would like to have a Moment object when we access the data.

```javascript
class Llama extends Schema({
  name: String,
  dob: Date,
  age: Number,
})({
  get: (value, TypeClass, key) => {
    if(TypeClass === Date) {
      return moment(value);
    }
  },
  set: (value, TypeClass, key) => {
    if(TypeClass === Date) {
      return value.toDate()
    }
  }
}) {
  constructor(props) {
    super(props);
  }
}

const llamaface = new Llama();
llamaface.name = 'JerryLlama';
llamaface.dob = moment('Jan 1, 2017', 'MMM D, YYYY'); //Stores pure JS date.
llamaface.age = 10;

```

## Hook Library

TBD: We could potentially build out library that helps build get/set hooks.

For a (rough, very rough and incomplete) Example:
```javascript
import Schema, { Hooks } from 'schema-js';

const ReduxStore = /** do setup logic ***/;

const { reduxHookFactory } = Hooks;

const reduxHook = reduxHookFactory(ReduxStore);

class Llama extends Schema({
  name: String,
  dob: Date,
  age: Number,
})(reduxHook) {
  constructor(props) {
    super(props);
  }
}

const llamaface = new Llama();
llamaface.name = 'JerryLlama';
llamaface.dob = moment('Jan 1, 2017', 'MMM D, YYYY'); //Stores pure JS date.
llamaface.age = 10;

```

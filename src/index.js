import { TypeError, ValidationError, Error } from './errors';

const constructorHelper = function(props, ...args) {
  if(!props || props.constructor !== Object) { return; }
  const propKeys = Object.keys(props);
  for(const key of propKeys) {
    this[key] = props[key];
  }
}

const validateOptions = (options) => {
  const keys = Object.keys(options);
  for(const key of keys) {
    switch(key) {
      case 'attemptCast': {
        if(options[key].constructor !== Boolean) {
          throw new TypeError(`attemptCast option must be a Boolean.`);
        }
        break;
      }
      case 'strict': {
        if(options[key].constructor !== Boolean) {
          throw new TypeError(`strict option must be a Boolean`);
        }
        break;
      }
      case 'get': {
        if(!options[key] || options[key].constructor !== Function) {
          throw new TypeError(`get() hook must be a function.`);
        }
        break;
      }
      case 'set': {
        if(!options[key] || options[key].constructor !== Function) {
          throw new TypeError(`set() hook must be a function.`);
        }
        break;
      }
      default: {
        throw new TypeError(`Option key <${key}> is not a valid option.`);
        break;
      }
    }
  }
}

function primitiveHelper(value, schemaItem, options, key) {
  const primitives = [ Boolean, String, Date, Number, Symbol ];
  const Primitive = primitives.find(primitive => schemaItem === primitive);
  switch(schemaItem.constructor) {
    case Function: {
      if(!options.attemptCast && schemaItem !== value.constructor) {
        throw TypeError(`ERROR You cannot set ${key} value type ${value.constructor.name}. Use ${schemaItem.name} instead.`);
      }
      if(!Primitive && value.constructor !== schemaItem) {
        throw TypeError(`You cannot set ${key} value type ${value.constructor.name}. Use ${schemaItem.name} instead.`);
      }
      if(Primitive) {
        value = Primitive(value);
      }
      break;
    }
    case Array: {
      if(value.constructor !== Array) {
        throw new TypeError(`You cannot set ${key} to value type ${value.constructor.name}. Use ${schemaItem.constructor.name} instead.`);
      }
      value = value.map(item => primitiveHelper(item, schemaItem[0], options, key));
      break;
    }
    case Object: {
      if(!options.attemptCast) {
        return value;
      }
      value = new (classFactory(schemaItem)(options))(value);
      break;
    }
    default: {
      throw TypeError(`Unknown schemaItem constructor: ${schemaItem.constructor}`);
    }
  }

  return value;
}

function arrayConstructorHelper(value, schemaItem, options, key) {
  if(value.constructor !== Array) {
    throw TypeError(`You cannot set ${key} value type ${value.constructor.name}. Use an Array instead.`);
  }
  if(schemaItem.constructor === Function) { return primitiveHelper(value, schemaItem, options, key) };
  const [ SchemaClass ] = schemaItem;
  /** Only deal with pure schemas here; deal with embedded schemas later. **/

  switch(SchemaClass.constructor) {
    case Function: {
      return primitiveHelper(value, SchemaClass, options, key);
    }
    case Object: {
      return value.map(item => new classFactory(SchemaClass)(options)(item));
      break;
    }
    case Array: {
      return value.map(item => arrayConstructorHelper(item, SchemaClass[0], options, key));
    }
  }

  for(const item of value) {
    if(item.constructor !== SchemaClass) {
      throw TypeError(`Each element of ${key} must match the type ${SchemaClass.name}. You used ${item.constructor.name}`);
    }
  }
}


const classFactory = function(schema) {
  const keys = Object.keys(schema);

  return (...args) => {
    const [ options, ParentClass ] = args.length > 2? (() => {
      throw Error('Invalid argument length for Schema(options)([options][,ParentClass])');
    })() : [args[0] || {}, args[1] || undefined];
    if(options && typeof options !== 'object') throw TypeError('You must provivide a valid options object.');
    if(options) validateOptions(options);
    if(ParentClass && ParentClass.constructor !== Function) throw new TypeError('The ParentClass you provide must be a class.');

    const Class = ParentClass ? (
      class extends ParentClass {
        constructor(...args) {
          super(...args);
          constructorHelper.call(this, ...args);
        }
      }
    ) : (
      class {
        constructor(...args) {
          constructorHelper.call(this, ...args);
        }
      }
    );

    for(const key of keys) {
      const keySymbol = Symbol(key);
      Object.defineProperty(
        Class.prototype,
        key,
        {
          enumerable: true,
          configurable: false,
          set: function(value) {

            value = primitiveHelper(value, schema[key], options, key);
            if(options.set) {
              value = options.set(value, schema[key], key);
            }
            this[keySymbol] = value;
          },
          get: function() {
            if(options.get) {
              return options.get(this[keySymbol], schema[key], key);
            }
            return this[keySymbol]
          }
        }
      );
    }

    return Class;
  }
}

/***TODO: Do some logic on classFactory so that we can set custom errors. ***/

export default classFactory;

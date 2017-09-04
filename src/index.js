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

const error = (value, schemaItem, key) => TypeError(`You cannot set ${key}<${schemaItem.name}> to ${value.constructor.name}. Use ${schemaItem.name} instead.`)

function primitiveHelper(value, schemaItem, options, key, schema) {
  const primitives = [ Boolean, String, Date, Number, Symbol ];
  const Primitive = primitives.find(primitive => schemaItem === primitive);
  const schemaItemIsPrimative = Primitive ? true: false;
  const valueIsPrimative = primitives.find(primitive => value.constructor === primitive) ? true : false;

  try {
    switch(schemaItem.constructor) {
      case Function: {
        if(!options.attemptCast && schemaItem !== value.constructor) {
          throw error(value, schemaItem, key);
        }
        if(options.attemptCast && !valueIsPrimative && !schemaItemIsPrimative && value.constructor !== schemaItem) {
          const NonPrimative = schemaItem;
          value = new NonPrimative(value);
        }
        if(!Primitive && !schemaItem.prototype && value.constructor !== schemaItem) {
          value = schemaItem(value);
        }
        if(!Primitive && schemaItem.prototype && value.constructor !== schemaItem) {
          throw error(value, schemaItem, key);
        }
        if(valueIsPrimative && schemaItemIsPrimative && value.constructor !== Primitive) {
          value = Primitive(value);
        }
        break;
      }
      case Array: {
        if(value.constructor !== Array) {
          throw error(value, schemaItem, key);
        }
        value = value.map(item => primitiveHelper(item, schemaItem[0], options, key));
        break;
      }
      case Object: {
        if(!options.attemptCast && value.constructor !== Object) {
          throw error(value, schemaItem, key);
        }
        value = new (classFactory(schemaItem)(options))(value);
        break;
      }
      default: {
        throw error(value, schemaItem, key);
      }
    }

    return value;
  } catch( ex ) {
    ex.message = `${key ? `${key}<${schemaItem ? schemaItem.name ? schemaItem.name : schemaItem.constructor ? schemaItem.constructor.name : '' : ''}>` : ''}:::${ex.message}`;
    throw ex;
  }
}

function arrayConstructorHelper(value, schemaItem, options, key, schema) {
  if(value.constructor !== Array) {
    throw TypeError(`You cannot set ${key} value type ${value.constructor.name}. Use an Array instead.`);
  }
  if(schemaItem.constructor === Function) { return primitiveHelper(value, schemaItem, options, key, schema) };
  const [ SchemaClass ] = schemaItem;
  /** Only deal with pure schemas here; deal with embedded schemas later. **/

  switch(SchemaClass.constructor) {
    case Function: {
      return primitiveHelper(value, SchemaClass, options, key, schema);
    }
    case Object: {
      return value.map(item => new classFactory(SchemaClass)(options)(item));
      break;
    }
    case Array: {
      return value.map(item => arrayConstructorHelper(item, SchemaClass[0], options, key, schema));
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

            value = primitiveHelper(value, schema[key], options, key, schema);
            if(options.set) {
              value = options.set(value, schema[key], key, schema);
            }
            this[keySymbol] = value;
          },
          get: function() {
            if(options.get) {
              return options.get(this[keySymbol], schema[key], key, schema);
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

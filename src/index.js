import { TypeError, ValidationError, Error } from './errors';

const toJSONHelper = item => {
  if(item instanceof Array) {
    return item.map(toJSONHelper);
  }
  if(item && typeof item === 'object' && item.toJSON) {
    return item.toJSON();
  }
  return item;
}

const constructorHelper = function(props, ...args) {
  if(!props || typeof props != 'object') { return; }
  const propKeys = Object.keys(props);
  for(const key of propKeys) {
    this[key] = props[key];
  }

  //TODO: implement check for required fields.

  const toJSON = (function () {
    const object = {};
    for(const key of propKeys) {

      if(this[key] == null) {
        object[key] = null;
        continue;
      }

      if(this[key] == undefined) {
        continue;
      }

      if(this[key].toJSON === Function) {
        object[key] = this[key].toJSON();
      } else if(this[key] && this[key].constructor === Array) {
        object[key] = this[key].map(toJSONHelper);
      }
      else {
        object[key] = this[key];
      }
    }
    return object;
  }).bind(this);

  Object.defineProperty(this, 'valueOf', {
    enumerable: false,
    configurable: true,
    value: toJSON
  });

  Object.defineProperty(this, 'toJSON', {
    enumerable: false,
    configurable: true,
    value: toJSON
  });
}

const validateOptions = (options) => {
  const keys = Object.keys(options);
  for(const key of keys) {
    switch(key) {
      case 'required': {
        if(options[key].constructor !== Array) {
          throw new TypeError(`Required field list must be an array of strings or numbers.`);
        }
        break;
      }
      case 'attemptCast': {
        if(options[key].constructor !== Boolean) {
          throw new TypeError(`attemptCast option must be a Boolean.`);
        }
        break;
      }
      case 'mapNullToEmptyArray': {
        if(options[key].constructor !== Boolean) {
          throw new TypeError(`mapNullToEmptyArray option must be a Boolean.`);
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
  // HANDLE NULL VALUE
  if(value == null) {
    if(options.required && options.required.find(requiredKey => requiredKey == key)) {
      throw new TypeError(`If you set ${key}, it cannot be null or undefined. value = ${value}`);
    }
    if(schemaItem instanceof Array && options.mapNullToEmptyArray) {
      return [];
    }
    if(schemaItem.is_schema_llama_validator) {
      return schemaItem(value, key);
    }

    return value;
  }

  const primitives = [ Boolean, String, Date, Number, Symbol ];
  const Primitive = primitives.find(primitive => schemaItem === primitive);
  const schemaItemIsPrimative = Primitive ? true: false;
  const valueIsPrimative = primitives.find(primitive => value.constructor === primitive) ? true : false;
  const schemaItemIsValidator = schemaItem.is_schema_llama_validator;

  try {
    // distinguish between class and validation function``
    switch(schemaItem.constructor) {
      case Function: {
        // DEAL WITH VALIDATION
        if(schemaItemIsValidator) {
          value = schemaItem(value, key);
        }
        else if(!options.attemptCast && schemaItem !== value.constructor) {
          throw error(value, schemaItem, key);
        }
        // DEAL WITH INSTANCES
        else if(options.attemptCast && !schemaItemIsValidator && !schemaItemIsPrimative && value.constructor !== schemaItem) {
          const NonPrimative = schemaItem;
          value = new NonPrimative(value);
        }
        else if(!Primitive && schemaItem.prototype && value.constructor !== schemaItem) {
          throw error(value, schemaItem, key);
        }
        else if(valueIsPrimative && schemaItemIsPrimative && value.constructor !== Primitive) {
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
        if(value.constructor.name == '__SLC__') {
          break;
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

function validator(userValidatorFunction) {
  userValidatorFunction.is_schema_llama_validator = true;
  return userValidatorFunction;
}

const classFactory = function(schema) {
  const keys = Object.keys(schema);

  return (...args) => {
    const [ options, ParentClass ] = args.length > 2 ? (() => {
      throw Error('Invalid argument length for Schema(options)([options][,ParentClass])');
    })() : [args[0] || {}, args[1] || undefined];
    if(options && typeof options !== 'object') throw TypeError('You must provivide a valid options object.');
    if(options) validateOptions(options);
    if(ParentClass && ParentClass.constructor !== Function) throw new TypeError('The ParentClass you provide must be a class.');

    const Class = ParentClass ? (
      class __SLC__ extends ParentClass {
        constructor(...args) {
          super(...args);
          constructorHelper.call(this, ...args);
        }
      }
    ) : (
      class __SLC__ {
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

export { validator };
export default classFactory;

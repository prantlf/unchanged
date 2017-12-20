// external dependencies
import {parse} from 'pathington';

/**
 * @constant {Object} REACT_ELEMENT_TYPE
 */
const REACT_ELEMENT_TYPE = typeof Symbol === 'function' && Symbol.for ? Symbol.for('react.element') : 0xeac7;

/**
 * @constant {RegExp} NATIVE_FUNCTION_REGEXP
 */
const NATIVE_FUNCTION_REGEXP = new RegExp(
  `^${Function.prototype.toString
    .call(Function)
    .replace(/([.*+?^=!:$(){}|[\]\/\\])/g, '\\$1')
    .replace(/Function|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?')}$`
);

/**
 * @function isArray
 */
export const isArray = Array.isArray;

/**
 * @function curry
 *
 * @description
 * simple curry application method
 *
 * @param {function} fn the function to curry
 * @returns {function(...Array<*>): *} the curried version of fn
 */
export const curry = (fn) => {
  return function curried(...args) {
    return args.length >= fn.length
      ? fn(...args)
      : (...remainingArgs) => {
        return curried(...args, ...remainingArgs);
      };
  };
};

/**
 * @function isCloneable
 *
 * @description
 * can the object be merged
 *
 * @param {*} object the object to test
 * @returns {boolean} can the object be merged
 */
export const isCloneable = (object) => {
  return (
    !!object &&
    typeof object === 'object' &&
    !(object instanceof Date || object instanceof RegExp) &&
    object.$$typeof !== REACT_ELEMENT_TYPE
  );
};

/**
 * @function getShallowClone
 *
 * @description
 * get a shallow clone of the value passed based on the type requested (maintaining prototype if possible)
 *
 * @param {Array<*>|Object} object the object to clone
 * @param {number|string} key the key to base the object type fromisReactElement(object) ||
 * @returns {Array<*>|Object} a shallow clone of the value
 */
export const getShallowClone = (object) => {
  if (isArray(object)) {
    return [...object];
  }

  if (object.constructor === Object) {
    return {...object};
  }

  return object.constructor && NATIVE_FUNCTION_REGEXP.test(`${object.constructor}`)
    ? {}
    : Object.keys(object).reduce((clone, key) => {
      clone[key] = object[key];

      return clone;
    }, Object.create(Object.getPrototypeOf(object)));
};

/**
 * @function getNewEmptyChild
 *
 * @description
 * get a new empty child for the type of key provided
 *
 * @param {number|string} key the key to test
 * @returns {Array|Object} the empty child
 */
export const getNewEmptyChild = (key) => {
  return typeof key === 'number' ? [] : {};
};

/**
 * @function getNewEmptyObject
 *
 * @description
 * get a new empty object for the type of key provided
 *
 * @param {Array|Object} object the object to get an empty value of
 * @returns {Array|Object} the empty object
 */
export const getNewEmptyObject = (object) => {
  return isArray(object) ? [] : {};
};

/**
 * @function cloneIfPossible
 *
 * @description
 * clone the object passed if it is mergeable, else return itself
 *
 * @param {*} object he object to clone
 * @returns {*} the cloned object
 */
export const cloneIfPossible = (object) => {
  return isCloneable(object) ? getShallowClone(object) : object;
};

/**
 * @function getNewChildClone
 *
 * @description
 * get the shallow clone of the child when it is the correct type
 *
 * @param {Array<*>|Object} object the object to clone
 * @param {number|string} nextKey the key that the next object will be based from
 * @returns {Array<*>|Object} the clone of the key at object
 */
export const getNewChildClone = (object, nextKey) => {
  const emptyChild = getNewEmptyChild(nextKey);

  if (!isCloneable(object)) {
    return emptyChild;
  }

  return isArray(object) === isArray(emptyChild) ? cloneIfPossible(object) : emptyChild;
};

/**
 * @function onMatchAtPath
 *
 * @description
 * when there is a match for the path requested, call onMatch, else return the noMatchValue
 *
 * @param {Array<number|string>} path the path to find a match at
 * @param {Array<*>|Object} object the object to find the path in
 * @param {function} onMatch when a match is found, call this method
 * @param {boolean} shouldClone should the object be cloned
 * @param {*} noMatchValue when no match is found, return this value
 * @param {number} [index=0] the index of the key to process
 * @returns {*} either the return from onMatch or the noMatchValue
 */
export const onMatchAtPath = (path, object, onMatch, shouldClone, noMatchValue, index = 0) => {
  const key = path[index];
  const nextIndex = index + 1;

  if (nextIndex === path.length) {
    const result = object || shouldClone ? onMatch(object, key) : noMatchValue;

    return shouldClone ? object : result;
  }

  if (shouldClone) {
    object[key] = onMatchAtPath(
      path,
      getNewChildClone(object[key], path[nextIndex]),
      onMatch,
      shouldClone,
      noMatchValue,
      nextIndex
    );

    return object;
  }

  return object && object[key]
    ? onMatchAtPath(path, object[key], onMatch, shouldClone, noMatchValue, nextIndex)
    : noMatchValue;
};

/**
 * @function getDeeplyMergedObject
 *
 * @description
 * get the objects merged into a new object
 *
 * @param {Array<*>|Object} object1 the object to merge into
 * @param {Array<*>|Object} object2 the object to merge
 * @returns {Array<*>|Object} the merged object
 */
export const getDeeplyMergedObject = (object1, object2) => {
  const isObject1Array = isArray(object1);

  if (isObject1Array !== isArray(object2)) {
    return cloneIfPossible(object2);
  }

  if (isObject1Array) {
    return [...object1, ...object2.map(cloneIfPossible)];
  }

  return Object.keys(object2).reduce(
    (clone, key) => {
      clone[key] = isCloneable(object2[key]) ? getDeeplyMergedObject(object1[key], object2[key]) : object2[key];

      return clone;
    },
    Object.keys(object1).reduce((clone, key) => {
      clone[key] = cloneIfPossible(object1[key]);

      return clone;
    }, {})
  );
};

/**
 * @function getParsedPath
 *
 * @description
 * get the path array, either as-is if already an array, or parsed by pathington
 *
 * @param {Array<number|string>|number|string} path the path to parse
 * @returns {Array<number|string>} the parsed path
 */
export const getParsedPath = (path) => {
  return isArray(path) ? path : parse(path);
};

/**
 * @function getNestedProperty
 *
 * @description
 * parse the path passed and get the nested property at that path
 *
 * @param {Array<number|string>|number|string} path the path to retrieve values from the object
 * @param {*} object the object to get values from
 * @returns {*} the retrieved values
 */
export const getNestedProperty = (path, object) => {
  const parsedPath = getParsedPath(path);

  if (parsedPath.length === 1) {
    return object ? object[parsedPath[0]] : undefined;
  }

  return onMatchAtPath(parsedPath, object, (ref, key) => {
    return ref[key];
  });
};

/**
 * @function getDeepClone
 *
 * @description
 * parse the path passed and clone the object at that path
 *
 * @param {Array<number|string>|number|string} path the path to deeply modify the object on
 * @param {Array<*>|Object} object the objeisCurrentKeyArrayct to modify
 * @param {function} onMatch the callback to execute
 * @returns {Array<*>|Object} the clone object
 */
export const getDeepClone = (path, object, onMatch) => {
  const parsedPath = getParsedPath(path);
  const topLevelClone = isCloneable(object) ? getShallowClone(object) : getNewEmptyChild(parsedPath[0]);

  if (parsedPath.length === 1) {
    onMatch(topLevelClone, parsedPath[0]);

    return topLevelClone;
  }

  return onMatchAtPath(parsedPath, topLevelClone, onMatch, true);
};

/**
 * @function hasNestedProperty
 *
 * @description
 * parse the path passed and determine if a value at the path exists
 *
 * @param {Array<number|string>|number|string} path the path to retrieve values from the object
 * @param {*} object the object to get values from
 * @returns {boolean} does the nested path exist
 */
export const hasNestedProperty = (path, object) => {
  const parsedPath = getParsedPath(path);

  if (parsedPath.length === 1) {
    return object ? object[parsedPath[0]] !== void 0 : false;
  }

  return onMatchAtPath(
    parsedPath,
    object,
    (ref, key) => {
      return !!ref && ref[key] !== void 0;
    },
    false,
    false
  );
};

/**
 * @function isEmptyKey
 *
 * @description
 * is the object passed an empty key value
 *
 * @param {*} object the object to test
 * @returns {boolean} is the object an empty key value
 */
export const isEmptyKey = (object) => {
  return object === void 0 || object === null || (isArray(object) && !object.length);
};
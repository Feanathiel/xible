'use strict';

module.exports = (XIBLE) => {
  let TYPE_DEFS = [];

  class TypeDef {
    constructor(obj) {
      if (obj) {
        Object.assign(this, obj);
      }
    }

    /**
    * Verifies whether the given typeDef matches this typeDef.
    * If not matched directly, the extends property (-tree) of the given typeDef
    * is verified against this typeDef.
    * @returns {Boolean}
    */
    matches(typeDef) {
      if (typeDef === this) {
        return true;
      } else if (!typeDef || !typeDef.extends) {
        return false;
      }

      // check for extends
      if (typeof typeDef.extends === 'string') {
        const extendsTypeDef = TYPE_DEFS[typeDef.extends];
        if (!extendsTypeDef) {
          return false;
        }

        return this.matches(extendsTypeDef);
      } else if (Array.isArray(typeDef.extends)) {
        for (let i = 0; i < typeDef.extends.length; i += 1) {
          const extendsTypeDef = TYPE_DEFS[typeDef.extends[i]];
          if (!extendsTypeDef) {
            continue;
          }

          if (this.matches(extendsTypeDef)) {
            return true;
          }
        }
      }

      return false;
    }

    static register(typeDefName, typeDef) {
      TYPE_DEFS[typeDefName] = new TypeDef(typeDef);
    }

    /**
    * Retrieves all typeDefs from the XIBLE API.
    * @returns {Promise.<TypeDef[]>}
    */
    static getAll() {
      return Promise.resolve(TYPE_DEFS);
    }
  }

  return TypeDef;
};

/* eslint-disable max-classes-per-file, no-dupe-class-members, class-methods-use-this */
/* global customElements, Node, URL, MutationObserver, HTMLScriptElement */
function createRegistry() {
  const map = new Map();
  return {
    [Symbol('data')]: map,
    get(name) {
      return map.get(name);
    },
    define(name, factory) {
      map.set(name, factory);
    }
  };
}

// @see https://github.com/WICG/import-maps#feature-detection
const supportsImportMaps =
  HTMLScriptElement.supports && HTMLScriptElement.supports('importmap');

function importModule(target) {
  if (!supportsImportMaps && typeof importShim === 'function') {
    // @see https://github.com/guybedford/es-module-shims
    // eslint-disable-next-line no-undef
    return importShim(target);
  }
  return import(/* @vite-ignore */ /* webpackIgnore: true */ target);
}

const LOADING = Symbol('loading');
const globalLoaders = createRegistry();

function watchWebComponentModules(context, callback) {
  const name = 'web-component-module';
  callback(
    [...context.querySelectorAll(`[is=${name}]`)].filter(element =>
      element.localName.includes('-')
    )
  );
  new MutationObserver(mutationsList => {
    callback(
      mutationsList
        .reduce((accumulator, { type, target, addedNodes }) => {
          if (type === 'attributes') {
            accumulator.push(target);
          } else {
            accumulator.push(...addedNodes);
          }
          return accumulator;
        }, [])
        .filter(
          node =>
            node.nodeType === Node.ELEMENT_NODE &&
            node.localName.includes('-') &&
            node.getAttribute('is') === name
        )
    );
  }).observe(context, {
    attributeFilter: ['is'],
    attributes: true,
    childList: true,
    subtree: true
  });
}

export class WebComponentModule {
  constructor(ownerElement) {
    this.ownerElement = ownerElement;
  }

  get type() {
    return this.ownerElement.getAttribute('type') || 'module';
  }

  set type(value) {
    this.ownerElement.setAttribute('type', value);
  }

  get src() {
    const value = this.ownerElement.getAttribute('src');
    return value === null ? '' : new URL(value, this.ownerElement.baseURI).href;
  }

  set src(value) {
    this.ownerElement.setAttribute('src', value);
  }

  get import() {
    const value = this.ownerElement.getAttribute('import');
    return value === null ? '' : value;
  }

  set import(value) {
    this.ownerElement.setAttribute('import', value);
  }

  createCustomElement(superclass) {
    return class extends superclass {};
  }

  async load() {
    const type = this.type;
    const loader = this.constructor.loaders.get(type);

    if (!loader) {
      throw Error(`Loader is not defined: ${type}`);
    }

    this[LOADING] = loader(this);

    return this[LOADING];
  }

  async bootstrap() {
    return this[LOADING].then(superclass => {
      const alias = this.ownerElement.localName;
      // ignore analyze
      const define = 'define';

      if (!customElements.get(alias)) {
        const customElementClass = this.createCustomElement(superclass);
        customElements[define](alias, customElementClass);
        return customElementClass;
      }

      return customElements.get(alias);
    });
  }

  static get loaders() {
    return globalLoaders;
  }

  static async update(context) {
    watchWebComponentModules(context, elements => {
      elements.forEach(target => {
        const alias = target.localName;
        if (!customElements.get(alias)) {
          const module = new WebComponentModule(target);
          module.load().then(() => module.bootstrap());
        }
      });
    });
  }
}

WebComponentModule.loaders.define('module', async options => {
  const nameOrPath = options.import || options.src;
  if (!nameOrPath) {
    throw new Error(`No 'src' or 'import' attributes were found`);
  }

  return importModule(nameOrPath).then(module => module.default || module);
});

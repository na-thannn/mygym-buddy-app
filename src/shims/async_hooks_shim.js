export class AsyncLocalStorage {
  constructor() {}
  getStore() { return undefined }
  run(store, callback) { return callback() }
  enterWith(store) { /* no-op */ }
}

export default { AsyncLocalStorage };

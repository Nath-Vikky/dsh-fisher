import { SaveStore } from '../src/host/store.ts';
const store = new SaveStore(process.argv[2]);
await store.load();
if (store.issue) throw new Error(store.issue);
setInterval(() => {}, 1000);
process.send?.({ ready: true });

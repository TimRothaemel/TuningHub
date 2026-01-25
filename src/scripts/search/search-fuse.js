import Fuse from 'fuse.js';
import { printLog } from "../scripts/output/log/log.js";
import { throwNewError } from "../output/error/error.js";
import { getPartCatalog } from "../api/get-part-catalog-api.js";

printLog("[Search Fuse] Initializing Fuse.js Search");

let fuse = null;

export async function initializeFuse(APIendpoint) {
  const { data, error } = APIendpoint;
  if (error) {
    throwNewError(`[Search Fuse] Error initializing Fuse.js: ${error.message}`);
    return;
  }

  const options = {
    keys: ["title", "description"],
    threshold: 0.3,
  };

  fuse = new Fuse(data, options);
  printLog("[Search Fuse] Fuse.js initialized successfully");
}

import { printLog } from "../../scripts/output/log/log.js";
import { initializeFuse } from "../../scripts/search/search-fuse.js";
import { getPartCatalog } from "../../api/get-part-catalog-api.js";

printLog("[Part Upload Page] Initializing Part Upload Page");

initializeFuse(await getPartCatalog());

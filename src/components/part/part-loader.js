import { printLog } from "../../scripts/output/log/log.js";
import { PartTree } from './part-tree.js';
import { supabase } from '../../services/supabase.js';

printLog("[Part Loader] Initializing Part Loader Component");

const { data: parts } = await supabase
  .from('parts')
  .select('*')
  .order('created_at');

const tree = PartTree(parts);
document.getElementById('parts-root').appendChild(tree);